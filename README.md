# homebridge-energy-price


This is a fork of ecoen66/homebridge-comed-hourlybilling. It is modified to run as a temperature sensor so that negative values are allowed. I created this project to automate EV charging when prices are negative, but it can be used as a monitor or for other automations as well.


# Installation
Run these commands:

    % sudo npm install -g homebridge
    % sudo npm install -g homebridge-energy-price


NB: If you install homebridge like this:

    sudo npm install -g --unsafe-perm homebridge

Then all subsequent installations must be like this:

    sudo npm install -g --unsafe-perm homebridge-energy-price

# Configuration

Example accessory config (needs to be added to the homebridge config.json):
 ...

		"accessories": [
        	{
				"name": "ComEd Rate",
				"manufacturer": "ComEd",
				"model": "Hourly Billing"
				"accessory": "ComEd Hourly Billing"
        	}
      	]
 ...

### Config Explanation:

Field           			| Description
----------------------------|------------
**accessory**         | (required) Must always be "ComEd Hourly Billing".
**name**              | (required) The name you want to use for for the power level widget.
**manufacturer**			| (optional) This shows up in the homekit accessory Characteristics.
**model**             | (optional) This shows up in the homekit accessory Characteristics.
**refreshInterval**   | (optional) The refresh interval in minutes for polling ComEd.
