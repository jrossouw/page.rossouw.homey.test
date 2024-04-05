'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');


class ZigbeeWaterTank extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    this.enableDebug();
    this.printNode();
    this.log(zclNode);
    this.log(zclNode.endpoints[1]);

    this.registerCapability('dump_valve', CLUSTER.ON_OFF, {
      endpoint: 1,
      set: (value) => (value ? 'setOn' : 'setOff'),
      setParser: () => ({}),
      get: 'onOff',
      report: 'onOff',
      reportParser: (value) => {
        return value;
      },
    });

    this.registerCapabilityListener('water_pump', async (value) => {
      this.log('water_pump: ', value);
      const attrs = { presentValue: value };
      await zclNode.endpoints[1].clusters[CLUSTER.BINARY_OUTPUT.NAME].writeAttributes(attrs);
    });

    zclNode.endpoints[1].clusters[CLUSTER.BINARY_OUTPUT.NAME]
      .on('attr.presentValue', this.onPumpSwitchChangeNotification.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.BINARY_INPUT.NAME]
      .on('attr.presentValue', this.onFloatSwitchChangeNotification.bind(this));

    // measure_temperature
    zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));

    // measure_humidity
    zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this));

    // measure_depth.top
    zclNode.endpoints[1].clusters[CLUSTER.PRESSURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onPressureMeasuredAttributeReport.bind(this));

    // measure_depth.top
    zclNode.endpoints[1].clusters[CLUSTER.FLOW_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onFlowMeasuredAttributeReport.bind(this));

    // measure_battery // alarm_battery
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryVoltage', this.onBatteryVoltageAttributeReport.bind(this));

    // measure_battery // alarm_battery
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemaining.bind(this));

    this.log('Reading attributes');
    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'modelId'])
      .catch((err) => {
        this.error('Error when reading device attributes ', err);
      });
  }

  onPumpSwitchChangeNotification(presentValue) {
    this.log('Pump power change notification received:', presentValue);
    this.setCapabilityValue('water_pump', presentValue).catch(this.error);
  }

  onFloatSwitchChangeNotification(presentValue) {
    this.log('Float switch change notification received:', presentValue);
    this.setCapabilityValue('float_switch', presentValue).catch(this.error);
  }

  onBatteryVoltageAttributeReport(batteryVoltage) {
    const parsedVoltage = batteryVoltage / 100 + 2;
    this.log('powerConfiguration - batteryVoltage (V): ', parsedVoltage);
    this.setCapabilityValue('measure_voltage', parsedVoltage).catch(this.error);
  }

  onBatteryPercentageRemaining(percentage) {
    this.log('powerConfiguration - batteryPercentage (%): ', percentage);
    this.setCapabilityValue('measure_battery', percentage).catch(this.error);
  }

  onTemperatureMeasuredAttributeReport(measuredValue) {
    this.log('Received temperature value ', measuredValue);
    const parsedValue = Math.round((measuredValue / 10) * 10) / 10;
    this.log('measure_temperature: ', parsedValue);
    this.setCapabilityValue('measure_temperature', parsedValue).catch(this.error);
  }

  onRelativeHumidityMeasuredAttributeReport(measuredValue) {
    this.log('Received humidity value ', measuredValue);
    this.log('measure_humidity:', measuredValue);
    this.setCapabilityValue('measure_humidity', measuredValue).catch(this.error);
  }

  onPressureMeasuredAttributeReport(measuredValue) {
    this.log('Received pressure value ', measuredValue);
    const parsedValue = Math.round(measuredValue) / 10;
    this.log('measure_depth.top: ', parsedValue);
    this.setCapabilityValue('measure_depth.top', parsedValue).catch(this.error);
  }

  onFlowMeasuredAttributeReport(measuredValue) {
    this.log('Received flow value ', measuredValue);
    const parsedValue = Math.round(measuredValue) / 10;
    this.log('measure_depth.bottom: ', parsedValue);
    this.setCapabilityValue('measure_depth.bottom', parsedValue).catch(this.error);
  }

}

module.exports = ZigbeeWaterTank;
