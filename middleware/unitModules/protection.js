/*
	Based on document protection PCB interface protocol EODF0059PD-V2
*/

const moduleDataController = require('../../controllers/moduleDataController');

const OK = 0;
const ERROR = null;

const firstLoad = [];

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

const CommandId = 
{  
	setSupplyEnable: 0x82,
	setOCEnable: 0x83,
	setExtFanSpeed: 0x84,
    setPowerUpState: 0x87,
	setReportPaOnState: 0x88,
	getStatus: 0xA0,
	setClearAlarms: 0xA1,
	getBuildInfo: 0xB0,
	getConfig: 0xC0,
	setSoftReset: 0xE0
}

const ModuleIdRange = 
{
    MIN: 0x40,
    MAX: 0x4F
}

//error codes, ensure they are numbered in sequence
const ModErrCodes = 
[
	[100, "Value OOR (Out of Range)"],
	[101, "EE_W, EE Write via I2C fail"],
    [102, "EE_R, EE Read via I2C fail"],
	[103, "Unknown Command"],
    [104, "Index OOR"]
];

function mapInitCommands(module)	//command to identify module present for mapping
{
	const eskanProtocol = require('../eskanProtocol');

	let initCommand = [];
	initCommand.push(module);
    initCommand.push(CommandId.getStatus);
    eskanProtocol.packAndQueue(initCommand,0);
}

function powerupCommands(unitId)	//command to identify module present for mapping
{
	const eskanProtocol = require('../eskanProtocol');

	let powerUpCommand = [];
	powerUpCommand.push(unitId);	
	powerUpCommand.push(CommandId.getConfig);	//get config first to ensure module map config file built
	eskanProtocol.packAndQueue(powerUpCommand,0);
	powerUpCommand.pop();

    // powerUpCommand.push(CommandId.setSupplyEnable);	//turn on power supply to PA
	// powerUpCommand.push(0x31);
    // eskanProtocol.packAndQueue(powerUpCommand,null);
	// powerUpCommand.pop();
	// powerUpCommand.pop();

	if(unitId === 0x4F)
	{
		powerUpCommand.push(CommandId.setExtFanSpeed);	//turn fan speed to off on power up
		powerUpCommand.push(0x31);
	    eskanProtocol.packAndQueue(powerUpCommand,null);
		powerUpCommand.pop();
		powerUpCommand.pop();
    }
	
	powerUpCommand.push(CommandId.getStatus);
	eskanProtocol.packAndQueue(powerUpCommand,0);
}

function pollCommands(unitId)
{
	const eskanProtocol = require('../eskanProtocol');

	let pollCommand = [];
	pollCommand.push(unitId);

	//get config carried out on power up command, repeat not necessary 

	// if (firstLoad.indexOf(unitId) === -1)
	// {
	// 	pollCommand.push(CommandId.getConfig);
	// 	eskanProtocol.packAndQueue(pollCommand,0);
	// 	pollCommand.pop();
	// 	firstLoad.push(unitId);
	// }
	
    pollCommand.push(CommandId.getStatus);
    eskanProtocol.packAndQueue(pollCommand,0);
}


function SetSupplyEnable(path, val, endPoint) //turn on LED and buzzer
{
    const eskanProtocol = require('../eskanProtocol');

	let code = HttpCode.OK;
	let tmpErrMsg = "";
	let tmp = -1;
	let id = path + ModuleIdRange.MIN - 1;

	let valid = inputChecks(val);
	code = valid[0];
	tmpErrMsg = valid[1];
	if(code >= HttpCode.BadRequest)	//failed input checks
	{
		return [ERROR, code, tmpErrMsg];
	}

	let SupplyEnable;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "IsSupplyEnable")
		{		
			if(typeof tmp !== "boolean")
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "SuppyEnable Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			SupplyEnable = tmp;
		}
	}
	
	if(SupplyEnable === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}
	
	if(SupplyEnable === true)
	{
		eskanMessage = [id, CommandId.setSupplyEnable, 0x31];	//Enable
	}
	else
	{
		eskanMessage = [id, CommandId.setSupplyEnable, 0x30];	//Disable
	}

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

function SetReportPaOnState(path, val, endPoint) //turn on LED and buzzer
{
    const eskanProtocol = require('../eskanProtocol');

	let code = HttpCode.OK;
	let tmpErrMsg = "";
	let tmp = -1;
	let id = path + ModuleIdRange.MIN - 1;

	let valid = inputChecks(val);
	code = valid[0];
	tmpErrMsg = valid[1];
	if(code >= HttpCode.BadRequest)	//failed input checks
	{
		return [ERROR, code, tmpErrMsg];
	}

	let PaOn;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "IsPaOn")
		{		
			if(typeof tmp !== "boolean")
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "PaOn Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			PaOn = tmp;
		}
	}
	
	if(PaOn === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}
	
	if(PaOn === true)
	{
		eskanMessage = [id, CommandId.setReportPaOnState, 0x31];	//PA On
	}
	else
	{
		eskanMessage = [id, CommandId.setReportPaOnState, 0x30];	//PA Off
	}

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}


function setExtFanSpeed(path, val, endPoint) //turn on LED and buzzer
{
    const eskanProtocol = require('../eskanProtocol');

	try
	{
		let code = HttpCode.OK;
		let tmpErrMsg = "";
		let tmp = -1;
		let id = path + ModuleIdRange.MIN - 1;

		let valid = inputChecks(val);
		code = valid[0];
		tmpErrMsg = valid[1];
		if(code >= HttpCode.BadRequest)	//failed input checks
		{
			return [ERROR, code, tmpErrMsg];
		}

		let FanSpeed;

		for(let key in val)	//breakdown data to format into eskan
		{
			tmp = val[key];
			if(key === "FanSpeed")
			{		
				if((tmp < 0x30) || (tmp > 0x35))
				{
					code = HttpCode.BadRequest;
					tmpErrMsg = "Fan Speed Value Invalid";
					return [ERROR, code, tmpErrMsg];
				}
				FanSpeed = tmp;
			}
		}
		
		if(FanSpeed === undefined)
		{
			code = HttpCode.BadRequest;
			tmpErrMsg = "Body Parameter Missing";
			return [ERROR, code, tmpErrMsg];
		}
		
		eskanMessage = [id, CommandId.setExtFanSpeed, FanSpeed];
		eskanProtocol.packAndQueue(eskanMessage, endPoint);
		
		return [OK, 0, 0];
	}
	catch(error)
	{
		console.log("protection Set external fan speed error");
		console.log(error);
	}
	code = HttpCode.BadRequest;
	tmpErrMsg = "protection Set external fan speed error";
	return [ERROR, code, tmpErrMsg];
}

function SetOCEnable(path, val, endPoint) //turn on LED and buzzer
{
    const eskanProtocol = require('../eskanProtocol');

	let code = HttpCode.OK;
	let tmpErrMsg = "";
	let tmp = -1;
	let id = path + ModuleIdRange.MIN - 1;

	let valid = inputChecks(val);
	code = valid[0];
	tmpErrMsg = valid[1];
	if(code >= HttpCode.BadRequest)	//failed input checks
	{
		return [ERROR, code, tmpErrMsg];
	}

	let OCEnable;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "IsOCEnable")
		{		
			if(typeof tmp !== "boolean")
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "OCEnable Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			OCEnable = tmp;
		}
	}
	
	if(OCEnable === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}
	
	if(OCEnable === true)
	{
		eskanMessage = [id, CommandId.setOCEnable, 0x31];	//Enable
	}
	else
	{
		eskanMessage = [id, CommandId.setOCEnable, 0x30];	//Disable
	}

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

function SetPowerUpState(path, val, endPoint) //turn on LED and buzzer
{
    const eskanProtocol = require('../eskanProtocol');

	let code = HttpCode.OK;
	let tmpErrMsg = "";
	let tmp = -1;
	let id = path + ModuleIdRange.MIN - 1;

	let valid = inputChecks(val);
	code = valid[0];
	tmpErrMsg = valid[1];
	if(code >= HttpCode.BadRequest)	//failed input checks
	{
		return [ERROR, code, tmpErrMsg];
	}

	let powerUpState;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "IsPowerUpStateEnable")
		{		
			if(typeof tmp !== "boolean")
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "PowerUpState Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			powerUpState = tmp;
		}
	}
	
	if(powerUpState === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}
	
	if(powerUpState === true)
	{
		eskanMessage = [id, CommandId.setPowerUpState, 0x31];	//Enable
	}
	else
	{
		eskanMessage = [id, CommandId.setPowerUpState, 0x30];	//Disable
	}

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

function SetClearAlarms(moduleId, endPoint)
{
	const eskanProtocol = require('../eskanProtocol');

	// send to UART
	eskanMessage = [moduleId, CommandId.setClearAlarms];

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

/*
data is the module response.
setMsg is the sent message with the value transmitted. If Ack received, value set successfully.
returns JSON response code, message to accompany code, and module
*/
function EskanToJson(data, setMsg)  //for responses from messages being polled
{
	const eskanProtocol = require('../eskanProtocol');
	
	try
	{
		let unitId = data[0];
		let msgId = data[1];
		let AckNAckData = data[2];
		let tmp = 0;
		
		let eskanMessage = "";

		if(AckNAckData === 0x4E)	//NAck (N - 0x4E), Not Acknowledge, Failed
		{
			return getNakResponse(data);
		}
		else if((AckNAckData === 0x41) || (AckNAckData === 0x44))	//Ack (A - 0x41) response for Set commands, Data (D - 0x44) for data to follow reply
		{
			if(msgId === CommandId.getStatus)  //module build status. Contains build info
			{  	
				let statusObj = {"address": "0x" + unitId.toString(16), "status":{}};

				//Overall Bitfield: (0: Clear, 1: Set, 0x04==Status Good and No Alarms or warnings)
				tmp = parseInt(data[3]);
				statusObj.status.overallStatusVal = tmp;
				switch(tmp)
				{
					case 0b001 : 
						statusObj.status.overallStatus = "Alarm";	
						break;
					case 0b010 :
						statusObj.status.overallStatus = "Warning";	
						break;
					case 0b100 :
						statusObj.status.overallStatus = "Status OK";	
						break;
					case 0b110 :
						statusObj.status.overallStatus = "Status OK, Warning";	
						break;
					case 0b101 :
						statusObj.status.overallStatus = "Status OK, Alarm";	
						break;
					case 0b111 :
						statusObj.status.overallStatus = "Status OK, Warning, Alarm";	
						break;
					default : 
						// console.log("EskanToJson Status Low state Protection");
						statusObj.status.overallStatus = "Status Not OK";		
						break;
				}

				//Alarm Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[4]);
				// tmp &= ~(1 << 2);
				statusObj.status.alarmsVal = tmp;
				statusObj.status.alarms = {};
				(tmp&1) ? statusObj.status.alarms.Over_Current = "FAULT" : statusObj.status.alarms.Over_Current = "OK";
				(tmp&(1<<1)) ? statusObj.status.alarms.Protection_Comms = "FAULT" : statusObj.status.alarms.Protection_Comms = "OK";
				(tmp&(1<<2)) ? statusObj.status.alarms.Voltage_Out_Low = "FAULT" : statusObj.status.alarms.Voltage_Out_Low = "OK";

				//Warning Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[5]);
				statusObj.status.warningsVal = tmp;
				statusObj.status.warnings = {};
				(tmp&1) ? statusObj.status.warnings.Off = "Warning" : statusObj.status.warnings.Off = "OK";
				(tmp&(1<<1)) ? statusObj.status.warnings.Config_Variant_OOR = "Warning" : statusObj.status.warnings.Config_Variant_OOR = "OK";
			
				//Status Bitfield: (0: Clear, 1: Set, 0x07==Status is all good)
				tmp = parseInt(data[6]);
				statusObj.status.statusVal = tmp;
				statusObj.status.status = {PG_3V3:"",PG_3V3P:"",PG_VIN:""};

				(tmp&1) ? statusObj.status.status.PG_3V3 = "OK" : statusObj.status.status.PG_3V3 = "Alarm";
				(tmp&(1<<1)) ? statusObj.status.status.PG_3V3P = "OK" : statusObj.status.status.PG_3V3P = "Alarm";
				(tmp&(1<<2)) ? statusObj.status.status.PG_VIN = "OK" : statusObj.status.status.PG_VIN = "Alarm";
		
				tmp = parseInt(data[7]);
				statusObj.status.Temp = tmp + " deg C"; 

				statusObj.status.V_3V3 = (parseInt(data[9])<<8) + parseInt(data[8]);
				statusObj.status.V_3V3P = (parseInt(data[11])<<8) + parseInt(data[10]);
				statusObj.status.V_VIN = (parseInt(data[13])<<8) + parseInt(data[12]);
				statusObj.status.V_VOUT = (parseInt(data[15])<<8) + parseInt(data[14]);
				statusObj.status.IOUT = (parseInt(data[17])<<8) + parseInt(data[16]);

				moduleDataController.updateModuleConfig(statusObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.getBuildInfo)  //module build status. Contains build info
			{   	
				let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};

				if(parseInt(data[3]) === 0)	//index
				{
					[buildInfoObj.buildInfo.Barcode, buildInfoObj.buildInfo.Version, 
						buildInfoObj.buildInfo.SN, buildInfoObj.buildInfo.FW]  = getBuildInfo(data.slice(4));
				}

				moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.getConfig) 
			{
				let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};

				[buildInfoObj.buildInfo.Barcode, buildInfoObj.buildInfo.Version, 
					buildInfoObj.buildInfo.SN, buildInfoObj.buildInfo.FW]  = getBuildInfo(data.slice(3));

				(parseInt(data[28])===0x31) ? configObj.config.IsSupplyEnable = true : configObj.config.IsSupplyEnable = false;
				(parseInt(data[29])===0x31) ? configObj.config.IsPowerUpStateOutput = true : configObj.config.IsPowerUpStateOutput = false;
				(parseInt(data[30])===0x31) ? configObj.config.IsOverCurrentEn = true : configObj.config.IsOverCurrentEn = false;
				
				configObj.config.InrushTime = (parseInt(data[32])<<8) + parseInt(data[31]);

				moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status
				moduleDataController.updateModuleConfig(configObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.setSupplyEnable) 
			{		
				//Set Command Successful, use sent value to update local configuration
				//only update user view command, or config values. Status values polled regularly
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				configObj.config.IsSupplyEnable = (parseInt(setMsg[2])===0x31) ? true : false;
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				
				return [HttpCode.Accepted, ""];  
			}
			else if(msgId === CommandId.setPowerUpState) 
			{
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				configObj.config.IsPowerUpStateOutput = (parseInt(setMsg[2])===0x31) ? true : false;
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				
				return [HttpCode.Accepted, ""];    
			}
			else if(msgId === CommandId.setOCEnable) 
			{			
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				configObj.config.IsOverCurrentEn = (parseInt(setMsg[2])===0x31) ? true : false;
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setExtFanSpeed) 
			{
				//console.log("fan speed change accepted");
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setReportPaOnState) 
			{
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setClearAlarms) 
			{
				let refreshBuildInfo = [];
				refreshBuildInfo.push(unitId);	
				refreshBuildInfo.push(CommandId.getStatus);
				eskanProtocol.packAndQueue(refreshBuildInfo,0);
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setSoftReset) 
			{
				return [HttpCode.Accepted, ""];
			}
			else
			{
				console.log("Unknown Command Response Protection");
				console.log(data);
				return [HttpCode.UnprocessibleEntity, "Unknown Command Response Protection"];
			}
		}
		else
		{
			console.log("Unknown Ack Nack Response Protection");
			console.log(data);
			return [HttpCode.UnprocessibleEntity, "Unknown Ack Nack Response Protection"];
		}
	}catch(error)
	{
		console.log("Protection interface error");
		console.log(error);
	}
	return [HttpCode.RequestTimeout, "API Timeout"];
}

function getBuildInfo(data)
{
	tmp = data.slice(0, 10);	//take values and turn into string of ASCII
	Barcode = "";
	for(let i = 0; i < tmp.length; i++)
	{
		if(tmp[i] != 0)
		{
			Barcode += String.fromCharCode(tmp[i]);
		}
	}

	Version = parseInt((data[11]<<8)+data[10]);

	tmp = data.slice(12, 22);	//take values and turn into string of ASCII
	SN= "";
	for(let i = 0; i < tmp.length; i++)
	{
		if(tmp[i] != 0)
		{
			SN += String.fromCharCode(tmp[i]);
		}
	}

	FW = "" + data[22] + "." + data[23] + "." + data[24] + "";

	return [Barcode, Version, SN, FW];
}

function getNakResponse(data)
{
	let tmp = parseInt((data[4]<<8)+data[3]);

	for(let i = 0; i < ModErrCodes.length; i++)
	{

		if(tmp === ModErrCodes[i][0])
		{
			console.log("NAK message received");
			console.log(ModErrCodes[i][1]);
			return [HttpCode.UnprocessibleEntity, ModErrCodes[i][1]];
		}
	}

	//should not reach here. If error code not found, return unclarified error
	return [HttpCode.UnprocessibleEntity, ""];	
}

function isStatusCommand(unitId, msgId)
{
	if((msgId === CommandId.getStatus || msgId === CommandId.getBuildInfo || msgId === CommandId.getConfig) && 
	((ModuleIdRange.MIN <= unitId) && (unitId <= ModuleIdRange.MAX))) //status commands
	{
		return 1;
	}
	return 0;
}

function isModule(unitId)
{
	if((ModuleIdRange.MIN <= unitId) && (unitId <= ModuleIdRange.MAX)) //status commands
	{
		return 1;
	}
	return 0;
}

function inputChecks(message)
{
	let code = HttpCode.OK;
	let tmpErrMsg = "";
	if((typeof message === 'undefined') || (typeof message === null))
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Undefined";
	}
	if(typeof message.length < 1)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Required";
	}
	
	return [code, tmpErrMsg];
}

function uartCommsAlarm(message, state)
{
	let moduleId = message[1] - ModuleIdRange.MIN;
	if(state === ERROR)
	{
		moduleDataController.UpdateUartCommsAlarm("protection", moduleId, 1); 
	}
}

module.exports = { mapInitCommands, EskanToJson, isStatusCommand, isModule, pollCommands, powerupCommands, uartCommsAlarm, SetClearAlarms, SetSupplyEnable, SetOCEnable, SetPowerUpState, SetReportPaOnState, setExtFanSpeed,   //function exports
					ModuleIdRange }	//variable exports
					