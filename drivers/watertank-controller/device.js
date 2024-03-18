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

    this.registerCapability('onoff.pump', CLUSTER.ON_OFF, {
      endpoint: 1,
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
    const alarm = (measuredValue & 0b10000000) > 0;
    if (alarm) {
      this.log('Motion detected');
    } else {
      this.log('No motion detected');
    }
    this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
  }

  onIASZoneStatusChangeNotification(payload) {
    this.log('IASZoneStatusChangeNotification received:', payload);
    this.setCapabilityValue('alarm_motion', payload.zoneStatus.alarm1).catch(this.error);
  }

}

module.exports = ZigbeeWaterTank;
