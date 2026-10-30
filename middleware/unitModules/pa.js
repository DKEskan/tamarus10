/*
	Based on document PaCtl Protocol v0.0

	Data retrieved targetted for Tamarus Urgent units. v2.0.1
*/

const userDataController = require('../../controllers/userDataController');
const moduleDataController = require('../../controllers/moduleDataController');

const OK = 0;
const ERROR = null;

const firstLoad = [];

const MAX_POWER_LEVEL = 10;

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
    setOutputLevel: 0xC1,	//PA level 0 is same as poweroff
	getStatus: 0xA0,
	setClearAlarms: 0xA1,
	getBuildInfo: 0xB0,
	getConfig: 0xC0,
	setSoftReset: 0xE0
}

const ModuleIdRange = 
{
    MIN: 0x30,
    MAX: 0x3F
}

//error codes, ensure they are numbered in sequence
const ModErrCodes = 	//PA has no NAck responses
[
	[100, "Value OOR (Out of Range)"],
	[101, "EE_W, EE Write via I2C fail"],
	[102, "EE_R, EE Read via I2C fail"],
	[103, "Unknown Command"],
	[104, "Index OOR"],
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
	powerUpCommand.pop();

	if((unitId !== 0x30) || (unitId !== 0x31)) //Eskan values set to 12 on first load, invalid value. Botch to set to zero
	{
		powerUpCommand.push(CommandId.setOutputLevel);	
		powerUpCommand.push(0);
		eskanProtocol.packAndQueue(powerUpCommand,null);
	}
}

function pollCommands(unitId)
{
	const eskanProtocol = require('../eskanProtocol');

	let pollCommand = [];
	pollCommand.push(unitId);

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

//convert REST format request of type GET/POST/PUT/DELETE to Eskan format for PA commands

function SetOutputLevel(path, val, endPoint)
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
	
	let dataBytes = [];
	dataBytes = new ArrayBuffer(4);
	let power = 0;
	
	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "power")
		{
			if((tmp > MAX_POWER_LEVEL) || (tmp === ''))	//keep within boundaries.
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "Power Range Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			power = Number(tmp);
		}
	}
	if(power === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}

	// send to UART
	eskanMessage = [id, CommandId.setOutputLevel, power];

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
						// console.log("EskanToJson Status Low State pa");
						statusObj.status.overallStatus = "Status Not OK";	
						break;
				}

				//Alarm Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[4]);
				statusObj.status.alarmsVal = tmp;
				statusObj.status.alarms = {};
				(tmp&1) ? statusObj.status.alarms.Over_Temperature = "FAULT" : statusObj.status.alarms.Over_Temperature = "OK";
				(tmp&(1<<1)) ? statusObj.status.alarms.PA_Communication = "FAULT" : statusObj.status.alarms.PA_Communication = "OK";
				(tmp&(1<<2)) ? statusObj.status.alarms.PA_Output_Power_Low = "FAULT" : statusObj.status.alarms.PA_Output_Power_Low = "OK";
				(tmp&(1<<3)) ? statusObj.status.alarms.PA_High_Gate_Voltage = "FAULT" : statusObj.status.alarms.PA_High_Gate_Voltage = "OK";
				(tmp&(1<<4)) ? statusObj.status.alarms.PA_High_Drain_Current = "FAULT" : statusObj.status.alarms.PA_High_Drain_Current = "OK";
				(tmp&(1<<5)) ? statusObj.status.alarms.PA_Initialisation = "FAULT" : statusObj.status.alarms.PA_Initialisation = "OK";
				(tmp&(1<<6)) ? statusObj.status.alarms.Antenna_Connection  = "FAULT" : statusObj.status.alarms.Antenna_Connection = "OK";
				(tmp&(1<<7)) ? statusObj.status.alarms.Over_Current  = "FAULT" : statusObj.status.alarms.Over_Current = "OK";

				//Warning Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[5]);
				statusObj.status.warningsVal = tmp;
				statusObj.status.warnings = {};
				(tmp&1) ? statusObj.status.warnings.Power_Reduction_Due_To_Temperature = "Warning" : statusObj.status.warnings.Power_Reduction_Due_To_Temperature = "OK";
				(tmp&(1<<1)) ? statusObj.status.warnings.PA_OFF = "Warning" : statusObj.status.warnings.PA_OFF = "OK";
			
				//Status Bitfield: (0: Clear, 1: Set, 0x03==Status is all good)
				tmp = parseInt(data[6]);
				statusObj.status.PaStatusVal = tmp;
				statusObj.status.PaStatus = {PG_3V3:"",PG_5V:"",PG_VIN:""};
				(tmp&1) ? statusObj.status.PaStatus.PG_3V3 = "OK" : statusObj.status.PaStatus.PG_3V3 = "Alarm";
				(tmp&(1<<1)) ? statusObj.status.PaStatus.PG_5V = "OK" : statusObj.status.PaStatus.PG_5V = "Alarm";
				(tmp&(1<<2)) ? statusObj.status.PaStatus.PG_VIN = "OK" : statusObj.status.PaStatus.PG_VIN = "Alarm";
		
				tmp = parseInt(data[7]);
				statusObj.status.PaTemp = tmp + " deg C"; 

				statusObj.status.OutputLevelControl = parseInt(data[8]); 

				switch(parseInt(data[16])) 
				{
					case 0:
						statusObj.status.TxState = "OFF";
						break;
					case 1: 
						statusObj.status.TxState = "IQ";
						break;
					case 6: 
						statusObj.status.TxState = "TX";
						break;
					default:
						statusObj.status.TxState = "Unknown";
						break;
				}

				moduleDataController.updateModuleConfig(statusObj); //update local file with status

				//build data to store for user
				let rfPath = (unitId - ModuleIdRange.MIN);
				let paPowerObj = {"RadioFrequencyPath":[]};
				paPowerObj.RadioFrequencyPath[rfPath] = {"Temperature": parseInt(data[7])};
				userDataController.updateUserConfig(paPowerObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.getBuildInfo)  //module build status. Contains build info
			{   	
				let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};

				if(parseInt(data[3]) === 0)	//index for PA Controller
				{
					[buildInfoObj.buildInfo.PaControllerBarcode, buildInfoObj.buildInfo.PaControllerVersion, 
						buildInfoObj.buildInfo.PaControllerSN, buildInfoObj.buildInfo.PaControllerFW]  = getBuildInfo(data.slice(4));
				}
				if(parseInt(data[3]) === 1)	//index for PA
				{
					[buildInfoObj.buildInfo.PaBarcode, buildInfoObj.buildInfo.PaVersion, 
						buildInfoObj.buildInfo.PaSN, buildInfoObj.buildInfo.PaFW]  = getBuildInfo(data.slice(4));
				}

				moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.getConfig) 
			{
				let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};

				[buildInfoObj.buildInfo.PaControllerBarcode, buildInfoObj.buildInfo.PaControllerVersion, 
					buildInfoObj.buildInfo.PaControllerSN, buildInfoObj.buildInfo.PaControllerFW]  = getBuildInfo(data.slice(3));

				[buildInfoObj.buildInfo.PaBarcode, buildInfoObj.buildInfo.PaVersion, 
					buildInfoObj.buildInfo.PaSN, buildInfoObj.buildInfo.PaFW]  = getBuildInfo(data.slice(28));
				
				configObj.config.OutputLevel = parseInt(data[50]);
				configObj.config.SetRfLevel = parseInt(data[51]);

				if((unitId === 0x30) || (unitId === 0x31))	//aber PAs display temperature limit here, no value for standard. Do a check to avoid errors of wrong data
				{
					configObj.config.tempAlarmThresh = parseInt(data[52]);
				}
		
				moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.setOutputLevel) 
			{			
				//Set Command Successful, use sent value to update local configuration
				//only update user view command, or config values. Status values polled regularly
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				configObj.config.SetRfLevel = parseInt(setMsg[2]);
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				
				let refreshInfo = [];
				refreshInfo.push(unitId);	
				refreshInfo.push(CommandId.getStatus);

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
				console.log("Unknown Command Response PA");
				console.log(data);
				return [HttpCode.UnprocessibleEntity, "Unknown Command Response PA"];
			}
		}
		else
		{
			console.log("Unknown Ack Nack Response PA");
			console.log(data);
			return [HttpCode.UnprocessibleEntity, "Unknown Ack Nack Response PA"];
		}
	}catch(error)
	{
		console.log("PA interface error");
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
		moduleDataController.UpdateUartCommsAlarm("pa", moduleId, 1); 
	}
}

module.exports = { mapInitCommands, EskanToJson, isStatusCommand, isModule, pollCommands, SetOutputLevel, uartCommsAlarm, SetClearAlarms, powerupCommands, //function exports
					ModuleIdRange }	//variable exports