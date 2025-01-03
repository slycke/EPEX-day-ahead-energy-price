"use strict";

const axios = require('axios');
const xml2js = require('xml2js');
const api = axios.create({});

var Service, Characteristic;

// We won’t poll faster than 15 minutes
const MIN_POLL_INTERVAL_MINUTES = 15;

// Helper to format numbers to two digits
function zeroPad(num, size) {
    let s = String(num);
    while (s.length < size) {
        s = '0' + s;
    }
    return s;
}

/**
 * Convert a JavaScript Date to ENTSO-E’s “YYYYMMDDHHmm” format in UTC.
 * You might choose to always set `mm` to '00' or round to 15 minutes, etc.
 */
function toEntsoeDateString(date) {
    const year = date.getUTCFullYear();
    const month = zeroPad(date.getUTCMonth() + 1, 2);
    const day = zeroPad(date.getUTCDate(), 2);
    const hour = zeroPad(date.getUTCHours(), 2);
    const mins = zeroPad(date.getUTCMinutes(), 2); // or '00' if you want to round to hour

    // Commonly, many ENTSO-E calls ignore the minutes or set them to 00, 
    // but if you want exact 15-minute slices, you can use “HH15”, “HH30”, or “HH45”.
    return `${year}${month}${day}${hour}${mins}`;
}

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory(
        "ENTSOE-energy-price",
        "ENTSOE Day Ahead Energy Price",
        EntsoeEnergyPrice
    );
};

/**
 * EntsoeEnergyPrice Class
 * 
 * Polls ENTSO-E’s Transparency Platform Restful API to retrieve day-ahead prices 
 * (or any other data), then updates Homebridge “CurrentTemperature”.
 */
class EntsoeEnergyPrice {
    constructor(log, config, apiRef) {
        this.log = log;
        this.config = config;

        // Accessory info
        this.name = config["name"] || "ENTSO-E Energy Price";
        this.manufacturer = config["manufacturer"] || "ENTSO-E Day Ahead Energy Price";
        this.model = config["model"] || "Monitor";

        // The user can define how frequently to poll (in minutes) in their config,
        // but we force a minimum of 15 minutes
        let pollMinutes = parseInt(config["refreshInterval"], 10) || MIN_POLL_INTERVAL_MINUTES;
        if (pollMinutes < MIN_POLL_INTERVAL_MINUTES) {
            pollMinutes = MIN_POLL_INTERVAL_MINUTES;
            this.log.warn(`Polling interval too short, forcing ${MIN_POLL_INTERVAL_MINUTES} minutes.`);
        }
        this.refreshInterval = pollMinutes * 60_000;

        // If you want a user-defined min/max, handle them here
        this.minRate = config["min_rate"] || DEF_MIN_RATE;
        this.maxRate = config["max_rate"] || DEF_MAX_RATE;

        // Common ENTSO-E parameters
        // These can come from config, or you can set defaults:
        this.documentType = config["documentType"] || 'A44';
        this.in_Domain = config["in_Domain"] || '10YAT-APG------L';
        this.out_Domain = config["out_Domain"] || '10YAT-APG------L';

        // If you have an API key, you might store it in config and use it in headers
        this.apiKey = config["apiKey"] || null;

        // Create the Homebridge services
        this.service = new Service.TemperatureSensor(this.name);
        this.service
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.handleCurrentTemperatureGet.bind(this));

        this.informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model);

        // Hook into Homebridge’s init
        if (apiRef) {
            apiRef.on('didFinishLaunching', () => {
                this.poll(); // Start first poll once Homebridge finishes launching
            });
        } else {
            // Fallback if no API object
            setTimeout(() => this.poll(), 1000);
        }
    }

    /**
     * Poll the ENTSO-E API, parse data, and update the CurrentTemperature characteristic.
     */
    async poll() {
        // Clear any existing timer
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        try {
            // Round "now" down to the top of the current hour (UTC)
            const now = new Date();
            now.setUTCMinutes(0, 0, 0); // zero out minutes, secs, ms

            // ENTSO-E date format: YYYYMMDDHHmm
            const startDate = toEntsoeDateString(now);
            const endDate = toEntsoeDateString(new Date(now.getTime() + 60 * 60 * 1000));

            // 2) Construct the ENTSO-E request URL
            let url =
                `https://web-api.tp.entsoe.eu/api` +
                `?documentType=${this.documentType}` +
                `&in_Domain=${this.in_Domain}` +
                `&out_Domain=${this.out_Domain}` +
                `&periodStart=${startDate}` +
                `&periodEnd=${endDate}`;

            this.log.info(`Requesting data from ENTSO-E: ${url}`);

            // 3) Optional: Add API key if required
            let headers = {};
            if (this.apiKey) {
                headers["X-Api-Key"] = this.apiKey;
            }

            // 4) Perform the request
            let response = await axios.get(url, {
                headers: headers,
                maxBodyLength: Infinity,
            });

            // 5) Parse the XML into JS
            const parser = new xml2js.Parser({ explicitArray: false });
            let result = await parser.parseStringPromise(response.data);

            // 6) Extract the price (just an example of reading the *first* point)
            let price = this.maxRate; // fallback
            if (
                result.Publication_MarketDocument &&
                result.Publication_MarketDocument.TimeSeries
            ) {
                // In some responses, TimeSeries may be an array or a single object
                const timeSeriesData = Array.isArray(result.Publication_MarketDocument.TimeSeries)
                    ? result.Publication_MarketDocument.TimeSeries
                    : [result.Publication_MarketDocument.TimeSeries];

                // For simplicity, look at the first TimeSeries
                const firstSeries = timeSeriesData[0];

                if (firstSeries && firstSeries.Period) {
                    const periodData = Array.isArray(firstSeries.Period)
                        ? firstSeries.Period
                        : [firstSeries.Period];

                    // Grab the first Period
                    const firstPeriod = periodData[0];

                    if (firstPeriod && firstPeriod.Point) {
                        const points = Array.isArray(firstPeriod.Point)
                            ? firstPeriod.Point
                            : [firstPeriod.Point];

                        // Grab the first point
                        const firstPoint = points[0];
                        if (firstPoint && firstPoint['price.amount']) {
                            const rawPrice = parseFloat(firstPoint['price.amount']);
                            if (!isNaN(rawPrice)) {
                                price = rawPrice;
                            }
                        }
                    }
                }
            }

            // 7) Update the HomeKit “temperature” with the price
            this.log.info(`Fetched price = ${price}`);
            this.service
                .getCharacteristic(Characteristic.CurrentTemperature)
                .updateValue(price);

        } catch (err) {
            this.log.error(`Error fetching/parsing ENTSO-E data: ${err}`);
            // If there’s an error, set to fallback (max)
            this.service
                .getCharacteristic(Characteristic.CurrentTemperature)
                .updateValue(this.maxRate);
        }

        // 8) Schedule the next poll
        this.timer = setTimeout(() => this.poll(), this.refreshInterval);
    }

    handleCurrentTemperatureGet(callback) {
        this.log.info("HomeKit requested current temperature (energy price).");
        const value = this.service.getCharacteristic(Characteristic.CurrentTemperature).value;
        callback(null, value);
    }

    getServices() {
        return [this.informationService, this.service];
    }
}