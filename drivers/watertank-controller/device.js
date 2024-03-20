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

    this.registerCapability('water_pump', CLUSTER.ON_OFF, {
      // This is often just a string, but can be a function as well
      set: (value) => (value ? 'setOn' : 'setOff'),
      setParser(value) {
        return value;
      },
      get: 'onOff',
      report: 'onOff',
      reportParser: (value) => {
        return value;
      },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 3600, // Minimally once every hour
          maxInterval: 60000, // Maximally once every ~16 hours
          minChange: 1,
        },
      },
      endpoint: 1, // Default is 1
      getOpts: {
        //getOnStart: true,
        //getOnOnline: true,
        pollInterval: 30000, // in ms
      },
    });

    this.registerCapability('dump_valve', CLUSTER.ON_OFF, {
      // This is often just a string, but can be a function as well
      set: (value) => (value ? 'setOn' : 'setOff'),
      setParser(setValue) {
        // In case a "set command" takes an argument you can return it from the setParser
      },
      get: 'onOff',
      report: 'onOff',
      reportParser: (value) => {
        return value;
      },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 3600, // Minimally once every hour
          maxInterval: 60000, // Maximally once every ~16 hours
          minChange: 1,
        },
      },
      endpoint: 2, // Default is 1
      getOpts: {
        //getOnStart: true,
        //getOnOnline: true,
        pollInterval: 30000, // in ms
      },
    });

    // measure_temperature
    zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));

    // measure_humidity
    zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = (payload) => {
      this.onIASZoneStatusChangeNotification(payload);
    };

    this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'rmsVoltage',
      report: 'rmsVoltage',
      reportParser: (value) => {
        return value;
      },
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportVoltage
      },
    });

    if (!this.isSubDevice()) {
      this.log('Reading attributes');
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch((err) => {
          this.error('Error when reading device attributes ', err);
        });
    }
  }

  onVoltageMeasuredAttributeReport(measuredValue) {
    const parsedValue = Math.round((measuredValue / 100) * 100) / 100;
    this.log('measure_voltage: ', parsedValue);
    this.setCapabilityValue('measure_voltage', parsedValue).catch(this.error);
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
    const voltage = (measuredValue & 0xff00) / 2560;
    this.log('measure_voltage: ', voltage);
    this.setCapabilityValue('measure_voltage', voltage).catch(this.error);
  }

  onIASZoneStatusChangeNotification(payload) {
    this.log('IASZoneStatusChangeNotification received:', payload);
    this.setCapabilityValue('alarm_motion', payload.zoneStatus.alarm1).catch(this.error);
  }

}

module.exports = ZigbeeWaterTank;
