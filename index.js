const axios = require('axios');
const api = axios.create({})


var Service, Characteristic;

const DEF_MIN_RATE = -10000,
      DEF_MAX_RATE = 10000;

const interval = 5 // Minutes

const PLUGIN_NAME   = 'homebridge-energy-price';
const ACCESSORY_NAME = 'Energy Price';

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, EnergyPrice);
}

class EnergyPrice {
    constructor(log, config) {
    	this.log = log
    	this.config = config

    	this.service = new Service.TemperatureSensor(this.config.name)
    	this.name = config["name"];
    	this.manufacturer = config["manufacturer"] || "Energy Price";
	    this.model = config["model"] || "Monitor";
	    this.minRate = config["min_rate"] || DEF_MIN_RATE;
    	this.maxRate = config["max_rate"] || DEF_MAX_RATE;
			this.refreshInterval = config["refreshInterval"] === undefined ? (interval * 60000) : (config["refreshInterval"] * 60000)
			this.timer = setTimeout(this.poll.bind(this), this.refreshInterval)
			this.poll()
    }

    getServices () {
    	const informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
        .setCharacteristic(Characteristic.Model, this.model)
        .setCharacteristic(Characteristic.TemperatureDisplayUnits.CELSIUS)
	    return [informationService, this.service]
    }

	async poll() {
		if(this.timer) clearTimeout(this.timer)
		this.timer = null
		try {
	    const hourlyData = await api.get('https://hourlypricing.comed.com/api?type=currenthouraverage')
				.catch(err => {
						this.log.error('Error getting current billing rate %s',err)
				})
			if(hourlyData) {
				this.log.info('Data from API', hourlyData.data[0].price);
				if (hourlyData.data[0].price == null) {
					// No price in hourlyData, return maximum allowed value
					this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(DEF_MAX_RATE)
					} else {
					// Return positive value
					this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(hourlyData.data[0].price, 1)
				}
			} else {
				// No response hourlyData, return maximum allowed value
				this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(DEF_MAX_RATE)
			}
		} catch (error) {
				console.error(error)
		}
		this.timer = setTimeout(this.poll.bind(this), this.refreshInterval)
	}
}
