const axios = require('axios');
const api = axios.create({});

var Service, Characteristic;

const DEF_MIN_RATE = -10000,
      DEF_MAX_RATE = 10000;

const interval = 5; // Minutes

const PLUGIN_NAME = 'homebridge-energy-price';
const ACCESSORY_NAME = 'Energy Price';

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, EnergyPrice);
}

class EnergyPrice {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.name = config["name"];
        this.manufacturer = config["manufacturer"] || "Energy Price";
        this.model = config["model"] || "Monitor";
        this.minRate = config["min_rate"] || DEF_MIN_RATE;
        this.maxRate = config["max_rate"] || DEF_MAX_RATE;
        this.refreshInterval = config["refreshInterval"] === undefined ? (interval * 60000) : (config["refreshInterval"] * 60000);
        this.service = new Service.TemperatureSensor(this.name);
        this.informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model);

        this.api.on('didFinishLaunching', this.poll.bind(this));
    }

    configureAccessory(accessory) {
        accessory.addService(this.service);
        accessory.addService(this.informationService);
    }

    async poll() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        try {
            const hourlyData = await api.get('https://hourlypricing.comed.com/api?type=currenthouraverage');
            this.log.info('Data from API', hourlyData.data[0].price);
            if (hourlyData.data[0].price == null) {
                this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(DEF_MAX_RATE);
            } else {
                this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.convertToFahrenheit(hourlyData.data[0].price), 1);
            }
        } catch (error) {
            this.log.error('Error getting current billing rate %s', error);
            this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(DEF_MAX_RATE);
        }
        this.timer = setTimeout(this.poll.bind(this), this.refreshInterval);
    }

    convertToFahrenheit(value) {
        return (value - 32) * 5 / 9;
    }
}
