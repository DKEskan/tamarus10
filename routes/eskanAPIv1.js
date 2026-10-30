//API in progress, use thunderclient to test
const express = require('express');
const router = express.Router();

const ethernet = require('../middleware/ethernet');
const polling = require('../middleware/polling');

const userDataController = require('../controllers/userDataController');
const moduleDataController = require('../controllers/moduleDataController');

const pa = require('../middleware/unitModules/pa');
const dds = require('../middleware/unitModules/dds');
const fan = require('../middleware/unitModules/fan');

const uiWebSocket = require('../middleware/uiWebSocket');

const transmitHandler = require('../middleware/transmitHandler');

const OK = 0;
const ERROR = null;

const UNIT_NAME_LIMIT = 32;

const HttpCode = 
{
    OK: 200,
	Accepted: 202,	
	BadRequest: 400,	
	NotFound: 404,	
    RequestTimeout: 408,
    UnprocessibleEntity: 422,
    InternalServerError: 500,	
	GatewayTimeout: 504,	
}

/*
	module APIs
	Require data from modules and comms over UART
*/

router.get('/user/RFPath/:id', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let path = req.params.id;

	if((path > 0) && (path <= moduleDataController.getPathCount()))	//only allow 1 to 16
	{
		let response = userDataController.getUserPath(path-1); //start index from 0
		res.status(HttpCode.OK).json(response);
	}
	else
	{
		res.status(HttpCode.BadRequest).send("400 : Bad Request - Id Out of Range");
	}
	
});

router.put('/user/RFPath/:id/power', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let path = req.params.id;
	let message = req.body;
	let endPoint = res;

	if((path > 0) && (path <= moduleDataController.getPathCount()))		//only allow 1 to maximum RF paths		
	{
		let msgTx = pa.SetOutputLevel(parseInt(path), message, endPoint); //start index from 0
		let Status = msgTx[0];
		let errorCode = msgTx[1];
		let errorResponse = msgTx[2];
		if(Status === ERROR)
		{
			res.status(errorCode).json(errorResponse);
		}

		//if no error, response comes after Module response
	}
	else
	{
		res.status(HttpCode.BadRequest).send("400 : Bad Request - Id Out of Range");
	}
});

router.put('/user/RFPath/:id/pathOn', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let path = req.params.id;
	let message = req.body;
	let endPoint = res;

	if((path > 0) && (path <= moduleDataController.getPathCount()))	//only allow 1 to 16
	{
		let msgTx = dds.SetMuteOutput(parseInt(path), message, endPoint); //start index from 0
		let Status = msgTx[0];
		let errorCode = msgTx[1];
		let errorResponse = msgTx[2];
		if(Status === ERROR)
		{
			res.status(errorCode).json(errorResponse);
		}
		//if no error, response comes after Module response
	}
	else
	{
		res.status(HttpCode.BadRequest).send("400 : Bad Request - Id Out of Range");
	}
});

router.put('/user/RFPath/:id/name', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let path = req.params.id;
	let message = req.body;
	
	const BAND_NAME_LIMIT = 32;

	if((path > 0) && (path <= moduleDataController.getPathCount()))	//only allow 1 to 16
	{
		let bandName = "";
		
		for(let key in message)	//breakdown data to format into eskan
		{
			tmp = message[key];
			if(key === "Name")
			{
				bandName = tmp;
			}
		}

		if(((bandName.length <= BAND_NAME_LIMIT)) && (bandName.length !== 0))
		{
			let rfPath = (path-1);
			let nameObj = {"RadioFrequencyPath":[]};
			nameObj.RadioFrequencyPath[rfPath] = message;
			userDataController.updateUserConfig(nameObj); //update local file with status
			res.status(HttpCode.Accepted).json();
			userDataController.saveUserDataMap();

			//if no error, response comes after Module response
		}	
		else if(bandName.length === 0)
		{
			res.status(HttpCode.BadRequest).send("400 : Bad Request - Name has no characters");
		}
		else if(typeof bandName.length === 'undefined')
		{
			res.status(HttpCode.BadRequest).send("400 : Bad Request - Name has incorrect format");
		}
		else if(bandName.length > BAND_NAME_LIMIT)
		{
			res.status(HttpCode.BadRequest).send("400 : Bad Request - Name longer than " + BAND_NAME_LIMIT + " Characters");
		}
		else
		{
			res.status(HttpCode.BadRequest).send("400 : Bad Request - Name error");
		}
	}
	else
	{
		res.status(HttpCode.BadRequest).send("400 : Bad Request - Id Out of Range");
	}
});


router.put('/user/RFPath/:id/sweepConfig', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let path = req.params.id;
	let message = req.body;
	let endPoint = res;

	if((path > 0) && (path <= moduleDataController.getPathCount()))	//only allow 1 to 16
	{

		let msgTx = dds.SetSweepConfig(parseInt(path), message, endPoint); //start index from 0
		let Status = msgTx[0];
		let errorCode = msgTx[1];
		let errorResponse = msgTx[2];
		if(Status === ERROR)
		{
			res.status(errorCode).json(errorResponse);
		}
		//if no error, response comes after Module response
	}
	else
	{
		res.status(HttpCode.BadRequest).send("400 : Bad Request - Id Out of Range");
	}
});

router.get('/user/unitOn', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let response = userDataController.getUserIsUnitOn();
	res.status(HttpCode.OK).json(response);
});

router.get('/user/isTransmitting', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let response = userDataController.getUserIsTransmitting();
	res.status(HttpCode.OK).json(response);
});


//REDUNDANT
router.put('/user/unitOn', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let message = req.body;
	let endPoint = res;
	let tries = 2;
	let count = 0;
	let success = false;

	//TO DO - allow use of old message until next deadline 
	if((message?.IsUnitOn === true ) || (message?.IsUnitOn === false))
	{
		//attempt to send unit on command 2 times to ensure all units turned on/off. 
		new Promise(function SendUnitOnCommands(resolve,reject){
			if(tries !== 0)
			{
				for(let modules = 1; modules <= (moduleDataController.getPathCount()); modules++)
				{
					let msgTx = dds.SetMuteOutput(modules, message, null); //start index from 0
					let Status = msgTx[0];
					let errorCode = msgTx[1];
					let errorResponse = msgTx[2];
					if(Status === ERROR)
					{
						res.status(errorCode).json(errorResponse);
						return;		
					}
				}
			}
			if(--tries > 0){
				setTimeout(function() {
					let currentConfig = userDataController.getUserIsUnitOn();
					delete currentConfig.IsUnitOn;

					for(let modules = 0; modules < (moduleDataController.getPathCount()); modules++)
					{
						if(currentConfig.RadioFrequencyPath[modules].IsPathOn === message.IsUnitOn)
						{
							count++;
							if(count === moduleDataController.getPathCount())
							{
								success = true;
							}
						}
					}
					count = 0;
					if(success === true)	//if set values match desired values
					{
						let unitObj = {"IsUnitOn": false};
						(message.IsUnitOn === true) ? unitObj.IsUnitOn = true : unitObj.IsUnitOn = false;
					
						userDataController.updateUserConfig(unitObj);
						
						res.status(HttpCode.Accepted).json();
						return;
					}
					SendUnitOnCommands(resolve,reject);
				}, 2000);
			}
			else
			{
				res.status(HttpCode.GatewayTimeout).json("Modules did not provide a timely response");
				return;	
			}

		})
		.catch(()=> console.log("UnitOn Error"));

	}
	else	//TO DO - Implement this command in the next deadline.
	{
		//attempt to send unit on command 2 times to ensure all units turned on/off. 
		new Promise(function SendUnitOnCommands(resolve,reject){
			for(let key in message.RadioFrequencyPath)
			{
				let msgTx = dds.SetMuteOutput(parseInt(message.RadioFrequencyPath[key].Id), message.RadioFrequencyPath[key], 0); //start index from 0
				let Status = msgTx[0];
				let errorCode = msgTx[1];
				let errorResponse = msgTx[2];
				if(Status === ERROR)
				{
					res.status(errorCode).json(errorResponse);
					return;		
				}
			}
			if(--tries > 0){
				setTimeout(function() {
					let currentConfig = userDataController.getUserIsUnitOn();
					delete currentConfig.IsUnitOn;
					delete message.IsUnitOn;

					//TO DO - UPDATE TO USE LODASH PACKAGE:
					//console.log(_.isEqual(message, currentConfig));
					//if(_.isEqual(message, currentConfig))

					if(JSON.stringify(message) === JSON.stringify(currentConfig))	//if set values match desired values
					{
						let unitObj = {"IsUnitOn": false};
						(message.IsUnitOn === true) ? unitObj.IsUnitOn = true : unitObj.IsUnitOn = false;
					
						userDataController.updateUserConfig(unitObj);
						
						res.status(HttpCode.Accepted).json();
						return;
					}
					SendUnitOnCommands(resolve,reject);
				}, 2000);
			}
			else
			{
				res.status(HttpCode.GatewayTimeout).json("Modules did not provide a timely response");
				return;	
			}

		})
		.catch(()=> console.log("UnitOn Error"));
	}

});

/*
	Control Unit APIs
	Handle quickly and send out
*/
router.get('/user/config', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let response = userDataController.getUserConfig();
	res.status(HttpCode.OK).json(response);
});

router.get('/user/systemInfo', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let response = userDataController.getUserSystemInfo();
	res.status(HttpCode.OK).json(response);
});

router.put('/user/systemInfo', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let message = req.body;

	let unitName = "";
	
	for(let key in message)	//breakdown data to format into eskan
	{
		tmp = message[key];
		if(key === "UnitName")
		{
			unitName = tmp;
		}
		else if(key === "IPAddress")
		{
			IpAddress = tmp;
		}
		else if(key === "Subnet")
		{
			Subnet = tmp;
		}
		else if(key === "Gateway")
		{
			Gateway = tmp;
		}
	}

	[code, errorMessage] = unitNameCheck(unitName);
	
	if(code === OK)	//unit name ok, save
	{
		userDataController.updateUserConfig(message); //update local file with status
		userDataController.saveUserDataMap();

		[code, errorMessage] = ipSettingsCheck(IpAddress, Subnet, Gateway);

		if(code === OK)	//ip config data OK
		{
			if(ethernet.setIpConfig(IpAddress, Subnet, Gateway) === 0)	//setting ip config successful
			{
				response = userDataController.getUserIpSettings();
				res.status(HttpCode.Accepted).json();		//send message before restarting service
				ethernet.restartEthService();
			}
			else	//failed setting ip config
			{
				res.status(HttpCode.InternalServerError).send("500 : Internal Server Error");
			}
		}
		else //ip config data bad, failed
		{
			res.status(code).send(errorMessage);
		}
	}	
	else //unit name bad, failed
	{
		res.status(code).send(errorMessage);
	}	
});

router.get('/user/unitName', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let response = userDataController.getUserUnitName();
	res.status(HttpCode.OK).json(response);
});


router.put('/user/unitName', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let message = req.body;

	let unitName = "";
	
	for(let key in message)	//breakdown data to format into eskan
	{
		tmp = message[key];
		if(key === "UnitName")
		{
			unitName = tmp;
		}
	}

	[code, errorMessage] = unitNameCheck(unitName);
	if(code === OK)
	{
		userDataController.updateUserConfig(message); //update local file with status
		res.status(HttpCode.Accepted).json();
		userDataController.saveUserDataMap();

		//if no error, response comes after Module response
	}	
	else 
	{
		res.status(code).send(errorMessage);
	}		
});

function unitNameCheck(unitName)
{
	if(((unitName.length <= UNIT_NAME_LIMIT)) && (unitName.length !== 0))
	{
		return [OK, ""];
	}	
	else if(unitName.length === 0)
	{
		return [HttpCode.BadRequest, "400 : Bad Request - Name has no characters"];
	}
	else if(typeof unitName.length === 'undefined')
	{
		return [HttpCode.BadRequest, "400 : Bad Request - Name has incorrect format"];
	}
	else if(unitName.length > UNIT_NAME_LIMIT)
	{
		return [HttpCode.BadRequest, "400 : Bad Request - Name longer than " + UNIT_NAME_LIMIT + " Characters"];
	}
	else
	{
		return [HttpCode.BadRequest, "400 : Bad Request - Name error"];
	}
}

router.get('/user/ipSettings', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let response = userDataController.getUserIpSettings();
	res.status(HttpCode.OK).json(response);
});
router.put('/user/ipSettings', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	
	let message = req.body;
	let IpAddress = "";
	let Subnet = "";
	let Gateway = "";

	for(let key in message)	//breakdown data to format into eskan
	{
		tmp = message[key];
		if(key === "IPAddress")
		{
			IpAddress = tmp;
		}
		else if(key === "Subnet")
		{
			Subnet = tmp;
		}
		else if(key === "Gateway")
		{
			Gateway = tmp;
		}
	}

	[code, errorMessage] = ipSettingsCheck(IpAddress, Subnet, Gateway);

	if(code === OK)	//return error if issue.
    {
		if(ethernet.setIpConfig(IpAddress, Subnet, Gateway) === 0)
		{
			response = userDataController.getUserIpSettings();
			res.status(HttpCode.Accepted).json();
			ethernet.restartEthService();
		}
		else
		{
			res.status(HttpCode.InternalServerError).send("500 : Internal Server Error");
		}
    }
	else
	{
		res.status(code).send(errorMessage);
	}
});

function ipSettingsCheck(IpAddress, Subnet, Gateway)
{
	let valid = ethernet.validateIpInput(IpAddress, Subnet, Gateway, 0, 0);	//check input
	
	//bitwise check for 0b00111, IP, subnet, or gateway. DCHP and DNS currently unrequired.
	if(	(valid & (1<<0)) || (valid & (1<<1)) || 
		(valid & (1<<2)))		
	{
		let error = "400 : Bad Request - "
		let commaReq = 0;
	 	if(valid & (1<<0))
	    {
	    	error += "IP Address Invalid";
	    	commaReq = 1;
	    }
	    if(valid & (1<<1))
	    {
	    	if(commaReq === 1)
	    	{
	    		error += ", "
	    	}
	    	error += "Subnet Invalid";
	    }
	    if(valid & (1<<2))
	    {
	    	if(commaReq === 1)
	    	{
	    		error += ", "
	    	}
	    	error += "Gateway Invalid";
	    }

		return [HttpCode.BadRequest, error];
	}
	else
	{
		return [OK, ""];
	}
}

router.get('/user/defaultIpSettings', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let response = ethernet.getDefaultIpSettings();
	res.status(HttpCode.OK).json(response);
});
router.put('/user/defaultIpSettings', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let message = req.body;
	let IpAddress = "";
	let Subnet = "";
	let Gateway = "";

	for(let key in message)	//breakdown data to format into eskan
	{
		tmp = message[key];
		if(key === "IPAddress")
		{
			IpAddress = tmp;
		}
		else if(key === "Subnet")
		{
			Subnet = tmp;
		}
		else if(key === "Gateway")
		{
			Gateway = tmp;
		}
	}
	
	let valid = ethernet.validateIpInput(IpAddress, Subnet, Gateway, 0, 0);	//check input
	
	//bitwise check for 0b00111, IP, subnet, or gateway. DCHP and DNS currently unrequired.
	if(	(valid & (1<<0)) || (valid & (1<<1)) || 
		(valid & (1<<2)))		
	{
		let error = "400 : Bad Request - "
		let commaReq = 0;
	 	if(valid & (1<<0))
	    {
	    	error += "IP Address Invalid";
	    	commaReq = 1;
	    }
	    if(valid & (1<<1))
	    {
	    	if(commaReq === 1)
	    	{
	    		error += ", "
	    	}
	    	error += "Subnet Invalid";
	    }
	    if(valid & (1<<2))
	    {
	    	if(commaReq === 1)
	    	{
	    		error += ", "
	    	}
	    	error += "Gateway Invalid";
	    }

	    res.status(HttpCode.BadRequest).send(error);
	}
	else	//return error if issue.
    {
		if(ethernet.setDefaultIpConfig(message) === OK)
		{
			res.status(HttpCode.Accepted).json();
		}
		else
		{
			res.status(HttpCode.BadRequest).send("400 : Bad Request - Settings error");
		}
    }
});
router.put('/user/resetToDefaultIpSettings', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	
	if(ethernet.resetToDefaultIpConfig() === 0)
	{
		response = userDataController.getUserIpSettings();
		res.status(HttpCode.Accepted).json();
		ethernet.restartEthService();
	}
	else
	{
		res.status(HttpCode.InternalServerError).send("500 : Internal Server Error");
	}
});

router.get('/user/buildInfo', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let response = userDataController.getUserBuildInfo();
	res.status(HttpCode.OK).json(response);
});


/*
	Engineer APIs
*/
router.put('/engineer/mapUnitModules', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	polling.initModuleMapping();
	res.status(HttpCode.OK).send("Mapping started. Allow 5mins to complete.");
});

router.get('/engineer/mappedUnit', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let response = moduleDataController.getModuleMap();
	res.status(HttpCode.OK).json(response);
});

router.put('/engineer/buttonPress', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let message = req.body;

	let buttonInput = "";

	for(let key in message)	//breakdown data to format into eskan
	{
		tmp = message[key];
		if(key === "button")
		{
			buttonInput = tmp;
		}
	}
	
	if(buttonInput === "2" || buttonInput === "4" ||
        buttonInput === "6" || buttonInput === "8" || 
        buttonInput === "5" || buttonInput === "C" ||
		buttonInput === "D" || buttonInput === "M" ||
		buttonInput === "U"	)
	{
		response = uiWebSocket.sendButtonUpdate(buttonInput);
		if(response !== ERROR)
		{
			res.status(HttpCode.Accepted).json();
		}
		else
		{
			res.status(HttpCode.BadRequest).send("400 : Bad Request - Null Input"); //not a button digit
		}
	}
	else
	{
		res.status(HttpCode.BadRequest).send("400 : Bad Request - Invalid Input"); //not a button digit
	}
});

router.put('/engineer/debugTurnOffAlarmSafety', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	
	polling.setAlarmSafety(false);
	res.status(HttpCode.Accepted).send("Debug mode enabled. Alarm will not turn off TX");
});

router.put('/engineer/debugTurnOnAlarmSafety', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	
	polling.setAlarmSafety(true)
	res.status(HttpCode.Accepted).send("Debug mode disabled. Alarm will turn off TX");
});

router.put('/engineer/clearAlarms', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	moduleDataController.clearAlarms();
	res.status(HttpCode.Accepted).send("Alarms cleared");
});

//NOT FULLY FUNCTIONAL, NEEDS MORE TESTING
router.put('/engineer/unitId', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	const CuInterface = require('../middleware/unitModules/CuInterface');
	
	let message = req.body;

	for(let key in message)	//breakdown data to format into eskan
	{
		tmp = message[key];
		if(key === "UnitId")
		{
			unitid = tmp;
		}
	}
	message = {"UnitId":254};
    message.UnitId = unitid;
    CuInterface.setUnitId(modules, message, null); //start index from 0

	res.status(HttpCode.Accepted).send("unit ID set to " + unitid);
});

router.get('/engineer/opFill', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
	let message = req.body;
	let opFillIndex = 0;
	for(let key in message)	//breakdown data to format into eskan
	{
		tmp = message[key];
		if(key === "op")
		{
			opFillIndex = tmp;
		}
	}
	let freshData = JSON.parse(JSON.stringify(userDataController.getOpfill(opFillIndex)));
	res.status(HttpCode.OK).send(freshData);
});

//out of date
// router.put('/engineer/charging', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
// 	let message = req.body;
// 	console.log(message);
// 	let charging = false;
// 	for(let key in message)	//breakdown data to format into eskan
// 	{
// 		tmp = message[key];
// 		if(key === "Charging")
// 		{
// 			charging = tmp;
// 			console.log(charging);
// 		}
// 	}

// 	console.log(charging);
// 	if((charging !== true) && (charging !== false))
// 	{
// 		res.status(HttpCode.BadRequest).json("requires boolean");
// 	}
// 	else
// 	{
// 		let batteryObj = {"BatteryCharging":charging};
// 		userDataController.updateUserConfig(batteryObj); //update local file with status
// 		res.status(HttpCode.Accepted).json();
// 	}
// });

// router.get('/engineer/password', (req, res) => {  // :id, :command, :message data is accessible via req.params.id, req.params.command, req.params.message
// 	let password = userDataController.getPassword();
// 	res.status(HttpCode.OK).send(password);
// });

module.exports = router;

