'use strict';

const Homey = require('homey');

class VirtualDriver extends Homey.Driver {

  onInit() {
    this.log('Initialized driver for Virtual Devices');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      return [
        {
          name: 'Water Tank Monitor',
          data: {
            id: 'abcd',
          },
        },
      ];
    });
  }

}

module.exports = VirtualDriver;
