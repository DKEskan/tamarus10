/*
	Based on document CU Power Protocol EOPF0015AA-V0.2
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
	getStatus: 0xA0,
	setClearAlarms: 0xA1,
	getBuildInfo: 0xB0,
	setBarcode: 0xB1,
	setVersion: 0xB2,
	setSerialNumber: 0xB3,
	getConfig: 0xC0,
	setSoftReset: 0xE0
}

const ModuleIdRange = 
{
    MIN: 0x05,
    MAX: 0x05
}

//error codes, ensure they are numbered in sequence
const ModErrCodes = 
[
	[100, "Value OOR (Out of Range)"],
	[101, "EE_W, EE Write via I2C fail"],
    [102, "EE_R, EE Read via I2C fail"],
	[103, "PWM Fail"],
	[104, "Unknown Command"],
    [105, "Index OOR"]
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
//convert REST format request of type GET/POST/PUT/DELETE to Eskan format for commands
function SetClearAlarms(moduleId, endPoint)
{
	const eskanProtocol = require('../eskanProtocol');

	// send to UART
	eskanMessage = [moduleId, CommandId.setClearAlarms];

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

function SetBarcode(moduleId, val, endPoint)
{
	const eskanProtocol = require('../eskanProtocol');

	let code = HttpCode.OK;
	let tmpErrMsg = "";
	let tmp = -1;

	let valid = inputChecks(val);
	code = valid[0];
	tmpErrMsg = valid[1];
	if(code >= HttpCode.BadRequest)	//failed input checks
	{
		return [ERROR, code, tmpErrMsg];
	}

	let index, barcode;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "Index")
		{		
			if(tmp > 1)
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "Index Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			index = tmp;
		}
		else if(key === "Barcode")
		{		
			if(tmp.length !== 10)
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "Barcode Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			barcode = tmp;
		}
	}
	
	if((index === undefined) || (barcode === undefined))
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}

	eskanMessage = [moduleId, CommandId.setBarcode, index];
	
	eskanMessage = eskanMessage.concat(barcode);

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

function SetSerialNumber(moduleId, val, endPoint)
{
	const eskanProtocol = require('../eskanProtocol');

	let code = HttpCode.OK;
	let tmpErrMsg = "";
	let tmp = -1;

	let valid = inputChecks(val);
	code = valid[0];
	tmpErrMsg = valid[1];
	if(code >= HttpCode.BadRequest)	//failed input checks
	{
		return [ERROR, code, tmpErrMsg];
	}

	let index, serialNumber;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "Index")
		{		
			if(tmp > 1)
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "Index Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			index = tmp;
		}
		else if(key === "SerialNumber")
		{		
			if(tmp.length !== 10)
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "SerialNumber Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			serialNumber = tmp;
		}
	}
	
	if((index === undefined) || (serialNumber === undefined))
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}

	eskanMessage = [moduleId, CommandId.setSerialNumber, index];

	eskanMessage = eskanMessage.concat(serialNumber);

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

function SetVersion(moduleId, val, endPoint)
{
	const eskanProtocol = require('../eskanProtocol');

	let code = HttpCode.OK;
	let tmpErrMsg = "";
	let tmp = -1;

	let valid = inputChecks(val);
	code = valid[0];
	tmpErrMsg = valid[1];
	if(code >= HttpCode.BadRequest)	//failed input checks
	{
		return [ERROR, code, tmpErrMsg];
	}

	let index, version;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "Index")
		{		
			if(tmp > 1)
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "Index Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			index = tmp;
		}
		else if(key === "Version")
		{		
			if(tmp > 999)
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "Version Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			version = tmp;
		}
	}
	
	if((index === undefined) || (version === undefined))
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}

	let dataBytes = [];
	dataBytes = new ArrayBuffer(2);
	let view = new DataView(dataBytes);
	view.setUint16(0,version,true);

	eskanMessage = [moduleId, CommandId.setVersion, index, view.getUint8(0), view.getUint8(1)];

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
						// console.log("EskanToJson Status Low state CU Power");
						statusObj.status.overallStatus = "Status Not OK";	
						break;
				}

				//Alarm Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[4]);
				statusObj.status.alarmsVal = tmp;
				statusObj.status.alarms = {};
				(tmp&1) ? statusObj.status.alarms.Memory_Communication = "FAULT" : statusObj.status.alarms.Memory_Communication = "OK";
				(tmp&(1<<1)) ? statusObj.status.alarms.Over_Temperature = "FAULT" : statusObj.status.alarms.Over_Temperature = "OK";
				(tmp&(1<<2)) ? statusObj.status.alarms.Barcode_Unknown = "FAULT" : statusObj.status.alarms.Barcode_Unknown = "OK";	

				//Warning Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[5]);
				statusObj.status.warningsVal = tmp;
				statusObj.status.warnings = {};
				(tmp&1) ? statusObj.status.warnings.Cu_Shutting_Down = "Warning" : statusObj.status.warnings.Cu_Shutting_Down = "OK";
				(tmp&(1<<1)) ? statusObj.status.warnings.Cu_Restarting = "Warning" : statusObj.status.warnings.Cu_Restarting = "OK";
				(tmp&(1<<2)) ? statusObj.status.warnings.IWDG_restart = "Warning" : statusObj.status.warnings.IWDG_restart = "OK";
			
				//Status Bitfield: (0: Clear, 1: Set, 0x3F==Status is all good)
				tmp = parseInt(data[6]);
				statusObj.status.CuPowerStatusVal = tmp;
				statusObj.status.CuPowerStatus = {PG_VIN:"",PG_5V:"",PG_3V3:"",PG_3V3P:"",PG_3V3_CU_Supply:""};

				(tmp&1) ? statusObj.status.CuPowerStatus.PG_VIN = "OK" : statusObj.status.CuPowerStatus.PG_VIN = "Alarm";
				(tmp&(1<<1)) ? statusObj.status.CuPowerStatus.PG_5V = "OK" : statusObj.status.CuPowerStatus.PG_5V = "Alarm";
				(tmp&(1<<2)) ? statusObj.status.CuPowerStatus.PG_3V3 = "OK" : statusObj.status.CuPowerStatus.PG_3V3 = "Alarm";
				(tmp&(1<<3)) ? statusObj.status.CuPowerStatus.PG_3V3P = "OK" : statusObj.status.CuPowerStatus.PG_3V3P = "Alarm";
				(tmp&(1<<4)) ? statusObj.status.CuPowerStatus.PG_3V3_CU_Supply = "OK" : statusObj.status.CuPowerStatus.PG_3V3_CU_Supply = "Alarm";
		
				tmp = parseInt(data[7]);
				statusObj.status.CuPowerTemp = tmp + " deg C"; 
				statusObj.status.V_VIN = (parseInt(data[9])<<8) + parseInt(data[8]);
				statusObj.status.V_5V = (parseInt(data[11])<<8) + parseInt(data[10]);
				statusObj.status.V_3V3 = (parseInt(data[13])<<8) + parseInt(data[12]);
				statusObj.status.V_3V3P = (parseInt(data[15])<<8) + parseInt(data[14]);
				statusObj.status.V_3V3_CU_Supply = (parseInt(data[17])<<8) + parseInt(data[16]);
				statusObj.status.I_OUT = (parseInt(data[19])<<8) + parseInt(data[18]);
				
				moduleDataController.updateModuleConfig(statusObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.getBuildInfo)  //module build status. Contains build info
			{   	
				let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};

				if(parseInt(data[3]) === 0)	//PCB
				{
					[buildInfoObj.buildInfo.PcbBarcode, buildInfoObj.buildInfo.PcbVersion, 
						buildInfoObj.buildInfo.PcbSerialNumber, buildInfoObj.buildInfo.PcbFirmware]  = getBuildInfo(data.slice(4));
				}
				else if(parseInt(data[3]) === 1)	//system
				{
					[buildInfoObj.buildInfo.Barcode, buildInfoObj.buildInfo.Version, 
						buildInfoObj.buildInfo.SerialNumber, buildInfoObj.buildInfo.Software]  = getBuildInfo(data.slice(4));
				}

				moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.getConfig) 
			{
				let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};

				[buildInfoObj.buildInfo.PcbBarcode, buildInfoObj.buildInfo.PcbVersion, 
					buildInfoObj.buildInfo.PcbSerialNumber, buildInfoObj.buildInfo.PcbFirmware]   = getBuildInfo(data.slice(3));

				[buildInfoObj.buildInfo.Barcode, buildInfoObj.buildInfo.Version, 
					buildInfoObj.buildInfo.SerialNumber]  = getBuildInfo(data.slice(28));

				configObj.config.CuPowerTempAlarmThresh = parseInt(data[53]);

				configObj.config.CuPowerPwmOutputEn = parseInt(data[54]);
				configObj.config.CuPowerPwmDuty= parseInt(data[55]);
				configObj.config.CuPowerPwmFreqHz= (parseInt(data[59])<<24) + (parseInt(data[58])<<16) + (parseInt(data[57])<<8) + parseInt(data[56]);

				configObj.config.CuPowerSlowShutoffTime = (parseInt(data[61])<<8) + parseInt(data[60]);

				moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				
				let CuCarrierObj = {"buildInfo":{}};
				CuCarrierObj.buildInfo = buildInfoObj.buildInfo;
				moduleDataController.updateCarrierConfig(CuCarrierObj); 	

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.setClearAlarms) 
			{
				let refreshBuildInfo = [];
				refreshBuildInfo.push(unitId);	
				refreshBuildInfo.push(CommandId.getStatus);
				eskanProtocol.packAndQueue(refreshBuildInfo,0);
				
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setBarcode) //internal command only, get from unit again to avoid further processsing code.
			{
				let refreshBuildInfo = [];
				refreshBuildInfo.push(unitId);	
				refreshBuildInfo.push(CommandId.getConfig);
				eskanProtocol.packAndQueue(refreshBuildInfo,0);
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setSerialNumber) //internal command only, get from unit again to avoid further processsing code.
			{
				let refreshBuildInfo = [];
				refreshBuildInfo.push(unitId);	
				refreshBuildInfo.push(CommandId.getConfig);
				eskanProtocol.packAndQueue(refreshBuildInfo,0);
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setVersion) //internal command only, get from unit again to avoid further processsing code.
			{
				let refreshBuildInfo = [];
				refreshBuildInfo.push(unitId);	
				refreshBuildInfo.push(CommandId.getConfig);
				eskanProtocol.packAndQueue(refreshBuildInfo,0);

				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setSoftReset) 
			{
				return [HttpCode.Accepted, ""];
			}
			else
			{
				console.log("Unknown Command Response CU Power");
				console.log(data);
				return [HttpCode.UnprocessibleEntity, "Unknown Command Response CU Power"];
			}
		}
		else
		{
			console.log("Unknown Ack Nack Response CU Power");
			console.log(data);
			return [HttpCode.UnprocessibleEntity, "Unknown Ack Nack Response CU Power"];
		}
	}catch(error)
	{
		console.log("CU Power interface error");
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
		moduleDataController.UpdateUartCommsAlarm("CuPower", moduleId, 1); 
	}
}

module.exports = { mapInitCommands, EskanToJson, isStatusCommand, isModule, pollCommands, uartCommsAlarm, SetClearAlarms, powerupCommands, SetBarcode, SetSerialNumber, SetVersion,  //function exports
					ModuleIdRange }	//variable exports
					