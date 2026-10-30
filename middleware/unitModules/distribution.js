/*
	Based on document Distribution Protocol v0.0
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
    setPowerUpState: 0x89,
	getStatus: 0xA0,
	setClearAlarms: 0xA1,
	getBuildInfo: 0xB0,
	getConfig: 0xC0,
	setSoftReset: 0xE0
}

const ModuleIdRange = 
{
    MIN: 0x00,
    MAX: 0x00
}

//error codes, ensure they are numbered in sequence
const ModErrCodes = 
[
	[100, "Value OOR (Out of Range)"],
	[101, "EE_W, EE Write fail"],
	[102, "Not Allowed"],
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

//commands sent in eskan format will be returned in eskan format. 
//convert REST format request of type GET/POST/PUT/DELETE to Eskan format for PA commands
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
						// console.log("EskanToJson Status Low state distribution");
						statusObj.status.overallStatus = "Status Not OK";	
						break;
				}

				//Alarm Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[4]);
				statusObj.status.alarmsVal = tmp;
				statusObj.status.alarms = {};
				(tmp&1) ? statusObj.status.alarms.Over_Current = "FAULT" : statusObj.status.alarms.Over_Current = "OK";
				(tmp&(1<<1)) ? statusObj.status.alarms.Inter_Communication = "FAULT" : statusObj.status.alarms.Inter_Communication = "OK";
				(tmp&(1<<2)) ? statusObj.status.alarms.Low_Voltage = "FAULT" : statusObj.status.alarms.Low_Voltage = "OK";	

				//Warning Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[5]);
				statusObj.status.warningsVal = tmp;
				statusObj.status.warnings = {};
			
				//Status Bitfield: (0: Clear, 1: Set, 0x03==Status is all good)
				tmp = parseInt(data[6]);
				statusObj.status.DistriStatusVal = tmp;
				statusObj.status.DistriStatus = {PG_3V3:"",PG_3V3P:"",VIN:""};

				(tmp&1) ? statusObj.status.DistriStatus.PG_3V3 = "OK" : statusObj.status.DistriStatus.PG_3V3 = "Alarm";
				(tmp&(1<<1)) ? statusObj.status.DistriStatus.PG_3V3P = "OK" : statusObj.status.DistriStatus.PG_3V3P = "Alarm";
				(tmp&(1<<2)) ? statusObj.status.DistriStatus.VIN = "OK" : statusObj.status.DistriStatus.VIN = "Alarm";

				statusObj.status.V_3V3 = (parseInt(data[8])<<8) + parseInt(data[7]);
				statusObj.status.V_3V3P = (parseInt(data[10])<<8) + parseInt(data[9]);
				statusObj.status.VIN = (parseInt(data[12])<<8) + parseInt(data[11]);
				statusObj.status.VOUT = (parseInt(data[14])<<8) + parseInt(data[13]);
				statusObj.status.IOUT = (parseInt(data[16])<<8) + parseInt(data[15]);
				
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

				(parseInt(data[28])===0x31) ? configObj.config.distriIsSupplyEnable = true : configObj.config.distriSupplyEnable = false;
				(parseInt(data[29])===0x31) ? configObj.config.distriIsPowerUpStateOutput = true : configObj.config.distriPowerUpStateOutput = false;
				(parseInt(data[30])===0x31) ? configObj.config.distriIsOverCurrentEnable = true : configObj.config.distriOverCurrentEnable = false;

				moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status
				moduleDataController.updateModuleConfig(configObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.setSupplyEnable) 
			{
				//Set Command Successful, use sent value to update local configuration
				//only update user view command, or config values. Status values polled regularly
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				(parseInt(setMsg[2])===0x31) ? configObj.config.distriIsSupplyEnable = true : configObj.config.distriIsSupplyEnable = false;
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setPowerUpState) 
			{
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				(parseInt(setMsg[2])===0x31) ? configObj.config.distriIsPowerUpStateOutput = true : configObj.config.distriIsPowerUpStateOutput = false;
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				
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
				return [HttpCode.UnprocessibleEntity, "Unknown Command Response Distribution"];
			}
		}
		else
		{
			return [HttpCode.UnprocessibleEntity, "Unknown Ack Nack Response Distribution"];
		}
	}catch(error)
	{
		console.log("Distribution interface error");
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
		moduleDataController.UpdateUartCommsAlarm("distribution", moduleId, 1); 
	}
}

module.exports = { mapInitCommands, EskanToJson, isStatusCommand, isModule, pollCommands, uartCommsAlarm, SetClearAlarms, powerupCommands, //function exports
					ModuleIdRange }	//variable exports
					