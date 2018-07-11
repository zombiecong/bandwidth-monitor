const BandwidthMonitor = require('.');
const b = new BandwidthMonitor({disableIPv6:true,interfaces:[
  'en0'
  ]});
console.log(Object.keys(b.monitors));

try{
  b.monitors.en0.capture();
  setInterval(() => {
    console.log(b.monitors.en0.rxPerSec);
    // b.monitors.en0.close();
  }, 1000);
}catch (e) {
  console.log('need root ! add sudo command.');
}

