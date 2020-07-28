import { connect } from './api';
import { SamsungKey } from './samsung-types';


connect({
    ip: '10.189.164.9',
    appName: 'YourAppName',
    cacheToken: true,
}).then(async (api) => {
    await api.sendKey(SamsungKey.Menu);
    await api.sendKey(SamsungKey.Exit);
    // await api.launchAppById('App ID');
    api.disconnect();
}).catch((error) => {
    console.log('Error occured', error);
});
