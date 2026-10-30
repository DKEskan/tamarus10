/*
	Based on document Cu Interface Protocol EODF0061PD-V3
*/

const userDataController = require('../../controllers/userDataController');
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
	setInaEnableState: 0x65,
    setAlertState: 0x82,
	setTxLed: 0x83,
	getStatus: 0xA0,
	setClearAlarms: 0xA1,
	setUnitId: 0xA5,
	getBuildInfo: 0xB0,
	getConfig: 0xC0,
	setSoftReset: 0xE0
}

const ModuleIdRange = 
{
    MIN: 0x50,
    MAX: 0x50
}

//error codes, ensure they are numbered in sequence
const ModErrCodes = 
[
	[100, "Value OOR (Out of Range)"],
	[101, "EE Write Error"],
	[102, "EE Read Error"],
	[124, "Unknown command"],
	[125, "Index OOR"]
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

	powerUpCommand.push(CommandId.getStatus);
	eskanProtocol.packAndQueue(powerUpCommand,0);
}

function pollCommands(unitId)
{
	const eskanProtocol = require('../eskanProtocol');

	let pollCommand = [];
	pollCommand.push(unitId);

	//get config carried out on power up command, repeat not necessary 

	// if (firstLoad.indexOf(unitId) === -1)	//if unitId not already loaded
	// {
	// 	pollCommand.push(CommandId.getConfig);
	// 	eskanProtocol.packAndQueue(pollCommand,0);
	// 	pollCommand.pop();
	// 	firstLoad.push(unitId);
	// }
	
    pollCommand.push(CommandId.getStatus);
    eskanProtocol.packAndQueue(pollCommand,0);
}

//commands sent in eskan format will be returned in eskan format. 

//convert REST format request of type GET/POST/PUT/DELETE to Eskan format

function SetAlertState(path, val, endPoint) //turn on LED and buzzer
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

	let Alert;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "IsAlertState")
		{		
			if(tmp !== "on" && tmp !== "off" && tmp !== "pulse")
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "AlertState Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			Alert = tmp;
		}
	}
	
	if(Alert === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}
	
	if(Alert === "on")
	{
		eskanMessage = [id, CommandId.setAlertState, 0x32];	//On
	}
	else if(Alert === "pulse")
	{
		eskanMessage = [id, CommandId.setAlertState, 0x31];	//Pulse
	}
	else
	{
		eskanMessage = [id, CommandId.setAlertState, 0x30];	//Disable
	}

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

function SetINA3000State(path, val, endPoint)   //turn on INA 
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

	let INA;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "IsINAStateOn")
		{		
			if(typeof tmp !== "boolean")
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "INAStateOn Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			INA = tmp;
		}
	}
	
	if(INA === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}
	
	if(INA === true)
	{
		eskanMessage = [id, CommandId.setInaEnableState, 0x31];	//Enable
	}
	else
	{
		eskanMessage = [id, CommandId.setInaEnableState, 0x30];	//Disable
	}

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

function SetTxLedState(path, val, endPoint)   //turn on internal fans
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

	let LED;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "IsTxLedOn")
		{		
			if(typeof tmp !== "boolean")
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "TxLedOn Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			LED = tmp;
		}
	}
	
	if(LED === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}
	
	if(LED === true)
	{
		eskanMessage = [id, CommandId.setTxLed, 0x31];	//Enable
	}
	else
	{
		eskanMessage = [id, CommandId.setTxLed, 0x30];	//Disable
	}

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

function setUnitId(val, endPoint)   //turn on internal fans
{
    const eskanProtocol = require('../eskanProtocol');

	let code = HttpCode.OK;
	let tmpErrMsg = "";
	let tmp = -1;
	let id = 0xFF;

	let valid = inputChecks(val);
	code = valid[0];
	tmpErrMsg = valid[1];
	if(code >= HttpCode.BadRequest)	//failed input checks
	{
		return [ERROR, code, tmpErrMsg];
	}

	let newId;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "UnitId")
		{		
			if(tmp > 254)
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "Unit ID Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			newId = tmp;
		}
	}
	
	if(newId === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}

	eskanMessage = [id, CommandId.setUnitId, newId];	//Enable

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
		let view = (new DataView(new ArrayBuffer(2)));  //set up data view with array buffer
		
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
						// console.log("EskanToJson Status Low state CU Interface");
						statusObj.status.overallStatus = "Status Not OK";
						break;
				}

				//Alarm Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[4]);
				statusObj.status.alarmsVal = tmp;
				statusObj.status.alarms = {};
				(tmp&1) ? statusObj.status.alarms.Over_Current = "FAULT" : statusObj.status.alarms.Over_Current = "OK";
				(tmp&(1<<1)) ? statusObj.status.alarms.Control_Interface_Comms = "FAULT" : statusObj.status.alarms.Control_Interface_Comms = "OK";

				//Warning Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[5]);
				statusObj.status.warningsVal = tmp;
				statusObj.status.warnings = {};
				(tmp&1) ? statusObj.status.warnings.TX_Off = "Warning" : statusObj.status.warnings.TX_Off = "OK";
				(tmp&(1<<1)) ? statusObj.status.warnings.Test_Mode = "Warning" : statusObj.status.warnings.Test_Mode = "OK";
			
				//Status Bitfield: (0: Clear, 1: Set, 0x1F==Status is all good)
				tmp = parseInt(data[6]);
				statusObj.status.statusVal = tmp;
				statusObj.status.status = {PG_3V3:"",PG_3V3P:"",PG_VIN:"",PG_VIN_PROTECTED:""};
				(tmp&1) ? statusObj.status.status.PG_3V3 = "OK" : statusObj.status.status.PG_3V3 = "Alarm";
				(tmp&(1<<1)) ? statusObj.status.status.PG_3V3P = "OK" : statusObj.status.status.PG_3V3P = "Alarm";
				(tmp&(1<<2)) ? statusObj.status.status.PG_VIN = "OK" : statusObj.status.status.PG_VIN = "Alarm";
				(tmp&(1<<3)) ? statusObj.status.status.PG_VIN_PROTECTED = "OK" : statusObj.status.status.PG_VIN_PROTECTED = "Alarm";

				tmp = parseInt(data[7]);
				statusObj.status.temp = tmp + " deg C"; 

				statusObj.status.V_3V3 = (parseInt(data[9])<<8) + parseInt(data[8]);
				statusObj.status.V_3V3P = (parseInt(data[11])<<8) + parseInt(data[10]);
				statusObj.status.V_VIN = (parseInt(data[13])<<8) + parseInt(data[12]);
				statusObj.status.V_VIN_PROTECTED = (parseInt(data[15])<<8) + parseInt(data[14]);

				statusObj.status.PowerSwitch = (parseInt(data[16])===0x31) ? true : false;

				moduleDataController.updateModuleConfig(statusObj); //update local file with status

				/*
					battery state now moved to power PCB
				*/
				//build data to store for user
				let powerSwitchObj = {"IsUnitOn":false};
				powerSwitchObj.IsUnitOn = statusObj.status.PowerSwitch;
				userDataController.updateUserConfig(powerSwitchObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.getBuildInfo)  //module build status. Contains build info
			{   	
				let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};

				if(parseInt(data[3]) === 0)	//index for main board
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
					buildInfoObj.buildInfo.SN, buildInfoObj.buildInfo.FW] = getBuildInfo(data.slice(3));

				if(parseInt(data[28]) === 0x30)
				{
					configObj.config.Alert = "off";
				}
				else if(parseInt(data[28]) === 0x31)
				{
					configObj.config.Alert = "pulse";
				}
				else if(parseInt(data[28]) === 0x32)
				{
					configObj.config.Alert = "on";
				}
				else
				{
					console.log("unexpected alert state response")
				}
				configObj.config.INA300Enable = (parseInt(data[29]) === 0x31)? "Enabled" : "Disabled";
		
				moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status
				moduleDataController.updateModuleConfig(configObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.setAlertState) 
			{		
				try
				{	
					let configObj = {"address": "0x" + unitId.toString(16), "config":{}};

					if(parseInt(setMsg[2]) === 0x30)
					{
						configObj.config.Alert = "off";
					}
					else if(parseInt(setMsg[2]) === 0x31)
					{
						configObj.config.Alert = "pulse";
					}
					else if(parseInt(setMsg[2]) === 0x32)
					{
						configObj.config.Alert = "on";
					}
					else
					{
						console.log("unexpected alert state response")
					}
						
					moduleDataController.updateModuleConfig(configObj); //update local file with status
				}
				catch(error)
				{
					console.log("Error in CU Interface return data for setAlertState. If SetMsg === undefined, likely API timeout");
					console.log(error);
				}
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setInaEnableState) 
			{			
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				configObj.config.INA300Enable = (parseInt(setMsg[2]) === 0x31)? "Enabled" : "Disabled";
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setTxLed) 
			{			
				//build data to store for user
				let TxLedState = {"IsTxButtonOn":false};
				TxLedState.IsTxButtonOn = (parseInt(setMsg[2]) === 0x31)? true : false;
				
				userDataController.updateUserConfig(TxLedState); //update local file with status

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
				console.log("Unknown Command Response CU Interface");
				console.log(data);
				return [HttpCode.UnprocessibleEntity, "Unknown Command Response CU Interface"];
			}
		}
		else
		{
			console.log("Unknown Ack Nack Response CU Interface");
			console.log(data);
			return [HttpCode.UnprocessibleEntity, "Unknown Ack Nack Response CU Interface"];
		}
	}
	catch(error)
	{
		console.log("Error in CU Interface return data. If SetMsg === undefined, likely API timeout");
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
		moduleDataController.UpdateUartCommsAlarm("cuInterface", moduleId, 1); 
	}
}

module.exports = { mapInitCommands, EskanToJson, isStatusCommand, isModule, pollCommands,
					SetAlertState, uartCommsAlarm, SetClearAlarms, SetTxLedState, setUnitId, SetINA3000State, powerupCommands, //function exports
					ModuleIdRange }	//variable exports