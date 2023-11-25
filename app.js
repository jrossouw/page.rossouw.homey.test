'use strict';

require('inspector').open(9229, '0.0.0.0');
// Do open debug window open this URL in Chrome chrome://inspect/

const Homey = require('homey');

class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('MyApp has been initialized');
  }

}

module.exports = MyApp;
