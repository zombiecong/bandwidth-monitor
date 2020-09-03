const Cap = require('cap').Cap;
const decoders = require('cap').decoders;
const ipUtils = require('ip');

const PROTOCOL = decoders.PROTOCOL;
const bufSize = 10 * 1024 * 1024;

function checkAddresses(device) {
  for (let address of device.addresses) {
    if (ipUtils.isV4Format(address.addr)) {
      device.ipv4 = address.addr;
      return true;
    }
  }
  return false;
}

class BandwidthMonitor {
  constructor(options = {disableIPv6: true, ignoreLAN: false}) {

    this.disableIPv6 = options && options.disableIPv6;
    this.ignoreLAN = options && options.ignoreLAN;

    this.devices = Cap.deviceList();
    if (options.interfaces) {
      this.devices = this.devices.filter((d) => options.interfaces.indexOf(d.name) !== -1);
    } else {
      this.devices = this.devices.filter((d) => d.addresses.length);
    }

    if (this.disableIPv6) {
      this.devices = this.devices.filter((d) => checkAddresses(d));
    }

    this.monitors = new Map();

    this.devices.forEach((device) => {
      this.monitors.set(device.name,new DeviceMonitor(device,this.ignoreLAN));
    });
  }
}

class DeviceMonitor {
  constructor(device,ignoreLAN) {
    this.cap = new Cap();

    this.ignoreLAN = ignoreLAN;
    this.device = device;
    this.totalRx = 0;
    this.totalTx = 0;
    this.rxPerSec = 0;
    this.txPerSec = 0;
    this.buffer = Buffer.alloc(bufSize);

    this.isCapturing = false;
  }

  capture() {
    //need root
    this.link = this.cap.open(this.device.name, '', bufSize, this.buffer);

    this.cap.on('packet', (size) => {
      if (this.link === 'ETHERNET') {
        let ret = decoders.Ethernet(this.buffer);
        //todo(cc): support ipv6
        if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
          ret = decoders.IPV4(this.buffer, ret.offset);
          if(this.ignoreLAN && ipUtils.isPrivate(ret.info.dstaddr)){
            return;
          }
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

  close() {
    this.isCapturing = false;

    clearInterval(this.timer);
    this.cap.close();
    this.buffer = null;

  }
}

module.exports = BandwidthMonitor;
