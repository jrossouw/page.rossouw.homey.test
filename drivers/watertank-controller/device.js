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

    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 65535,
          maxInterval: 0,
          minChange: 0,
        },
        {
          endpointId: 1,
          cluster: CLUSTER.ON_OFF,
          attributeName: 'onOff',
          minInterval: 65535,
          maxInterval: 0,
          minChange: 0,
        },
      ]);
    }

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

    this.log('Reading attributes');
    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
      .catch((err) => {
        this.error('Error when reading device attributes ', err);
      });
  }

  onBatteryVoltageAttributeReport(batteryVoltage) {
    const parsedVoltage = batteryVoltage / 50;
    const percentage = Math.round((parsedVoltage * 100) - 320);
    this.log('measure_battery | powerConfiguration - batteryVoltage (V): ', parsedVoltage);
    this.setCapabilityValue('measure_battery', percentage).catch(this.error);
    this.setCapabilityValue('measure_voltage', parsedVoltage).catch(this.error);
  }

  onTemperatureMeasuredAttributeReport(measuredValue) {
    this.log('Received temperature value ', measuredValue);
    const parsedValue = Math.round((measuredValue / 10) * 10) / 10;
    this.log('measure_temperature: ', parsedValue);
    this.setCapabilityValue('measure_temperature', parsedValue).catch(this.error);
  }

  onRelativeHumidityMeasuredAttributeReport(measuredValue) {
    this.log('Received humidity value ', measuredValue.toString(16));
    const parsedValue = measuredValue & 0b01111111;
    this.log('measure_humidity:', parsedValue);
    this.setCapabilityValue('measure_humidity', parsedValue).catch(this.error);
    const voltage = (measuredValue & 0xff00) / (256 * 50);
    //this.log('measure_voltage: ', voltage);
    //this.setCapabilityValue('measure_voltage', voltage).catch(this.error);
    const float = (measuredValue & 0b10000000) > 0;
    this.setCapabilityValue('float_switch', float).catch(this.error);
  }

  onPressureMeasuredAttributeReport(measuredValue) {
    this.log('Received pressure value ', measuredValue);
    const parsedValue = Math.round((measuredValue / 10) * 10) / 10;
    this.log('measure_depth.top: ', parsedValue);
    this.setCapabilityValue('measure_depth.top', parsedValue).catch(this.error);
  }

  onFlowMeasuredAttributeReport(measuredValue) {
    this.log('Received flow value ', measuredValue);
    const parsedValue = Math.round((measuredValue / 10) * 10) / 10;
    this.log('measure_depth.bottom: ', parsedValue);
    this.setCapabilityValue('measure_depth.bottom', parsedValue).catch(this.error);
  }

}

module.exports = ZigbeeWaterTank;
