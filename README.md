# EPEX day ahead electricity price in Homebridge

NOTE: WIP

Homebridge-Energy-Price is a project forked from [https://github.com/anon1y4012/homebridge-energy-price#readme). This version has been modified to get electricity prices in Europe via the EPEX spot price (https://www.epexspot.com/en) published via the public ENTSO-E transparency platform (https://transparency.entsoe.eu).

# Electricity price data access and this plugin

This Homebridge plugin requires that you obtain your own API access key on ENTSO-E. Instructions: (https://transparencyplatform.zendesk.com/hc/en-us/articles/12845911031188-How-to-get-security-token)

## Installation

The easiest installation method is to use Homebridge-Config-UI-X and search for this plugin.

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
