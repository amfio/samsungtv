export interface SamsungMessage {
    event: SamsungEvent;
    data: any;
}

export interface SamsungMetadata {
    id: string;
    name: string;
    version: string;
    type: string;
    uri: string;
    remote: string;
    device: {
        model: string;
        modelName: string;
        description: string;
        networkType: string;
        ssid: string;
        ip: string;
        firmwareVersion: string;
        name: string;
        id: string;
        upn: string;
        resolution: string;
        countryCode: string;
        msfVersion: string;
        smartHubAgreement: string;
        wifiMac: string;
        developerMode: '0' | '1';
        developerIP: string;
        OS: string;
    };
}

export enum SamsungEvent {
    Unauthorised = 'ms.channel.unauthorized',
    Connect = 'ms.channel.connect',
    InstalledApps = 'ed.installedApp.get',
    LaunchApp = 'ed.apps.launch',
}

export enum SamsungKey {
    Menu = 'KEY_MENU',
    Exit = 'KEY_EXIT',
}
