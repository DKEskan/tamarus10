/*
	Based on document Power PCB Interface Protocol EOPF0017PD-V1
*/

const userDataController = require('../../controllers/userDataController');
const moduleDataController = require('../../controllers/moduleDataController');
const { el } = require('date-fns/locale');

const OK = 0;
const ERROR = null;

const firstLoad = [];
let commsTimeoutCount = 0;

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
    setInternalFanState: 0x87,
	getStatus: 0xA0,
	setClearAlarms: 0xA1,
	setUnitId: 0xA5,
	getBuildInfo: 0xB0,
	getConfig: 0xC0,
	setSoftReset: 0xE0
}

const ModuleIdRange = 
{
    MIN: 0x60,
    MAX: 0x60
}

//error codes, ensure they are numbered in sequence
const ModErrCodes = 
[
	[100, "Value OOR (Out of Range)"],
	[101, "EE_W, EE Write fail"],
	[102, "EE_R, EE Read fail"],
	[124, "Unknown Command"],
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
	pollCommand.push(CommandId.getStatus);
    eskanProtocol.packAndQueue(pollCommand,0);
}

//commands sent in eskan format will be returned in eskan format. 

//convert REST format request of type GET/POST/PUT/DELETE to Eskan format

function SetInternalFanState(path, val, endPoint)   //turn on internal fans
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

	let Fan;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if(key === "IsFanStateOn")
		{		
			if(typeof tmp !== "boolean")
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "FanStateOn Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			Fan = tmp;
		}
	}
	
	if(Fan === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}
	
	if(Fan === true)
	{
		eskanMessage = [id, CommandId.setInternalFanState, 0x31];	//Enable
	}
	else
	{
		eskanMessage = [id, CommandId.setInternalFanState, 0x30];	//Disable
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
		commsTimeoutCount = 0;

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
						// console.log("EskanToJson Status Low state Power PCB");
						statusObj.status.overallStatus = "Status Not OK";
						break;
				}

				//Alarm Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[4]);
				statusObj.status.alarmsVal = tmp;
				statusObj.status.alarms = {};
				(tmp&1) ? statusObj.status.alarms.Over_Current = "FAULT" : statusObj.status.alarms.Over_Current = "OK";
				(tmp&(1<<1)) ? statusObj.status.alarms.Power_Comms = "FAULT" : statusObj.status.alarms.Power_Comms = "OK";
				
				//moved to bottom of function for comparisons
				// (tmp&(1<<2)) ? statusObj.status.alarms.Flat_Battery = "FAULT" : statusObj.status.alarms.Flat_Battery = "OK";

				//Warning Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[5]);
				statusObj.status.warningsVal = tmp;
				statusObj.status.warnings = {};
				(tmp&1) ? statusObj.status.warnings.TX_Off = "Warning" : statusObj.status.warnings.TX_Off = "OK";
				(tmp&(1<<1)) ? statusObj.status.warnings.Low_Battery_1 = "Warning" : statusObj.status.warnings.Low_Battery_1 = "OK";
				(tmp&(1<<2)) ? statusObj.status.warnings.Low_Battery_2 = "Warning" : statusObj.status.warnings.Low_Battery_2 = "OK";
				(tmp&(1<<3)) ? statusObj.status.warnings.Low_Battery_3 = "Warning" : statusObj.status.warnings.Low_Battery_3 = "OK";
				(tmp&(1<<4)) ? statusObj.status.warnings.Test_Mode = "Warning" : statusObj.status.warnings.Test_Mode = "OK";

				//Status Bitfield: (0: Clear, 1: Set, 0x1F==Status is all good)
				tmp = parseInt(data[6]);
				statusObj.status.statusVal = tmp;
				statusObj.status.status = {PG_3V3:"",PG_3V3P:"",PG_VIN:"",PG_VIN_PROTECTED:"",PG_BATTERY_VOLTS:""};
				(tmp&1) ? statusObj.status.status.PG_3V3 = "OK" : statusObj.status.status.PG_3V3 = "Alarm";
				(tmp&(1<<1)) ? statusObj.status.status.PG_3V3P = "OK" : statusObj.status.status.PG_3V3P = "Alarm";
				(tmp&(1<<2)) ? statusObj.status.status.PG_VIN = "OK" : statusObj.status.status.PG_VIN = "Alarm";
				(tmp&(1<<3)) ? statusObj.status.status.PG_VIN_PROTECTED = "OK" : statusObj.status.status.PG_VIN_PROTECTED = "Alarm";
				(tmp&(1<<4)) ? statusObj.status.status.PG_BATTERY_VOLTS = "OK" : statusObj.status.status.PG_BATTERY_VOLTS = "Alarm";
		
				tmp = parseInt(data[7]);
				statusObj.status.temp = tmp + " deg C"; 
				
				statusObj.status.V_3V3 = (parseInt(data[9])<<8) + parseInt(data[8]);
				statusObj.status.V_3V3P = (parseInt(data[11])<<8) + parseInt(data[10]);
				index = 12;	//assuming data layout after this may change

				statusObj.status.V_BAT1 = (parseInt(data[index+1])<<8) + parseInt(data[index]);
				index+=2;
				statusObj.status.V_BAT2 = (parseInt(data[index+1])<<8) + parseInt(data[index]);
				index+=2;
				statusObj.status.V_BAT3 = (parseInt(data[index+1])<<8) + parseInt(data[index]);
				index+=2;
				statusObj.status.V_EXT = (parseInt(data[index+1])<<8) + parseInt(data[index]);
				index+=2;
				statusObj.status.V_PWR = (parseInt(data[index+1])<<8) + parseInt(data[index]);
				index+=2;
				statusObj.status.V_OUT = (parseInt(data[index+1])<<8) + parseInt(data[index]);
				index+=2;
				
				statusObj.status.BAT1_CHRG_STATE = getChargeState(parseInt(data[index++]));
				statusObj.status.BAT1_CHRG_CYCLE_STATE = getCycleState(parseInt(data[index++]));

				statusObj.status.BAT2_CHRG_STATE = getChargeState(parseInt(data[index++]));
				statusObj.status.BAT2_CHRG_CYCLE_STATE = getCycleState(parseInt(data[index++]));

				statusObj.status.BAT3_CHRG_STATE = getChargeState(parseInt(data[index++]));
				statusObj.status.BAT3_CHRG_CYCLE_STATE = getCycleState(parseInt(data[index++]));

				statusObj.status.PowerSource = (parseInt(data[index++]) === 0x31)? "EXT24V" : "BAT";

				//Battery 1
				statusObj.status.Battery1Present = (parseInt(data[index++])===0x31) ? true : false;

				tmp = (parseInt(data[index])<<8) + parseInt(data[index+1]);
				view.setInt16(0,tmp,true);  //insert the values into the buffer and display as signed int 16
				statusObj.status.Battery1ChargingCurrent = view.getInt16(); //insert signed int 16
				index+=2;
				
				statusObj.status.Battery1TotalVoltage = (parseInt(data[index+1])<<8) + parseInt(data[index]);
				index+=2;
				statusObj.status.Battery1RemainingCapacity = (parseInt(data[index+1])<<8) + parseInt(data[index])*10;
				index+=2;
				statusObj.status.Battery1TotalCapacity = (parseInt(data[index+1])<<8) + parseInt(data[index])*10;
				index+=2;
				statusObj.status.Battery1Soc = parseInt(data[index++]);

				//Battery 2
				statusObj.status.Battery2Present = (parseInt(data[index++])===0x31) ? true : false;

				tmp = (parseInt(data[index])<<8) + parseInt(data[index+1]);
				view.setInt16(0,tmp,true); 
				statusObj.status.Battery2ChargingCurrent = view.getInt16(); 
				index+=2;

				statusObj.status.Battery2TotalVoltage = (parseInt(data[index+1])<<8) + parseInt(data[index]);
				index+=2;
				statusObj.status.Battery2RemainingCapacity = (parseInt(data[index+1])<<8) + parseInt(data[index])*10;
				index+=2;
				statusObj.status.Battery2TotalCapacity = (parseInt(data[index+1])<<8) + parseInt(data[index])*10;
				index+=2;
				statusObj.status.Battery2Soc = parseInt(data[index++]);

				//Battery 3
				statusObj.status.Battery3Present = (parseInt(data[index++])===0x31) ? true : false;

				tmp = (parseInt(data[index])<<8) + parseInt(data[index+1]);
				view.setInt16(0,tmp,true); 
				statusObj.status.Battery3ChargingCurrent = view.getInt16(); 
				index+=2;

				statusObj.status.Battery3TotalVoltage = (parseInt(data[index+1])<<8) + parseInt(data[index]);
				index+=2;
				statusObj.status.Battery3RemainingCapacity = (parseInt(data[index+1])<<8) + parseInt(data[index])*10;
				index+=2;
				statusObj.status.Battery3TotalCapacity = (parseInt(data[index+1])<<8) + parseInt(data[index])*10;
				index+=2;
				statusObj.status.Battery3Soc = parseInt(data[index++]);
				
				tmp = parseInt(data[index++]);
				statusObj.status.ChargerInitBitfield = tmp;
				switch(tmp)
				{
					case 0b001 : 
						statusObj.status.ChargerInitStatus = "CHRG 1 Initialised";	
						break;
					case 0b010 :
						statusObj.status.ChargerInitStatus = "CHRG 2 Initialised";
						break;
					case 0b100 :
						statusObj.status.ChargerInitStatus = "CHRG 3 Initialised";
						break;
					case 0b110 :
						statusObj.status.ChargerInitStatus = "CHRG 2 & 3 Initialised";	
						break;
					case 0b101 :
						statusObj.status.ChargerInitStatus = "CHRG 1 & 3 Initialised";		
						break;
					case 0b111 :
						statusObj.status.ChargerInitStatus = "CHRG 1, 2 & 3 Initialised";	
						break;
					default : 
						// console.log("EskanToJson Status Low state Power PCB");
						statusObj.status.ChargerInitStatus = "No CHRG Initialised";
						break;
				}

				statusObj.status.BAT1_STATUS_SUMMARY = parseInt(data[index++]);
				statusObj.status.BAT2_STATUS_SUMMARY = parseInt(data[index++]);
				statusObj.status.BAT3_STATUS_SUMMARY = parseInt(data[index++]);

				//build data to store for user
				let batteryObj = {"BatteryCharging":[0,0,0], "Battery":["0","0","0"], "PowerSource":"BAT"};
				batteryObj.BatteryCharging[0] = statusObj.status.BAT1_STATUS_SUMMARY-48;
				batteryObj.BatteryCharging[1] = statusObj.status.BAT2_STATUS_SUMMARY-48;
				batteryObj.BatteryCharging[2] = statusObj.status.BAT3_STATUS_SUMMARY-48;

				batteryObj.Battery[0] = (statusObj.status.Battery1Present === true)? (statusObj.status.Battery1Soc).toString() : "0";
				batteryObj.Battery[1] = (statusObj.status.Battery2Present === true)? (statusObj.status.Battery2Soc).toString() : "0";
				batteryObj.Battery[2] = (statusObj.status.Battery3Present === true)? (statusObj.status.Battery3Soc).toString() : "0";
				
				batteryObj.PowerSource = statusObj.status.PowerSource;


				let a = batteryObj.Battery;
				let sum = a.reduce(function(a, b) { return parseInt(a) + parseInt(b); }, 0);
				let batteryPercentage = Math.round(sum/batteryObj.Battery.length);
				if(((userDataController.getUserIsUnitOn()).IsUnitOn === true) && (statusObj.status.PowerSource === "BAT")) 	
				{
					(batteryPercentage < 15) ? statusObj.status.warnings.Low_Battery = "Warning" : statusObj.status.warnings.Low_Battery = "OK";
				}
				else
				{
					statusObj.status.warnings.Low_Battery = "OK";
				}

				if(((userDataController.getUserIsUnitOn()).IsUnitOn === true) && (statusObj.status.PowerSource === "BAT")) 	
				{
					(statusObj.status.alarmsVal&(1<<2)) ? statusObj.status.alarms.Flat_Battery = "FAULT" : statusObj.status.alarms.Flat_Battery = "OK";
				}
				else //bodge, should be handled on power board. If flat battery, do not show fault.
				{
					statusObj.status.alarms.Flat_Battery = "OK";
				}

				// console.log("batteryPercentage");
				// console.log(batteryPercentage);
				// console.log(statusObj.status.warnings.Low_Battery);
				// console.log(statusObj.status.warnings.Low_Battery_1);
				// console.log(statusObj.status.Battery1Soc);
				// console.log(statusObj.status.warnings.Low_Battery_2);
				// console.log(statusObj.status.Battery2Soc);
				// console.log(statusObj.status.warnings.Low_Battery_3);
				// console.log(statusObj.status.Battery3Soc);

				moduleDataController.updateModuleConfig(statusObj); //update local file with status
				userDataController.updateUserConfig(batteryObj); //update local file with status

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

				configObj.config.InternalFan = (parseInt(data[28]) === 0x31)? "Enabled" : "Disabled";
				configObj.config.INA300Enable = (parseInt(data[29]) === 0x31)? "Enabled" : "Disabled";
		
				moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status
				moduleDataController.updateModuleConfig(configObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			else if(msgId === CommandId.setInternalFanState) 
			{			
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				configObj.config.InternalFan = (parseInt(setMsg[2]) === 0x31)? "Enabled" : "Disabled";
				moduleDataController.updateModuleConfig(configObj); //update local file with status
				
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setInaEnableState) 
			{			
				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				configObj.config.INA300Enable = (parseInt(setMsg[2]) === 0x31)? "Enabled" : "Disabled";
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
				console.log("Unknown Command Response Power PCB");
				console.log(data);
				return [HttpCode.UnprocessibleEntity, "Unknown Command Response Power PCB"];
			}
		}
		else
		{
			console.log("Unknown Ack Nack Response Power PCB");
			console.log(data);
			return [HttpCode.UnprocessibleEntity, "Unknown Ack Nack Response Power PCB"];
		}
	}
	catch(error)
	{
		console.log("Error in Power PCB return data. If SetMsg === undefined, likely API timeout");
		console.log(error);
	}
	return [HttpCode.RequestTimeout, "API Timeout"];
}

function getChargeState(ChrgState)
{
	try{
		switch(ChrgState)
		{
			case 0x30 :
				return "Disabled";
			case 0x31 :
				return "In Progress";
			case 0x32 :
				return "Done";
			case 0x33 :
				return "Fault";
			default:
				console.log("Incorrect Charge State Value 0x" + ChrgState.toString(16));
				return "Incorrect Charge State Value 0x" + ChrgState.toString(16);
		}
	}catch(error){
		console.log("Error in Power PCB return data. GetChargeState Function");
		console.log(error);
	}
}

function getCycleState(cycleState)
{
	try{
		switch(cycleState)
		{
			case 0x30 :
				return "Not Charging";
			case 0x31 :
				return "Trickle Charge";
			case 0x32 :
				return "Pre-Charge";
			case 0x33 :
				return "Fast Charge";
			case 0x34 :
				return "Taper Charge";
			case 0x35 :
				return "Reserved";
			case 0x36 :
				return "Top-Off Timer Charge";
			case 0x37 :
				return "Charge Termination, Done";
			case 0x38 :
				return "No Battery";
			default:
				console.log("Incorrect Cycle State Value 0x" + cycleState.toString(16));
				return "Incorrect Cycle State Value 0x" + cycleState.toString(16);
		}
	}catch(error){
		console.log("Error in Power PCB return data. GetCycleState Function");
		console.log(error);
	}
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
		if(commsTimeoutCount >= 2)
		{
			moduleDataController.UpdateUartCommsAlarm("power", moduleId, 1);
			commsTimeoutCount = 0;
		} 
		commsTimeoutCount++;
	}
}

module.exports = { mapInitCommands, EskanToJson, isStatusCommand, isModule, pollCommands, SetInternalFanState,
					 uartCommsAlarm, SetClearAlarms, setUnitId, SetINA3000State, powerupCommands, //function exports
					ModuleIdRange }	//variable exports