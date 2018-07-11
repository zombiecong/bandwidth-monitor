'use strict';
const Cap = require('cap').Cap;
const decoders = require('cap').decoders;
const myLocalIp = require('my-local-ip');

const PROTOCOL = decoders.PROTOCOL;
const bufSize = 10 * 1024 * 1024;
const buffer = new Buffer(bufSize);

function isIPv4(string) {
  return !!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(string);
}

function checkAddresses(addresses) {
  for (let address of addresses){
    if (isIPv4(address.addr)){
      return true;
    }
  }
  return false;
}

class BandwidthUsage{
  constructor(options = {disableIPv6:true}){
    this.ip = myLocalIp;

    this.devices = Cap.deviceList();
    if (options.interfaces) {
      this.devices = this.devices.filter((d) => options.interfaces.indexOf(d.name) !== -1);
    } else {
      this.devices = this.devices.filter((d) => d.addresses.length);
    }

    if (options.disableIPv6){
      this.devices = this.devices.filter((d) => checkAddresses(d.addresses));
    }

    this.monitors = {};

    this.devices.forEach((device) => {
      this.monitors[device.name] = new DeviceMonitor(device, this.ip);
    });
  }
}

class DeviceMonitor{
  constructor(device,ip){
    this.cap = new Cap();
    //todo(cc): catch permission denied warning
    const link = this.cap.open(device.name, '', bufSize, buffer);
    this.totalRx = 0;
    this.totalTx = 0;
    this.rxPerSec = 0;
    this.txPerSec = 0;

    this.cap.on('packet', (size) => {
      if (link === 'ETHERNET') {
        let ret = decoders.Ethernet(buffer);

        if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
          ret = decoders.IPV4(buffer, ret.offset);
          if (ret.info.srcaddr !== ip) {
            this.totalRx += size;
          } else {
            this.totalTx += size;
          }
        }
      }
    });

    let lastTotalRx = this.totalRx || 0;
    let lastTotalTx = this.totalTx || 0;
    //todo(cc): release timer
    this.timer = setInterval(() => {
      this.rxPerSec = Math.abs((this.totalRx - lastTotalRx));
      lastTotalRx = this.totalRx;
      this.txPerSec = Math.abs((this.totalTx - lastTotalTx));
      lastTotalTx = this.totalTx;
    }, 1000);
  }

  close(){
    clearInterval(this.timer);
    this.cap.close();
  }
}

module.exports = BandwidthUsage;


const b = new BandwidthUsage();
// console.log(Object.keys(b.monitors));
setInterval(() => {
  console.log(b.monitors.en0.rxPerSec);
  b.monitors.en0.close();
}, 1000);
//
// const b = new BandwidthUsage();
// b.startLoggers();
//
// const b = new BandwidthUsage();
// b.startTotalsLogger();
