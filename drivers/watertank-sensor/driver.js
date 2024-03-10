'use strict';

const Homey = require('homey');
const { generateUUID } = require('../../lib/util/uuid');

class VirtualDriver extends Homey.Driver {

  onInit() {
    this.log('Initialized driver for Virtual Watertank Sensors');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      return [
        {
          name: 'Water Tank Sensor',
          data: {
            id: generateUUID(),
          },
        },
      ];
    });
  }

}

module.exports = VirtualDriver;
