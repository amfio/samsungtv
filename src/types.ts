export interface DeviceConfig {
    appName: string;
    ip: string;
    mac?: string; // needed for Wake-on-Lan functionallity if we add it
    token?: string;
    cacheToken?: boolean | { cacheLocation: string }
}
