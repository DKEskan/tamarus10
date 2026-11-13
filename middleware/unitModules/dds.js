/*
	Based on document DDS Protocol vV0

	Data retrieved targetted for Tamarus Urgent units. v2.0.1
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
	setDefaultTestSettings: 0x50,
	setSweepConfig: 0x80,
	setMultiplierFactor: 0x82,
	setMinFreq: 0x83,
	setMaxFreq: 0x84,
	setMuteOutput: 0x85,
	getStatus: 0xA0,
	setClearAlarms: 0xA1,
	getBuildInfo: 0xB0,
	getConfig: 0xC0,
	setSoftReset: 0xE0
}

const ModuleIdRange = 
{
    MIN: 0x20,
    MAX: 0x2F
}

const MAX_SWEEPS = 6; 

//error codes, ensure they are numbered in sequence
const ModErrCodes = 
[
	[100, "Value OOR (Out of Range)"],
	[101, "EE_W, EE Write via I2C fail"],
	[102, "EE_R, EE Read via I2C fail"],
	[103, "Sweep Mode OOR (Out of Range)"],
	[104, "PCB ID Unknown"],
	[105, "CW Freq OOR"],
	[106, "Unknown Command"],
	[107, "Index OOR"],
	[108, "Number of sweeps OOR"],
	[109, "SWP 1 Start Frequency OOR"],
	[110, "SWP 1 Stop Frequency OOR"],
	[111, "SWP 2 Start Frequency OOR"],
	[112, "SWP 2 Stop Frequency OOR"],
	[113, "SWP 3 Start Frequency OOR"],
	[114, "SWP 3 Stop Frequency OOR"],
	[115, "SWP 4 Start Frequency OOR"],
	[116, "SWP 4 Stop Frequency OOR"],
	[117, "SWP 5 Start Frequency OOR"],
	[118, "SWP 5 Stop Frequency OOR"],
	[119, "SWP 6 Start Frequency OOR"],
	[120, "SWP 6 Stop Frequency OOR"],
	[121, "Frequency Step OOR"],
	[122, "Frequency Step OOS"],
	[123, "Dwell time OOR"],
	[124, "Modulation time OOR (Out of Range)"],
	[125, "Modulation deviation OOS (Out of Step)"],
	[126, "Modulation pattern OOR (Out of Range)"],
	[127, "Modulation frequency selection OOR (Out of Range)"],
	[128, "Sweep too fast for the selected modulation mode"],
	[129, "Dither unsupported for the requested sweep configuration"],
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

	powerUpCommand.push(CommandId.setMuteOutput);	//mute output on power up.
	powerUpCommand.push(0x31);
	eskanProtocol.packAndQueue(powerUpCommand,null);
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

function SetMuteOutput(path, val, endPoint)
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

	let Mute;

	for(let key in val)	//breakdown data to format into eskan
	{
		tmp = val[key];
		if((key === "IsPathOn") || (key === "IsUnitOn"))
		{		
			if(typeof tmp !== "boolean")
			{
				code = HttpCode.BadRequest;
				tmpErrMsg = "PathOn Value Invalid";
				return [ERROR, code, tmpErrMsg];
			}
			Mute = tmp;
		}
	}
	
	if(Mute === undefined)
	{
		code = HttpCode.BadRequest;
		tmpErrMsg = "Body Parameter Missing";
		return [ERROR, code, tmpErrMsg];
	}
	
	if(Mute === true)
	{
		eskanMessage = [id, CommandId.setMuteOutput, 0x30];	//Unmute
	}
	else
	{
		eskanMessage = [id, CommandId.setMuteOutput, 0x31];	//Mute
	}

	eskanProtocol.packAndQueue(eskanMessage, endPoint);
	
	return [OK, 0, 0];
}

// function SetSweepConfig(path, val, endPoint)
// {
// 	const eskanProtocol = require('../eskanProtocol');

// 	try
// 	{
// 		let code = HttpCode.OK;
// 		let tmpErrMsg = "";
// 		let tmp = -1;
// 		let id = path + ModuleIdRange.MIN - 1;
		
// 		let valid = inputChecks(val);
// 		code = valid[0];
// 		tmpErrMsg = valid[1];
// 		if(code >= HttpCode.BadRequest)	//failed input checks
// 		{
// 			return [ERROR, code, tmpErrMsg];
// 		}

// 		let Mode, StepFreq, DwellTime, FreqDev;

// 		for(let key in val) //search for mode
// 		{
// 			tmp = val[key];
// 			if(key === "Mode")
// 			{
// 				if(	(tmp !== "CW") && (tmp !== "Sweep")	) 
// 				{
// 					code = HttpCode.BadRequest;
// 					tmpErrMsg = "Mode Value Invalid";
// 					return [ERROR, code, tmpErrMsg];
// 				}
// 				Mode = tmp;
// 			}
// 			else if(key === "FrequencyStep")
// 			{
// 				if(typeof tmp !== "number")
// 				{
// 					code = HttpCode.BadRequest;
// 					tmpErrMsg = "Frequency Step Value Invalid";
// 					return [ERROR, code, tmpErrMsg];
// 				}
// 				StepFreq = tmp;
// 			}
// 			else if(key === "DwellTime")
// 			{
// 				if(typeof tmp !== "number")
// 				{
// 					code = HttpCode.BadRequest;
// 					tmpErrMsg = "Dwell Time Value Invalid";
// 					return [ERROR, code, tmpErrMsg];
// 				}
// 				DwellTime = tmp;
// 			}
// 			else if(key === "FrequencyDeviation")
// 			{
// 				if(typeof tmp !== "number")
// 				{
// 					code = HttpCode.BadRequest;
// 					tmpErrMsg = "Frequency Deviation Value Invalid";
// 					return [ERROR, code, tmpErrMsg];
// 				}
// 				FreqDev = tmp;
// 			}
// 		}
// 		if(Mode === undefined)
// 		{
// 			code = HttpCode.BadRequest;
// 			tmpErrMsg = "Body Parameter Missing";
// 			return [ERROR, code, tmpErrMsg];
// 		}

// 		eskanMessage = [id, CommandId.setSweepConfig];
// 		let dataBytes = [];
// 		dataBytes = new ArrayBuffer(4);
// 		let view = new DataView(dataBytes);

// 		let Freq;

// 		let freqLower = [null,null,null,null,null,null,null,null, null];
// 		let freqUpper = [null,null,null,null,null,null,null,null, null];

// 		for (let i in val.FrequencyRange)
// 		{
// 			for(let key in val.FrequencyRange[i])	//search for mode parameters
// 			{
// 				tmp = val.FrequencyRange[i][key];
// 				if(key === "Lower")
// 				{
// 					freqLower[i] = tmp;
// 				}
// 				else if(key === "Upper")	//min/max range checks cannot be completed here, require module to respond
// 				{
// 					freqUpper[i] = tmp;
// 				}
// 			}
// 		}

// 		if(Mode === "CW")
// 		{
// 			let freqBandCount = 0;

// 			for(freqBandCount = 0; freqBandCount < 9; freqBandCount++)
// 			{
// 				if((freqLower[freqBandCount] === null) || (freqUpper[freqBandCount] === null))	//one value is null, reached end
// 				{
// 					if((freqLower[freqBandCount] === null) && (freqUpper[freqBandCount] === null))	//reached end of count for both values
// 					{
// 						break;
// 					}
// 					else
// 					{
// 						code = HttpCode.UnprocessibleEntity;
// 						tmpErrMsg = "Mode CW has a upper or lower value with a null";
// 						return [ERROR, code, tmpErrMsg];
// 					}
// 				}
// 				else if((freqUpper[freqBandCount] !== freqLower[freqBandCount]) && (freqLower[freqBandCount] !== null))
// 				{
// 					code = HttpCode.UnprocessibleEntity;
// 					tmpErrMsg = "Mode CW, Lower freq is not the same as upper freq";
// 					return [ERROR, code, tmpErrMsg];
// 				}
// 			}
// 			if(freqBandCount !== 1)
// 			{
// 				code = HttpCode.UnprocessibleEntity;
// 				tmpErrMsg = "CW band has none or more than 1 band";
// 				return [ERROR, code, tmpErrMsg];
// 			}

// 			eskanMessage.push(0);	//0 - CW

// 			Freq = freqLower[0];	//Upper and Lower must be the same for CW

// 			///convert input frequency into 4 bytes. Ensures same size is always sent
// 			view.setUint32(0,Freq,true);
// 			for(let i = 0; i < 4; i++)
// 			{
// 				eskanMessage.push(view.getUint8(i));
// 			}
// 		}
// 		else if(Mode === "Sweep")
// 		{
// 			let freqBandCount = 0;

// 			for(freqBandCount = 0; freqBandCount < 9; freqBandCount++)
// 			{
// 				if((freqLower[freqBandCount] === null) || (freqUpper[freqBandCount] === null))	//one value is null, reached end
// 				{
// 					if((freqLower[freqBandCount] === null) && (freqUpper[freqBandCount] === null))	//reached end of count for both values
// 					{
// 						break;
// 					}
// 					else
// 					{
// 						code = HttpCode.UnprocessibleEntity;
// 						tmpErrMsg = "Mode Sweep band has a upper or lower value with a null";
// 						return [ERROR, code, tmpErrMsg];
// 					}
// 				}
// 				else if((freqUpper[freqBandCount] < freqLower[freqBandCount]) && (freqLower[freqBandCount] !== null))
// 				{
// 					code = HttpCode.UnprocessibleEntity;
// 					tmpErrMsg = "Mode Sweep band, Lower freq value is larger than upper freq";
// 					return [ERROR, code, tmpErrMsg];
// 				}
// 				else if((freqBandCount !== 0) && (freqUpper[freqBandCount-1] > freqLower[freqBandCount]) && (freqLower[freqBandCount-1] !== null))
// 				{
// 					code = HttpCode.UnprocessibleEntity;
// 					tmpErrMsg = "Mode Sweep band, overlap in bands";
// 					return [ERROR, code, tmpErrMsg];
// 				}
// 			}
// 			if(freqBandCount > MAX_SWEEPS)
// 			{
// 				code = HttpCode.UnprocessibleEntity;
// 				tmpErrMsg = "Sweep Mode band has more than 6 bands";
// 				return [ERROR, code, tmpErrMsg];
// 			}
// 			else if(	(StepFreq === undefined) || (DwellTime == undefined) || 
// 						(FreqDev == undefined)	)
// 			{
// 				code = HttpCode.BadRequest;
// 				tmpErrMsg = "Mode Sweep Body Parameter Missing";
// 				return [ERROR, code, tmpErrMsg];
// 			}
// 			//WARNING - check against acceptable DDS hardware frequency range not done

// 			eskanMessage.push(1);	//1 - Sweep dds
			
// 			eskanMessage.push(freqBandCount);
					
// 			//convert input frequency into 4 bytes. Ensures same size is always sent

// 			let parameters = [];
			
// 			for(let i = 0; i < MAX_SWEEPS; i++)
// 			{
// 				parameters.push(freqLower[i]);
// 				parameters.push(freqUpper[i]);
// 			}
// 			parameters.push(StepFreq);
// 			parameters.push(DwellTime);	

// 			for( let par = 0; par < parameters.length; par++)
// 			{
// 				view.setUint32(0,parameters[par],true);
// 				for(let bytes = 0; bytes < 4; bytes++)
// 				{
// 					eskanMessage.push(view.getUint8(bytes));
// 				}
// 			}
// 			view.setUint8(0,FreqDev,true);
// 			eskanMessage.push(view.getUint8(0));	
// 		}
// 		//console.log(eskanMessage);
// 		eskanProtocol.packAndQueue(eskanMessage, endPoint);
		
// 		return [OK, 0, 0];
// 	}
// 	catch(error)
// 	{
// 		console.log("DDS interface error");
// 		console.log(error);
// 	}
// 	code = HttpCode.BadRequest;
// 	tmpErrMsg = "Error setting DDS Sweep config";
// 	return [ERROR, code, tmpErrMsg];
// }

function SetSweepConfig(path, val, endPoint)
{
    const eskanProtocol = require('../eskanProtocol');

    const invalid = (message) => [
        ERROR,
        HttpCode.BadRequest,
        message
    ];

    const isUint32 = (value) =>
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 0xFFFFFFFF;

    if(
        !Number.isInteger(path) ||
        path < 1 ||
        path > ModuleIdRange.MAX - ModuleIdRange.MIN + 1
    )
    {
        return invalid("Invalid DDS path");
    }

    if(!val || typeof val !== "object" || Array.isArray(val))
    {
        return invalid("Invalid configuration body");
    }

    if(val.Mode !== "CW" && val.Mode !== "Sweep")
    {
        return invalid("Mode must be CW or Sweep");
    }

    if(!Array.isArray(val.FrequencyRange))
    {
        return invalid("FrequencyRange must be an array");
    }

    //const modulationMode = val.modulationMode ?? 0;
    //const modulationSettings = val.modulationSettings ?? 0x20;

	const modulationMode = val.modulationMode ?? 0;

    // if(
    //     !Number.isInteger(modulationMode) ||
    //     modulationMode < 0 ||
    //     modulationMode > 2
    // )
    // {
    //     return invalid("modulationMode must be 0, 1 or 2");
    // }

	if(!Number.isInteger(modulationMode) || (modulationMode !== 0 && modulationMode !== 2))
	{
		return invalid("modulationMode must be None or Injected");
	}

    // Bits 7–6 must be zero; bits 5–0 contain three selections.

	const modulationSettings = 0x27;

	// if(
    //     !Number.isInteger(modulationSettings) ||
    //     modulationSettings < 0 ||
    //     modulationSettings > 0x3F
    // )
    // {
    //     return invalid("modulationSettings must be between 0x00 and 0x3F");
    // }

    // Retain support for trailing null/null unused frequency pairs.
    const ranges = [];
    let reachedUnusedPair = false;

    for(const range of val.FrequencyRange)
    {
        if(!range || typeof range !== "object")
        {
            return invalid("Invalid frequency range");
        }

        if(range.Lower === null && range.Upper === null)
        {
            reachedUnusedPair = true;
            continue;
        }

        if(reachedUnusedPair)
        {
            return invalid("Active frequency ranges must be consecutive");
        }

        if(!isUint32(range.Lower) || !isUint32(range.Upper))
        {
            return invalid("Frequencies must be unsigned 32-bit integers in kHz");
        }

        ranges.push(range);
    }

    const id = path + ModuleIdRange.MIN - 1;
    const eskanMessage = [id, CommandId.setSweepConfig];

    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);

    const appendUint32 = (value) =>
    {
        view.setUint32(0, value, true);

        for(let i = 0; i < 4; i++)
        {
            eskanMessage.push(view.getUint8(i));
        }
    };

    if(val.Mode === "CW")
    {
        if(ranges.length !== 1)
        {
            return invalid("CW requires exactly one frequency range");
        }

        if(ranges[0].Lower !== ranges[0].Upper)
        {
            return invalid("CW lower and upper frequencies must be equal");
        }

        eskanMessage.push(0); // Byte 2: CW
        appendUint32(ranges[0].Lower); // Bytes 3–6: kHz

        eskanMessage.push(modulationMode);     // Byte 7
        eskanMessage.push(modulationSettings); // Byte 8
    }
    else
    {
        if(ranges.length > MAX_SWEEPS)
        {
            return invalid("Sweep supports a maximum of six ranges");
        }

        const stepHz = val.FrequencyStep;

        // Existing input name retained; this value is DDS counts.
        const rampRate = val.DwellTime;

        if(!isUint32(stepHz))
        {
            return invalid("FrequencyStep must be an unsigned integer in Hz");
        }

        if(
            ranges.length > 0 &&
            (stepHz < 1000 || stepHz > 4000000)
        )
        {
            return invalid("FrequencyStep must be 1000–4000000 Hz");
        }

        if(
            !Number.isInteger(rampRate) ||
            rampRate < 1 ||
            rampRate > 65535
        )
        {
            return invalid("DwellTime must be 1-65535 DDS ramp-rate counts");
        }

        const minimumSpan_kHz = Math.floor(stepHz / 1000);

        for(let i = 0; i < ranges.length; i++)
        {
            const start = ranges[i].Lower;
            const stop = ranges[i].Upper;

            if(i > 0 && start < ranges[i - 1].Upper)
            {
                return invalid("Sweep ranges must be ordered and not overlap");
            }

            // V12 permits equality for sweep 1, but not sweeps 2–6.
            const invalidSpan = i === 0
                ? stop < start + minimumSpan_kHz
                : stop <= start + minimumSpan_kHz;

            if(invalidSpan)
            {
                return invalid(`Sweep ${i + 1} frequency span is too small`);
            }
        }

        eskanMessage.push(1);             // Byte 2: Sweep
        eskanMessage.push(ranges.length); // Byte 3: active count

        // Bytes 4–51: always include all six pairs.
        for(let i = 0; i < MAX_SWEEPS; i++)
        {
            appendUint32(ranges[i]?.Lower ?? 0);
            appendUint32(ranges[i]?.Upper ?? 0);
        }

        appendUint32(stepHz);   // Bytes 52–55
        appendUint32(rampRate); // Bytes 56–59

        eskanMessage.push(modulationMode);     // Byte 60
        eskanMessage.push(modulationSettings); // Byte 61
    }

    // Firmware checks configured frequency limits and
    // modulation-specific timing/dither restrictions.
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
					case 0b011 :
						statusObj.status.overallStatus = "Alarm, Warning";
						break;
					case 0b111 :
						statusObj.status.overallStatus = "Status OK, Warning, Alarm";	
						break;
					default : 
						// console.log("EskanToJson Unknown state dds");
						// console.log(tmp);
						statusObj.status.overallStatus = "Status Not OK";	
						break;
				}

				//Alarm Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[4]);
				statusObj.status.alarmsVal = tmp;
				statusObj.status.alarms = {};
				(tmp&1) ? statusObj.status.alarms.Memory_Communication = "FAULT" : statusObj.status.alarms.Memory_Communication = "OK";
				(tmp&(1<<1)) ? statusObj.status.alarms.Temperature_Comms = "FAULT" : statusObj.status.alarms.Temperature_Comms = "OK";
				(tmp&(1<<2)) ? statusObj.status.alarms.Over_Temperature = "FAULT" : statusObj.status.alarms.Over_Temperature = "OK";
				(tmp&(1<<3)) ? statusObj.status.alarms.PCB_Id_Unknown = "FAULT" : statusObj.status.alarms.PCB_Id_Unknown = "OK";
				(tmp&(1<<4)) ? statusObj.status.alarms.PLL_Not_Locked_On_Load = "FAULT" : statusObj.status.alarms.PLL_Not_Locked_On_Load = "OK";
				(tmp&(1<<5)) ? statusObj.status.alarms.Sweep_Stalled = "FAULT" : statusObj.status.alarms.Sweep_Stalled = "OK";
				(tmp&(1<<6)) ? statusObj.status.alarms.DROVER_Interrupt_Stalled = "FAULT" : statusObj.status.alarms.DROVER_Interrupt_Stalled = "OK";
				
				//Warning Bitfield: (0: Clear, 1: Set, 0x00==No Alarms)
				tmp = parseInt(data[5]);
				statusObj.status.warningsVal = tmp;
				statusObj.status.warnings = {};
				(tmp&1) ? statusObj.status.warnings.Low_Level_Test_Mode = "Warning" : statusObj.status.warnings.Low_Level_Test_Mode = "OK";
				(tmp&(1<<1)) ? statusObj.status.warnings.Output_Muted = "Warning" : statusObj.status.warnings.Output_Muted = "OK";
			
				//Status Bitfield: (0: Clear, 1: Set, 0x03==Status is all good)
				tmp = parseInt(data[6]);
				statusObj.status.SweepStatusVal = tmp;
				statusObj.status.SweepStatus = {PG_1V8:"",PLL_Locked:""};
				
				(tmp&1) ? statusObj.status.SweepStatus.PG_1V8 = "OK" : statusObj.status.SweepStatus.PG_1V8 = "Alarm";
				(tmp&(1<<1)) ? statusObj.status.SweepStatus.PLL_Locked = "OK" : statusObj.status.SweepStatus.PLL_Locked = "Alarm";
		
				tmp = parseInt(data[7]);
				statusObj.status.SweepTemp = tmp + " deg C"; 
		
				//currently for debug. Try to cover case if it disappears. Untested.
				// if(parseInt(data[8]) !== 'undefined' && parseInt(data[8]) !== null)
				// {
				// 	statusObj.status.SweepLockRetries = "" + parseInt(data[6]) + " PLL Lock Retries"; 
				// }		
				
				moduleDataController.updateModuleConfig(statusObj); //update local file with status	

				// let IsOutput = true;
				
				// if(parseInt(statusObj.status.warningsVal)&(1<<1))	//warning that output is muted
				// {
				// 	IsOutput = false;
				// }
							
				//build data to store for user
				// let rfPath = (unitId - ModuleIdRange.MIN);
				// let ddsObj = {"RadioFrequencyPath":[]};
				// ddsObj.RadioFrequencyPath[rfPath] = {"IsPathOn": IsOutput};

				// userDataController.updateUserConfig(ddsObj); //update local file with status

				return [HttpCode.OK, ""];
			}
			// else if(msgId === CommandId.getBuildInfo)  //module build status. Contains build info
			// {   	
			// 	let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};

			// 	if(parseInt(data[3]) === 0)	//index
			// 	{
			// 		[buildInfoObj.buildInfo.Barcode, buildInfoObj.buildInfo.Version, 
			// 			buildInfoObj.buildInfo.SN, buildInfoObj.buildInfo.FW]  = getBuildInfo(data.slice(4));
			// 	}
			// 	moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status

			// 	return [HttpCode.OK, ""];
			// }

			else if(msgId === CommandId.getBuildInfo)
			{
				const boardIndex = data[3];

				const requiredLength = boardIndex === 0 ? 86 : 38

				if(data.length < requiredLength)
				{
					return [
						HttpCode.UnprocessibleEntity,
						"Incomplete DDS build information response"
					];
				}

				const readString = (offset) =>
        			String.fromCharCode(...data.slice(offset, offset + 10));

    			const readUint16 = (offset) =>
        			data[offset] + data[offset + 1] * 256;

				let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};

				if(boardIndex === 0)	//DDS Board
				{
					buildInfoObj.buildInfo.PCB_Id = readString(4);
					buildInfoObj.buildInfo.PCB_Version = readUint16(14);

					buildInfoObj.buildInfo.PCA_Id = readString(16);
					buildInfoObj.buildInfo.PCA_Version = readUint16(26);

					buildInfoObj.buildInfo.SN = readString(28);

					buildInfoObj.buildInfo.Application_Firmware_Id =
						readString(38);
					buildInfoObj.buildInfo.Application_Firmware_Version =
						readUint16(48);

					buildInfoObj.buildInfo.Application_Protocol_Id =
						readString(50);
					buildInfoObj.buildInfo.Application_Protocol_Version =
						readUint16(60);

					buildInfoObj.buildInfo.Bootloader_Firmware_Id =
						readString(62);
					buildInfoObj.buildInfo.Bootloader_Firmware_Version =
						readUint16(72);

					buildInfoObj.buildInfo.Bootloader_Protocol_Id =
						readString(74);
					buildInfoObj.buildInfo.Bootloader_Protocol_Version =
						readUint16(84);
				}
				else	//Multiplier Board
				{
					buildInfoObj.buildInfo.Multiplier_Board_PCB_Id =
						readString(4);
					buildInfoObj.buildInfo.Multiplier_Board_PCB_Version =
						readUint16(14);

					buildInfoObj.buildInfo.Multiplier_Board_PCA_Id =
						readString(16);
					buildInfoObj.buildInfo.Multiplier_Board_PCA_Version =
						readUint16(26);

					buildInfoObj.buildInfo.Multiplier_Board_SN =
						readString(28);
				}

				moduleDataController.updateModuleConfig(buildInfoObj);
				return[HttpCode.OK, ""];
			}

			// else if(msgId === CommandId.getConfig) 
			// {
			// 	let buildInfoObj = {"address": "0x" + unitId.toString(16), "buildInfo":{}};
			// 	let configObj = {"address": "0x" + unitId.toString(16), "config":{}};

			// 	[buildInfoObj.buildInfo.Barcode, buildInfoObj.buildInfo.Version, 
			// 		buildInfoObj.buildInfo.SN, buildInfoObj.buildInfo.FW]  = getBuildInfo(data.slice(3));

			// 	configObj.config.sweepStepFactor = parseInt(data[28]);
			// 	configObj.config.sweepMinFreq = (parseInt(data[32])<<24) + (parseInt(data[31])<<16) + (parseInt(data[30])<<8) + parseInt(data[29]);
			// 	configObj.config.sweepMaxFreq = (parseInt(data[36])<<24) + (parseInt(data[35])<<16) + (parseInt(data[34])<<8) + parseInt(data[33]);
			// 	configObj.config.sweepTempAlarmThresh = parseInt(data[37]);
			// 	configObj.config.sweepOutputLevel = parseInt(data[38]);

			// 	tmp = parseInt(data[39]);
			// 	switch(tmp)
			// 	{
			// 		case 0 :
			// 			configObj.config.SweepMode = "CW";
			// 			break;
			// 		case 1 :
			// 			configObj.config.SweepMode = "Sweep";
			// 			break;
			// 		default :
			// 			console.log("Dropped out of config response sweep mode, old DDS software");
			// 			break;
			// 	}
				
			// 	let index = 40;

				
			// 	configObj.config.SweepCwFreq_kHz = (parseInt(data[index+3])<<24) + (parseInt(data[index+2])<<16) + (parseInt(data[index+1])<<8) + parseInt(data[index]);
			// 	index+=4;	
				
			// 	configObj.config.SweepMultiNumber = parseInt(data[index]);
			// 	index++;
			// 	configObj.config.SweepMultiStartFreq_kHz = [];
			// 	configObj.config.SweepMultiStopFreq_kHz = [];
			// 	for(let i = 0; i < MAX_SWEEPS; i++)
			// 	{
			// 		configObj.config.SweepMultiStartFreq_kHz[i] = (parseInt(data[index+3])<<24) + (parseInt(data[index+2])<<16) + (parseInt(data[index+1])<<8) + parseInt(data[index]);
			// 		index+=4;
			// 		configObj.config.SweepMultiStopFreq_kHz[i] = (parseInt(data[index+3])<<24) + (parseInt(data[index+2])<<16) + (parseInt(data[index+1])<<8) + parseInt(data[index]);
			// 		index+=4;
			// 	}
			// 	configObj.config.SweepMultiStepFreq_kHz = (parseInt(data[index+3])<<24) + (parseInt(data[index+2])<<16) + (parseInt(data[index+1])<<8) + parseInt(data[index]);
			// 	index+=4;
			// 	configObj.config.SweepMultiDwellTime_ns = (parseInt(data[index+3])<<24) + (parseInt(data[index+2])<<16) + (parseInt(data[index+1])<<8) + parseInt(data[index]);
			// 	index+=4;
			// 	configObj.config.SweepMultiFreqDev = parseInt(data[index]);

			// 	moduleDataController.updateModuleConfig(buildInfoObj); //update local file with status
			// 	moduleDataController.updateModuleConfig(configObj); //update local file with status

			// 	return [HttpCode.OK, ""];
			// }

			else if(msgId === CommandId.getConfig){
					if(data.length < 194){
						return [
							HttpCode.UnprocessibleEntity,
							"Invalid DDS config response"
						];
					}

				    const readString = (offset) => String.fromCharCode(...data.slice(offset, offset + 10));

    				const readUint16 = (offset) => data[offset] + data[offset + 1] * 256;

					// Arithmetic avoids signed 32-bit results from bitwise shifts.
					const readUint32 = (offset) =>
						data[offset] +
						data[offset + 1] * 256 +
						data[offset + 2] * 65536 +
						data[offset + 3] * 16777216;

					const mode = data[130];
					const modulationMode = data[192];
					const modulationSettings = data[193];

					if(mode > 1 || modulationMode > 2 || data[135] > MAX_SWEEPS || (modulationSettings & 0xC0) !== 0)
					{
						return [
            					HttpCode.UnprocessibleEntity,
            					"Invalid DDS configuration values"
        				];
					}
					
					console.log(
						`DDS 0x${unitId.toString(16)} readback: ` +
						`modulationMode=${modulationMode}, ` +
						`modulationSettings=0x${modulationSettings.toString(16).padStart(2, "0")}`
					);

					let buildInfoObj = { address: "0x" + unitId.toString(16), buildInfo: {}};

    				let configObj = { address: "0x" + unitId.toString(16), config: {}};
					
					buildInfoObj.buildInfo.PCB_Id = readString(3);
					buildInfoObj.buildInfo.PCB_Version = readUint16(13);
					buildInfoObj.buildInfo.PCA_Id = readString(15);
					buildInfoObj.buildInfo.PCA_Version = readUint16(25);
					buildInfoObj.buildInfo.SN = readString(27);
					
					buildInfoObj.buildInfo.Application_Firmware_Id = readString(37);
					buildInfoObj.buildInfo.Application_Firmware_Version = readUint16(47);
					buildInfoObj.buildInfo.Application_Protocol_Id = readString(49);
					buildInfoObj.buildInfo.Application_Protocol_Version = readUint16(59);

					buildInfoObj.buildInfo.Bootloader_Firmware_Id = readString(61);
					buildInfoObj.buildInfo.Bootloader_Firmware_Version = readUint16(71);
					buildInfoObj.buildInfo.Bootloader_Protocol_Id = readString(73);
					buildInfoObj.buildInfo.Bootloader_Protocol_Version = readUint16(83);

					buildInfoObj.buildInfo.Multiplier_Board_PCB_Id = readString(85);
					buildInfoObj.buildInfo.Multiplier_Board_PCB_Version = readUint16(95);
					buildInfoObj.buildInfo.Multiplier_Board_PCA_Id = readString(97);
					buildInfoObj.buildInfo.Multiplier_Board_PCA_Version = readUint16(107);
					buildInfoObj.buildInfo.Multiplier_Board_SN = readString(109);
					
					configObj.config.Freq_Multiplier = data[119];
					configObj.config.Min_Output_Freq = readUint32(120);
					configObj.config.Max_Output_Freq = readUint32(124);
					configObj.config.Temp_Alarm_Threshold = data[128];
					configObj.config.DDS_Amplitude = data[129];
					
					configObj.config.Operating_Mode = data[130];
					configObj.config.CW_Freq = readUint32(131);
					configObj.config.No_of_Active_Sweeps = data[135];
					
					configObj.config.Sweep1StartFreq = readUint32(136);
					configObj.config.Sweep1StopFreq = readUint32(140);

					configObj.config.Sweep2StartFreq = readUint32(144);
					configObj.config.Sweep2StopFreq = readUint32(148);

					configObj.config.Sweep3StartFreq = readUint32(152);
					configObj.config.Sweep3StopFreq = readUint32(156);

					configObj.config.Sweep4StartFreq = readUint32(160);
					configObj.config.Sweep4StopFreq = readUint32(164);

					configObj.config.Sweep5StartFreq = readUint32(168);
					configObj.config.Sweep5StopFreq = readUint32(172);

					configObj.config.Sweep6StartFreq = readUint32(176);
					configObj.config.Sweep6StopFreq = readUint32(180);

					configObj.config.SweepFreqStep = readUint32(184);
					configObj.config.RampRate = readUint32(188);
					configObj.config.modulationMode = data[192];
					configObj.config.modulationSettings = data[193];

					moduleDataController.updateModuleConfig(buildInfoObj);
    				moduleDataController.updateModuleConfig(configObj);

					moduleDataController.setDdsSweepReadback(unitId, configObj.config);

					require('../../controllers/userDataController')
					.importDdsStepRampAtStartup(unitId, configObj.config);

					moduleDataController.setDdsModulationReadback(unitId, modulationMode);
					require('../uiWebSocket').sendButtonUpdate('U');

    				return [HttpCode.OK, ""];
			}

			// else if(msgId === CommandId.setSweepConfig) 
			// {
			// 	let configObj = {"address": "0x" + unitId.toString(16), "config":{}};

			// 	let index = 3;
			// 	if(setMsg[2] === 0x00)	//CW
			// 	{
			// 		configObj.config.SweepCwFreq_kHz = 0;
			// 		configObj.config.SweepCwFreq_kHz = (parseInt(setMsg[index+3])<<24) + (parseInt(setMsg[index+2])<<16) + (parseInt(setMsg[index+1])<<8) + parseInt(setMsg[index]);

			// 		index += 4;

			// 		if(setMsg[2] !== undefined)
			// 		{
			// 			configObj.config.ModulationMode = Number(setMsg[index]);
			// 		}

			// 	}
			// 	else if(setMsg[2] === 0x01)	//Sweep
			// 	{
			// 		configObj.config.SweepMultiNumber = 0;
			// 		configObj.config.SweepMultiNumber = parseInt(setMsg[index]);
			// 		index++;

			// 		configObj.config.SweepMultiStartFreq_kHz = [];
			// 		configObj.config.SweepMultiStopFreq_kHz = [];
			// 		for(let i = 0; i < MAX_SWEEPS; i++)
			// 		{
			// 			configObj.config.SweepMultiStartFreq_kHz[i] = (parseInt(setMsg[index+3])<<24) + (parseInt(setMsg[index+2])<<16) + (parseInt(setMsg[index+1])<<8) + parseInt(setMsg[index]);
			// 			index+=4;
			// 			configObj.config.SweepMultiStopFreq_kHz[i] = (parseInt(setMsg[index+3])<<24) + (parseInt(setMsg[index+2])<<16) + (parseInt(setMsg[index+1])<<8) + parseInt(setMsg[index]);
			// 			index+=4;
			// 		}
			// 		configObj.config.SweepMultiStepFreq_kHz = [];
			// 		configObj.config.SweepMultiStepFreq_kHz = (parseInt(setMsg[index+3])<<24) + (parseInt(setMsg[index+2])<<16) + (parseInt(setMsg[index+1])<<8) + parseInt(setMsg[index]);
			// 		index+=4;
			// 		configObj.config.SweepMultiDwellTime_ns = 0;
			// 		configObj.config.SweepMultiDwellTime_ns = (parseInt(setMsg[index+3])<<24) + (parseInt(setMsg[index+2])<<16) + (parseInt(setMsg[index+1])<<8) + parseInt(setMsg[index]);
			// 		index+=4;
			// 		configObj.config.SweepMultiFreqDev = 0;
			// 		configObj.config.SweepMultiFreqDev = parseInt(setMsg[index]);	
			// 	}

			// 	moduleDataController.updateModuleConfig(configObj); //update local file with status

			// 	return [HttpCode.Accepted, ""];
			// }

			else if(msgId === CommandId.setSweepConfig)
			{
				const mode = setMsg[2]
				const requiredLength = mode === 0 ? 9 : 62;

				if(setMsg.length < requiredLength)
				{
					return [
            				HttpCode.UnprocessibleEntity,
            				"Incomplete DDS SetSweepConfig command"
					];
				}

				const readUint32 = (offset) =>
					setMsg[offset] +
					setMsg[offset + 1] * 256 +
					setMsg[offset + 2] * 65536 + 
					setMsg[offset + 3] * 16777216;

				let configObj = {"address": "0x" + unitId.toString(16), "config":{}};
				
				configObj.config.Operating_Mode = mode;

				if(mode === 0)	//CW Mode
				{
					configObj.config.CW_Freq = readUint32(3);
					configObj.config.modulationMode = setMsg[7];
					configObj.config.modulationSettings = setMsg[8];
				}

				else if(mode === 1) //Sweep Mode
				{
					configObj.config.No_of_Active_Sweeps = setMsg[3];

					let index = 4;

					for(let i=0; i<MAX_SWEEPS; ++i)
					{
						configObj.config[`Sweep${i + 1}StartFreq`] =
						readUint32(index);
						index += 4;

						configObj.config[`Sweep${i + 1}StopFreq`] =
						readUint32(index);
						index += 4;
					}

					configObj.config.SweepFreqStep = readUint32(52);
					configObj.config.RampRate = readUint32(56);
					configObj.config.modulationMode = setMsg[60];
					configObj.config.modulationSettings = setMsg[61];
				}

				moduleDataController.updateModuleConfig(configObj);

				if(AckNAckData === 0x41)
				{
					moduleDataController.markDdsSweepConfigAcked(unitId);
					eskanProtocol.packAndQueue([unitId, CommandId.getConfig] , 0);
				}

				return [HttpCode.Accepted, ""];
			}

			else if(msgId === CommandId.setMuteOutput) 
			{			
				//Set Command Successful, use sent value to update local configuration
				//only update user view command, or config values. Status values polled regularly
				let IsOutput = true;
				let statusObj = {"address": "0x" + unitId.toString(16), "status":{}};
				statusObj.status.warnings = {};

				if(setMsg[2] === 0x31)	//output is muted
				{
					IsOutput = false;
					statusObj.status.warningsVal = (1<<1);
					statusObj.status.warnings.Output_Muted = "Warning"
				}
				else if(setMsg[2] === 0x30)
				{
					statusObj.status.warningsVal &= (0<<1);
					statusObj.status.warnings.Output_Muted = "OK"
				}
				else{
					console.log("DDS set mute should not be here");
					console.log(setMsg[2]);
				}

				moduleDataController.updateModuleConfig(statusObj); //update local file with status	
							
				let refreshInfo = [];
				refreshInfo.push(unitId);	
				refreshInfo.push(CommandId.getStatus);
 
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setMultiplierFactor) 
			{			
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setMinFreq) 
			{			
				return [HttpCode.Accepted, ""];
			}
			else if(msgId === CommandId.setMaxFreq) 
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
			else if(msgId === CommandId.setDefaultTestSettings) 
			{
				eskanMessage = [unitId, CommandId.setSoftReset];
				eskanProtocol.packAndQueue(eskanMessage,0);
				return [HttpCode.Accepted, ""];
			}
			else
			{
				console.log("Unknown Command Response DDS");
				console.log(data);
				return [HttpCode.UnprocessibleEntity, "Unknown Command Response DDS"];
			}
		}
		else
		{
			console.log("Unknown Ack Nack Response DDS");
			console.log(data);
			return [HttpCode.UnprocessibleEntity, "Unknown Ack Nack Response DDS"];
		}
	}catch(error)
	{
		console.log("DDS interface error");
		console.log(error);
	}
	return [HttpCode.RequestTimeout, "API Timeout"];
    
}

// function getBuildInfo(data)
// {
// 	tmp = data.slice(0, 10);	//take values and turn into string of ASCII
// 	Barcode = "";
// 	for(let i = 0; i < tmp.length; i++)
// 	{
// 		if(tmp[i] != 0)
// 		{
// 			Barcode += String.fromCharCode(tmp[i]);
// 		}
// 	}

// 	Version = parseInt((data[11]<<8)+data[10]);

// 	tmp = data.slice(12, 22);	//take values and turn into string of ASCII
// 	SN= "";
// 	for(let i = 0; i < tmp.length; i++)
// 	{
// 		if(tmp[i] != 0)
// 		{
// 			SN += String.fromCharCode(tmp[i]);
// 		}
// 	}

// 	FW = "" + data[22] + "." + data[23] + "." + data[24] + "";

// 	return [Barcode, Version, SN, FW];
// }

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
	((ModuleIdRange.MIN <= unitId) && (unitId <= ModuleIdRange.MAX))) //dds status commands
	{
		return 1;
	}
	return 0;
}

function isModule(unitId)
{
	if((ModuleIdRange.MIN <= unitId) && (unitId <= ModuleIdRange.MAX)) //dds status commands
	{
		return 1;
	}
	return 0;
}

// function inputChecks(message)
// {
// 	let code = HttpCode.OK;
// 	let tmpErrMsg = "";
// 	if((typeof message === 'undefined') || (typeof message === null))
// 	{
// 		code = HttpCode.BadRequest;
// 		tmpErrMsg = "Body Undefined";
// 	}
// 	if(typeof message.length < 1)
// 	{
// 		code = HttpCode.BadRequest;
// 		tmpErrMsg = "Body Required";
// 	}
	
// 	return [code, tmpErrMsg];
// }

function inputChecks(message)
{
    if(
        message === null ||
        typeof message !== "object" ||
        Array.isArray(message)
    )
    {
        return [HttpCode.BadRequest, "Body must be an object"];
    }

    if(Object.keys(message).length === 0)
    {
        return [HttpCode.BadRequest, "Body Required"];
    }

    return [HttpCode.OK, ""];
}

function uartCommsAlarm(message, state)
{
	let moduleId = message[1] - ModuleIdRange.MIN;
	if(state === ERROR)
	{
		moduleDataController.UpdateUartCommsAlarm("dds", moduleId, 1); 
	}
}

module.exports = { mapInitCommands, EskanToJson, isStatusCommand, isModule, pollCommands,  SetMuteOutput, SetSweepConfig, uartCommsAlarm, SetClearAlarms, powerupCommands,  //function exports
					ModuleIdRange }	//variable exports
					