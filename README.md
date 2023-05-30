# Homebridge-Energy-Price

Homebridge-Energy-Price is a project forked from [ecoen66/homebridge-comed-hourlybilling](https://github.com/ecoen66/homebridge-comed-hourlybilling). This version has been modified to run as a temperature sensor, allowing negative values. Initially created to automate EV charging during periods of negative energy prices, this plugin can also be employed for monitoring or other automation purposes.

## Installation

You can install this plugin by running the following commands:

```bash
sudo npm install -g homebridge
sudo npm install -g homebridge-energy-price
```

**Note:** If you install homebridge using the following command:

```bash
sudo npm install -g --unsafe-perm homebridge
```

All subsequent installations must follow the same format, like this:

```bash
sudo npm install -g --unsafe-perm homebridge-energy-price
```

## Configuration

You will need to add the following example accessory configuration to your homebridge `config.json`:

```json
"accessories": [
    {
        "name": "Energy Price",
        "manufacturer": "ComEd",
        "model": "Energy Price Monitor",
        "accessory": "Energy Price"
    }
]
```

### Configuration Explanation

Field | Description
----- | -----------
**accessory** | (required) Must always be "Energy Price".
**name** | (required) The name you want to use for the power level widget.
**manufacturer** | (optional) This shows up in the HomeKit accessory characteristics.
**model** | (optional) This shows up in the HomeKit accessory characteristics.
**refreshInterval** | (optional) The refresh interval in minutes for polling ComEd. The default is 5 minutes.
