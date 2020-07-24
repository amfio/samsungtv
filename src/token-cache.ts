import { SamsungMetadata } from "./samsung-types";
import { DeviceConfig } from "./types";
import { existsSync, readFileSync, writeFileSync } from 'fs';

const DEFAULT_CACHE_LOCATION = './samsung_token_cache.json';

interface TokenCacheFileFormat {
    [key: string]: {
        token: string;
        dateAdded: number;
        dateModified: number;
        lastKnownIp: string;
    }    
}

export class TokenCache {
    private fileLocation: string = null;

    constructor(private config: DeviceConfig, private metadata: SamsungMetadata) {
        this.fileLocation = (typeof this.config.cacheToken === 'object' && this.config.cacheToken.cacheLocation) || DEFAULT_CACHE_LOCATION;
    }

    public saveToken(token: string) {    
        let cache: TokenCacheFileFormat = {};
        if (existsSync(this.fileLocation)) {
            cache = JSON.parse(readFileSync(this.fileLocation).toString());
        }
    
        const now = Date.now();
    
        cache[this.metadata.id] = {
            dateAdded: cache[this.metadata.id].dateAdded || now,
            dateModified: now,
            token,
            lastKnownIp: this.config.ip,
        };
    
        writeFileSync(this.fileLocation, JSON.stringify(cache, null, 2));
    }
    
    public retrieveToken() {
        if (!this.config.cacheToken) {
            return null;
        }
        
        if (!existsSync(this.fileLocation)) {
            return null;
        }
    
        const cache: TokenCacheFileFormat = JSON.parse(readFileSync(this.fileLocation).toString());
    
        return cache[this.metadata.id].token;
    }
}
