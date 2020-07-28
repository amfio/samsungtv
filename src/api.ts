import WebSocket from 'ws';
import fetch from 'node-fetch';
import { SamsungKey, SamsungEvent, SamsungMessage, SamsungMetadata } from './samsung-types';
import { DeviceConfig } from './types';
import { TokenCache } from './token-cache';
const HTTP_PORT = 8001;
const WSS_PORT = 8002;

export { SamsungKey } from './samsung-types';

export async function connect(config: DeviceConfig) {
    const api = new SamsungApi(config);

    await (api as any).connectPromise;

    return api;
}

interface Command {
    resolve: (data: SamsungMessage) => void;
    reject: (error: any) => void;
}

interface SamsungApp {
    appId: string;
    appType: number;
}

export class SamsungApi {
    public deviceMetadata: SamsungMetadata = null;

    private currentCommand: Command = null;
    private connectPromise: Promise<SamsungMessage>;
    private webSocket: WebSocket = null;
    private tokenCache: TokenCache = null;

    constructor(private config: DeviceConfig) {
        this.connect();
    }

    public async sendKey(key: SamsungKey) {
        return await this.sendCommand({
            method: 'ms.remote.control',
            params: {
                Cmd: 'Click',
                DataOfCmd: key,
                Option: 'false',
                TypeOfRemote: 'SendRemoteKey',
            }
        }, false);
    }

    public async getInstalledApps(): Promise<Array<SamsungApp>> {
        const response: any = await this.sendCommand({
            method: 'ms.channel.emit', 
            params: {
                event: SamsungEvent.InstalledApps, 
                to: 'host'
            } 
        }, true);

        return response?.data?.data?.map((app: any) => {
            return {
                appId: app.appId,
                appType: app.app_type,
            }
        });
    }

    public async launchAppById(appId: string) {
        const apps = await this.getInstalledApps();
        
        const app = apps.find(app => app.appId === appId);

        if (!app) {
            throw new Error(`No app found with ID "${appId}". Are you sure it is installed?`);
        }

        const response = await this.sendCommand({
            method: 'ms.channel.emit',
            params: {
                data: {
                    action_type: app.appType === 2 ? 'DEEP_LINK' : 'NATIVE_LAUNCH',
                    appId: appId,
                },
                event: SamsungEvent.LaunchApp,
                to: 'host'
            }
        }, true);

        if (response.data !== 200) {
            throw new Error(`Failed to launch app: ${response.data}`);
        }
    }

    private async connect() {
        this.connectPromise = new Promise<SamsungMessage>((res, rej) => {
            this.currentCommand = {
                resolve: res,
                reject: rej,
            };
        });

        const appName = Buffer.from(this.config.appName).toString('base64');
        await this.populateDeviceMetadata();
        
        this.tokenCache = new TokenCache(this.config, this.deviceMetadata);

        const token = this.config.token || this.tokenCache.retrieveToken();
        if (!token) {
            console.log('No API token has been supplied. You will need to accept the connection on the TV.');
        } else {
            this.tokenCache.saveToken(token);
        }
        const wsUrl = `wss://${this.config.ip}:${WSS_PORT}/api/v2/channels/samsung.remote.control?name=${appName}${token ? `&token=${token}` : ''}`;

        this.webSocket = new WebSocket(wsUrl, null, { rejectUnauthorized: false }) as any;

        this.webSocket.on('message', (message) => {
            this.handleMessageReceived(message as any);
        });
        this.webSocket.on('response', (response) => {
            console.log('Response received', response)
        });

        this.webSocket.on('error', (error) => {
            this.rejectCurrentCommand(error);
        });

        this.webSocket.on('close', () => {
            this.rejectCurrentCommand('Socket closed');
        });

        return this.connectPromise;
    }

    private async populateDeviceMetadata() {
        try {
            const response = await fetch(`http://${this.config.ip}:${HTTP_PORT}/api/v2/`);

            if (response.status !== 200) {
                throw new Error(`Request status ${response.status}`);
            }

            this.deviceMetadata = await response.json();
        } catch (error) {
            throw Error(`Metadata request failed: ${error}. Try restarting TV and checking IP address.`);
        }
    }

    public disconnect() {
        this.webSocket.close();
        this.webSocket = null;
    }

    private async sendCommand(command: any, hasResponse = true): Promise<SamsungMessage> {
        if (!this.webSocket) {
            throw new Error(`Not connected to TV. Call "Connect".`);
        }

        return await new Promise((res, rej) => {

            if (this.currentCommand) {
                return rej('Command already in progress');
            } else {
                this.currentCommand = {
                    resolve: res,
                    reject: rej,
                }
            }

            this.webSocket.send(JSON.stringify(command));

            if (!hasResponse) {
                setTimeout(() => {
                    this.resolveCurrentCommand(null);
                }, 500)
            }
        });
    }

    private handleMessageReceived(messageStr: string) {
        const message: SamsungMessage = JSON.parse(messageStr);
        switch (message.event) {
            case SamsungEvent.Unauthorised:
                this.rejectCurrentCommand('We do not have authorisation to access TV API. You must accept the on-screen prompt.');
                break;
            case SamsungEvent.Connect:
                if (message.data.token) {
                    console.log('Token found: ', message.data.token);
                    this.tokenCache.saveToken(message.data.token);
                }
                this.resolveCurrentCommand(message);
                break;
            case SamsungEvent.InstalledApps:
                this.resolveCurrentCommand(message);
                break;
            case SamsungEvent.LaunchApp:
                this.resolveCurrentCommand(message);
                break;
            default: 
                console.log('Unhandled event', message);
        }
    }

    private rejectCurrentCommand(error: any) {
        if (this.currentCommand) {
            this.currentCommand.reject(error);
            this.currentCommand = null;
        } else if (this.webSocket) {
            console.error('An error occured outside of an active command', error);
        }
    }

    private resolveCurrentCommand(data: SamsungMessage) {
        if (this.currentCommand) {
            this.currentCommand.resolve(data);
            this.currentCommand = null;
        }
    }
}
