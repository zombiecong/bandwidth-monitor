const BandwidthMonitor = require('.');

const interface = 'en4';
const b = new BandwidthMonitor({disableIPv6:true,interfaces:[
  interface
  ],ignoreLAN:true});
console.log(Object.keys(b.monitors));

try{
  b.monitors[interface].capture();
  setInterval(() => {
    console.log(b.monitors[interface].rxPerSec);
    // b.monitors.en0.close();
  }, 1000);
}catch (e) {
  console.log('need root ! add sudo command.');
}

