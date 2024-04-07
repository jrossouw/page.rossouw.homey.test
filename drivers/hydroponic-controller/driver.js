'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class HydroponicsController extends ZigBeeDriver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('HydroponicsController driver has been initialized');
  }

}

module.exports = HydroponicsController;
