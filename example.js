const BandwidthMonitor = require('.');
const b = new BandwidthMonitor();
console.log(Object.keys(b.monitors));
setInterval(() => {
  console.log(b.monitors.en0.rxPerSec);
  // b.monitors.en0.close();
}, 1000);
