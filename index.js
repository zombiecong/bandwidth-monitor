
const Cap = require('cap').Cap;
const decoders = require('cap').decoders;

const PROTOCOL = decoders.PROTOCOL;
const bufSize = 10 * 1024 * 1024;

function isIPv4(string) {
  return !!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(string);
}

function checkAddresses(device) {
  for (let address of device.addresses){
    if (isIPv4(address.addr)){
      device.ipv4 = address.addr;
      return true;
    }
  }
  return false;
}

class BandwidthMonitor{
  constructor(options = {disableIPv6:true}){

    this.devices = Cap.deviceList();
    if (options.interfaces) {
      this.devices = this.devices.filter((d) => options.interfaces.indexOf(d.name) !== -1);
    } else {
      this.devices = this.devices.filter((d) => d.addresses.length);
    }

    if (options.disableIPv6){
      this.devices = this.devices.filter((d) => checkAddresses(d));
    }

    this.monitors = {};


    this.devices.forEach((device) => {
      // console.log(device);
      this.monitors[device.name] = new DeviceMonitor(device);
    });
  }
}

class DeviceMonitor{
  constructor(device){
    this.cap = new Cap();

    this.device = device;
    this.totalRx = 0;
    this.totalTx = 0;
    this.rxPerSec = 0;
    this.txPerSec = 0;
    this.buffer = Buffer.alloc(bufSize);

    this.isCapturing = false;
  }

  capture(){
    //need root
    this.link = this.cap.open(this.device.name, '', bufSize, this.buffer);

    this.cap.on('packet', (size) => {
      if (this.link === 'ETHERNET') {
        let ret = decoders.Ethernet(this.buffer);
        //todo(cc): support ipv6
        if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
          ret = decoders.IPV4(this.buffer, ret.offset);
          if (ret.info.srcaddr !== this.device.ipv4) {
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

    this.isCapturing = true;
  }

  close(){
    this.isCapturing = false;

    clearInterval(this.timer);
    this.cap.close();
    this.buffer = null;

  }
}

module.exports = BandwidthMonitor;
