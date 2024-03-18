'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WaterTankController extends ZigBeeDriver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');
  }

}

module.exports = WaterTankController;
