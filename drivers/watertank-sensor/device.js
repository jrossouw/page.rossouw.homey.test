'use strict';

const Homey = require('homey');

class VirtualDevice extends Homey.Device {
  onInit() {
    this.log(`Virtual Device (${this.getName()}) initialized`);
    const actionDepth = this.homey.flow.getActionCard('water_sensor_water_level');
    actionDepth.registerRunListener(async (args, state) => {
      this.log('Setting water level for device ', this);
      await args.device.setCapabilityValue('measure_water_level', args.water_level.toFixed(2) * 1.0);
    });
    const actionVolume = this.homey.flow.getActionCard('water_sensor_volume');
    actionVolume.registerRunListener(async (args, state) => {
      args.device.setCapabilityValue('measure_volume', args.volume.toFixed() * 1.0);
    });
    const actionCapacity = this.homey.flow.getActionCard('water_sensor_capacity');
    actionCapacity.registerRunListener(async (args, state) => {
      args.device.setCapabilityValue('measure_capacity', args.capacity.toFixed(1) * 1.0);
    });
    const actionAlarm = this.homey.flow.getActionCard('water_sensor_low_level_alarm');
    actionAlarm.registerRunListener(async (args, state) => {
      this.log('Arguments:', args);
      const alarmState = args.alarm_setting === 'on';
      this.log('Alarm state: ', alarmState);
      args.device.setCapabilityValue('alarm_low_level', alarmState);
    });
  }

}

module.exports = VirtualDevice;
