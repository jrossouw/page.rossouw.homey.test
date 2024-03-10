'use strict';

const Homey = require('homey');

class VirtualDevice extends Homey.Device {
  onInit() {
    this.log('Virtual Device (' + this.getName() + ') initialized');
    const actionConsumptionRate = this.homey.flow.getActionCard('consumption_rate');
    actionConsumptionRate.registerRunListener(async (args, state) => {
      this.log('Arguments:', args);
      this.log('Set consumption rate to: ', args.rate);
      this.log('Capabilities: ', this.getCapabilities());
      this.setCapabilityValue('measure_consumption_rate', args.rate.toFixed(2) * 1.0);
    });
    const actionDepth = this.homey.flow.getActionCard('depth');
    actionDepth.registerRunListener(async (args, state) => {
      this.setCapabilityValue('measure_depth', args.depth.toFixed(2) * 1.0);
    });
    const actionDaysLeft = this.homey.flow.getActionCard('days_left');
    actionDaysLeft.registerRunListener(async (args, state) => {
      this.setCapabilityValue('measure_days_remaining', args.days.toFixed(1) * 1.0);
    });
    const actionAlarm = this.homey.flow.getActionCard('low_level_alarm');
    actionAlarm.registerRunListener(async (args, state) => {
      this.log('Arguments:', args);
      const alarmState = args.alarm_setting === 'on';
      this.log('Alarm state: ', alarmState);
      this.setCapabilityValue('alarm_level', alarmState);
    });
  }

}

module.exports = VirtualDevice;
