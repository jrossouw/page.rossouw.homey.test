'use strict';

const { Cluster, debug } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  TUYA_DP_VOLUME: 5,
  TUYA_DP_DURATION: 7,
  TUYA_DP_ALARM: 13,
  TUYA_DP_BATTERY: 15,
  TUYA_DP_MELODY: 21,
};

const volumeMapping = new Map();
volumeMapping.set('High', 2);
volumeMapping.set('Medium', 1);
volumeMapping.set('Low', 0);

const melodiesMapping = new Map();
melodiesMapping.set(0, 'Doorbell Chime');
melodiesMapping.set(1, 'Fur Elise');
melodiesMapping.set(2, 'Westminster Chimes');
melodiesMapping.set(3, 'Fast double door bell');
melodiesMapping.set(4, 'William Tell Overture');
melodiesMapping.set(5, 'Turkish March');
melodiesMapping.set(6, 'Safe/Security Alarm');
melodiesMapping.set(7, 'Chemical Spill Alert');
melodiesMapping.set(8, 'Piercing Alarm Clock');
melodiesMapping.set(9, 'Smoke Alarm');
melodiesMapping.set(10, 'Dog Barking');
melodiesMapping.set(11, 'Police Siren');
melodiesMapping.set(12, 'Doorbell Chime (reverb)');
melodiesMapping.set(13, 'Mechanical Telephone');
melodiesMapping.set(14, 'Fire/Ambulance');
melodiesMapping.set(15, '3/1 Elevator');
melodiesMapping.set(16, 'Buzzing Alarm Clock');
melodiesMapping.set(17, 'School Bell');

const dataTypes = {
  raw: 0, // [ bytes ]
  bool: 1, // [0/1]
  value: 2, // [ 4 byte value ]
  string: 3, // [ N byte string ]
  enum: 4, // [ 0-255 ]
  bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
  let value = 0;

  for (let i = 0; i < chunks.length; i++) {
    value <<= 8;
    value += chunks[i];
  }

  return value;
};

const getDataValue = (dpValue) => {
  switch (dpValue.datatype) {
    case dataTypes.raw:
      return dpValue.data;
    case dataTypes.bool:
      return dpValue.data[0] === 1;
    case dataTypes.value:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string:
      let dataString = '';
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
};

class ZigbeeSiren extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();

    this.addCapability('measure_battery');
    this.addCapability('alarm_battery');

    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff: ', value);
      await this.writeBool(dataPoints.TUYA_DP_ALARM, value);
    });

    zclNode.endpoints[1].clusters.tuya.on('response', (value) => this.processResponse(value));

    zclNode.endpoints[1].clusters.tuya.on('reporting', (value) => this.processReporting(value));

    zclNode.endpoints[1].clusters.tuya.on('datapoint', (value) => this.processDatapoint(value));

    //= ==== CONTROL Binary Switch
    // define FlowCardAction to set the Switch
    const alarm_state_run_listener = async (args, state) => {
      try {
        this.log('FlowCardAction Set Alarm state (', state, ') to: ', args.alarm_state);
        const alarm_state_requested = args.alarm_state != 'off/disable';
        this.writeBool(dataPoints.TUYA_DP_ALARM, alarm_state_requested);
      } catch (error) {
        console.log(error);
        return false;
      }
      return true;
    };

    // Register Action card card trigger
    const action_alarm_state = this.homey.flow.getActionCard('alarm_state');
    action_alarm_state.registerRunListener(alarm_state_run_listener);

    // Register Flow card trigger
    const sirenFlowTrigger = this.homey.flow.getDeviceTriggerCard('alarm_siren');
    sirenFlowTrigger.registerRunListener(alarm_state_run_listener);

    // Cards that change device settings
    //= ==== CONTROL Alarm Volume:
    const siren_volume_run_listener = async (args) => {
      this.log('FlowCardAction Set Alarm volume to: ', args.siren_volume);
      this.sendAlarmVolume(args.siren_volume);
    };
    const action_siren_volume = this.homey.flow.getActionCard('siren_volume');
    action_siren_volume.registerRunListener(siren_volume_run_listener);

    //= ==== CONTROL Alarm Sound Duration:
    const alarm_duration_run_listener = async (args) => {
      this.log('FlowCardAction Set Alarm Duration to: ', args.duration);
      this.sendAlarmDuration(args.duration);
    };
    const action_alarm_duration = this.homey.flow.getActionCard('alarm_duration');
    action_alarm_duration.registerRunListener(alarm_duration_run_listener);

    //= ==== CONTROL Alarm Tune:
    const alarm_tune_run_listener = async (args) => {
      this.log('FlowCardAction Set Alarm Tune to: ', args.alarm_tune);
      this.sendAlarmTune(args.alarm_tune);
    };
    const action_alarm_tune = this.homey.flow.getActionCard('alarm_tune');
    action_alarm_tune.registerRunListener(alarm_tune_run_listener);
  }

  async processResponse(data) {
    this.log('########### Response: ', data);
    const parsedValue = getDataValue(data);
    this.log('Parsed value ', parsedValue);
  }

  reportBatteryPercentageCapacity(measuredValue) {
    const parsedValue = measuredValue;
    this.log('measure_battery | battery percentage remaining: ', parsedValue, '%');
    this.setCapabilityValue('measure_battery', parsedValue).catch(this.error);
  }

  reportAlarmBatteryCapacity(measuredValue) { // true or false
    this.log('alarm_battery | battery alarm: ', measuredValue);
    this.setCapabilityValue('alarm_battery', measuredValue).catch(this.error);
  }

  processReporting(data) {
    this.log('########### Reporting: ', data);
    const parsedValue = getDataValue(data);
    this.log('Parsed value ', parsedValue);
    switch (data.dp) {
      case dataPoints.TUYA_DP_ALARM:
        this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        break;
      case dataPoints.TUYA_DP_VOLUME: // (05) volume [ENUM] 0:high 1:mid 2:low
        let volumeName = 'unknown';
        let volumePct = -1;
        [volumeName, volumePct] = this.findVolumeByTuyaValue(parsedValue);
        this.log('confirmed volume: ', volumeName, ' (', volumePct, ')');
        this.setSettings({
          alarmvolume: parsedValue?.toString(),
        });
        break;
      case dataPoints.TUYA_DP_DURATION: // (07) duration [VALUE] in seconds
        this.log('confirmed duration', parsedValue, 's');
        this.setSettings({
          alarmsoundtime: parsedValue,
        });
        break;
      case dataPoints.TUYA_DP_MELODY: // (21) melody [enum] 0..17
        this.log('confirmed melody: ', melodiesMapping.get(parsedValue), '(', parsedValue, ')');
        this.setSettings({
          alarmtune: parsedValue?.toString(),
        });
        break;
      default:
        this.log('Not handled dp ', data.dp);
    }
  }

  processDatapoint(data) {
    this.log('########### Datapoint: ', data);
    const parsedValue = getDataValue(data);
    this.log('Parsed value ', parsedValue);
  }

  onDeleted() {
    this.log('ZigbeeSiren removed');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    changedKeys.forEach((updatedSetting) => {
      this.log('########### Updated setting: ', updatedSetting, ' => ', newSettings[updatedSetting]);
      switch (updatedSetting) {
        case 'alarmvolume':
          this.sendAlarmVolume(newSettings[updatedSetting]);
          break;
        case 'alarmsoundtime':
          this.sendAlarmDuration(newSettings[updatedSetting]);
          break;
        case 'alarmtune':
          this.sendAlarmTune(newSettings[updatedSetting]);
          break;
        default:
          this.log('ERROR: Unknown setting: ', updatedSetting);
          break;
      }
    });
  }

  sendAlarmVolume(volume) { // (05) volume [ENUM] 0:high 1:mid 2:low
    let volumeName = 'unknown';
    let volumePct = -1;
    [volumeName, volumePct] = this.findVolumeByTuyaValue(volume);
    this.log('Sending alarm volume: ', volumeName, ' (', volumePct, ')');
    this.writeEnum(dataPoints.TUYA_DP_VOLUME, volume);
  }

  sendAlarmDuration(duration) {
    this.log('Sending alarm duration: ', duration, 's');
    this.writeData32(dataPoints.TUYA_DP_DURATION, duration);
  }

  sendAlarmTune(tune) {
    const tuneNr = Number(tune);
    this.log('Sending alarm tune: ', melodiesMapping.get(tuneNr), ' (', tuneNr, ')');
    this.writeEnum(dataPoints.TUYA_DP_MELODY, tuneNr);
  }

  findVolumeByTuyaValue(measuredValue) {
    let volumeName = 'unknown';
    let volumePct = -1;
    volumeMapping.forEach((v, k) => {
      if (v === measuredValue) {
        volumeName = k;
        volumePct = v;
      }
    });
    return [volumeName, volumePct];
  }

}

module.exports = ZigbeeSiren;
