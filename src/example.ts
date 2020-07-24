import { connect } from './api';


// connect({
//     ip: '10.189.164.9',
//     mac: '641cb06f58a5',
//     appName: 'NodeJS-Test2',
connect({
    ip: '10.189.164.8',
    appName: 'NodeJS-Test2',
    token: '13315209',
}).then((api) => {
    console.log('Connected. Sending key.');
    return api.getInstalledApps();
}).then(() => {
    console.log('all done');
}).catch((error) => {
    console.log('ERROR', error);
});