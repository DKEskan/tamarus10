const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path'); 
const readline = require('readline');

let savingMemDataFlag = 0;
let savingPasswordFlag = 0;
let savingOpFillFlag = 0;
let savingUserDataFlag = 0;
function getSavingStatus()
{

    return savingMemDataFlag || savingOpFillFlag || savingPasswordFlag || savingUserDataFlag;
}

const data = {
    userConfig: require('../model/userConfig.json'),
	opFill: require('../model/opFill.json'),
	passwordConfig: require('../model/password.json'),
    setUserConfig: function (data) { this.userConfig = data },
};

const OK = 0;
const ERROR = null;

function initMap() //add new module to map
{   
	data.userConfig.Barcode = "JM-A-H-TAS10-X01-XX1-AA";
	data.userConfig.Version = 3;
	data.userConfig.SerialNumber = "ESK0006656";
	data.userConfig.Firmware = "1.1.14";
	data.userConfig.IPAddress = "192.168.2.220";
	data.userConfig.Subnet = "24";
	data.userConfig.Gateway = "192.168.2.1";
	data.userConfig.IsUnitOn = false;
	data.userConfig.BatteryCharging = [0,0,0];
	data.userConfig.Battery = ["40", "50", "60"];
	data.userConfig.UnitOverallAlarm = false;
	data.userConfig.UnitOverallAlarmType = "";
	data.userConfig.UnitOverallWarning = false;
	data.userConfig.UnitOverallWarningType = "";
	data.userConfig.IsConvertModeOn = false;
	data.userConfig.IsBuzzLedOn = "off";
	data.userConfig.IsTxButtonOn = false;
	data.userConfig.PowerSource = "BAT";
	data.userConfig.RadioFrequencyPath = [];
	importedDdsAtStartup.clear();
}

function createNewUserConfigMap(newPathId) //add new module to map. Count modules included
{ 
	for(let i in data.userConfig)
	{  
		if (data.userConfig.RadioFrequencyPath[i]?.Id === newPathId) 
		{
			return;
		}
	}

    const newPath = {
        Id: data.userConfig?.RadioFrequencyPath.length ? data.userConfig.RadioFrequencyPath[Object.keys(data.userConfig.RadioFrequencyPath).length - 1].Id + 1: 1,  //use next free number
		Name: "Band-",
		Temperature: 0
    }
    
    console.log(newPath);
    newPath.Name += newPath.Id;

    data.userConfig.RadioFrequencyPath[newPath.Id-1] = newPath;
}


const ERROR_SWEEP_INJECTED_TOO_NARROW = 130;
const narrowSweepAlerts = new Map();

function latchNarrowSweepAlert(ddsNumber) {
    if (narrowSweepAlerts.has(ddsNumber)) return;

    narrowSweepAlerts.set(ddsNumber, {
        code: ERROR_SWEEP_INJECTED_TOO_NARROW,
        text: `Path ${ddsNumber} Modulation is not applied as it has a narrow sweep`
    });
}

function acknowledgeNarrowSweepAlert() {
    const first = narrowSweepAlerts.keys().next().value;
    if (first !== undefined) narrowSweepAlerts.delete(first);
} 

// function getUserConfig()
// {
//     const jsonConfig = data.userConfig;
    
//     if (!jsonConfig) {
//         console.log(`Config not found`);
//         return ERROR;
//     }
// 	return jsonConfig;
// }

function getUserConfig()
{
	const jsonConfig = data.userConfig;

	if(!jsonConfig)
	{
		console.log(`Config Not Found`);
		return ERROR;
	}

	const moduleDataController = require("./moduleDataController");
	
	return {
		...jsonConfig,
		ActiveAlarms: jsonConfig.UnitOverallAlarm ?
		moduleDataController.getActiveAlarmList()
		: [],
		SweepNarrowAlert: narrowSweepAlerts.values().next().value ?? null,
		DdsModulationReadback: moduleDataController.getDdsModulationReadback(),
	};
}


function saveUserDataMap()
{
    try{   
        if(fs.existsSync(path.join(__dirname, '..', 'model', 'userConfig.json')))   //check the file is where it should be
        {
        	let userMapData = data.userConfig;
        	//console.log(userMapData);
        	//console.log("exists");
        	try {
				savingUserDataFlag = 1;
        		//WARNING - in dev mode using Nodemon, writing to the file will restart software as there is a change in the file.
			  	fs.writeFileSync(path.join(__dirname, '..', 'model', 'userConfig.json'), JSON.stringify(userMapData, null, 2), 'utf8'); //overwrite file data with new settings
		  		savingUserDataFlag = 0;
				console.log('User Map Data successfully saved to disk');
				
			}catch(error) {
			  	console.log('An error has occurred ', error);
			}
        	
            return OK;
        }
        else{
            console.log("no user config file");
            return ERROR;   
        }
    }catch(err){
        console.log(err);
        return ERROR;   
    }
}

function getUserPath(path)
{

    const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return "cannot find config";
    }

	return jsonConfig.RadioFrequencyPath[path];
}

function getUserIpSettings()
{

    const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return "cannot find config";
    }
	let response = {};
	response.IPAddress = jsonConfig.IPAddress;
	response.Subnet = jsonConfig.Subnet;
	response.Gateway = jsonConfig.Gateway;
	return response;
}

function getUserIsUnitOn()
{

    const jsonConfig = data.userConfig;
	const jsonPathConfig = data.userConfig.RadioFrequencyPath;
    
    if (!jsonConfig || !jsonPathConfig) {
        console.log(`config not found`);
        return "cannot find config";
    }

    let response = {};
	response.IsUnitOn = jsonConfig.IsUnitOn;
	
	// response.RadioFrequencyPath = [];
	// try{
	// 	for(let i = 0; i < jsonPathConfig.length; i++)	//search for key
	// 	{
	// 		response.RadioFrequencyPath[i] = {};
	// 		response.RadioFrequencyPath[i].Id = jsonPathConfig[i].Id;
	// 		response.RadioFrequencyPath[i].IsPathOn = jsonPathConfig[i].IsPathOn;	
	// 	}
	// }catch(err)
	// {
	// 	console.log("controller unitOnBody error");
	// }
	
	return response;
}

function getUserIsTransmitting()
{
    const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return "cannot find config";
    }

    let response = {};
	response.IsTransmitting = jsonConfig.IsTransmitting;
		
	return response;
}

function getUserBuildInfo()
{

    const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return "cannot find config";
    }
    let response = {};
	response.Barcode = jsonConfig.Barcode;
	response.Version = jsonConfig.Version;
	response.SerialNumber = jsonConfig.SerialNumber;
	response.Firmware = jsonConfig.Firmware;
	return response;
}

function getUserUnitName()
{

    const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return "cannot find config";
    }
    let response = {};
	response.UnitName = jsonConfig.UnitName;
	return response;
}

function getUserSystemInfo()
{

    const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return "cannot find config";
    }
    let response = {};
	response.UnitName = jsonConfig.UnitName;
	response.IPAddress = jsonConfig.IPAddress;
	response.Subnet = jsonConfig.Subnet;
	response.Gateway = jsonConfig.Gateway;
	return response;
}

/*
take in JSON object and update current json object
*/
function updateUserConfig(updateData)
{
	try
	{
		for(let key in updateData)	//search for key
		{
			if(key.includes("RadioFrequencyPath"))	//if this key
			{
				for(let PathIndex in updateData[key])	//search for array index
				{
					for(let PathVals in updateData[key][PathIndex])	//search key within array
					{
						if(key.includes("FrequencyRange"))	//if this key
						{
							for(let FreqIndex in updateData[key][PathIndex]) 	//search for array index
							{
								for(let FreqVals in updateData[key][PathIndex][FreqIndex])	//search key within array
								{
									data.userConfig.RadioFrequencyPath[PathIndex][PathVals].FrequencyRange[FreqIndex][FreqVals]= updateData[key][PathIndex][PathVals].FrequencyRange[FreqIndex][FreqVals];	//replace values
								}
							}						
						}
						else
						{
							data.userConfig.RadioFrequencyPath[PathIndex][PathVals]= updateData[key][PathIndex][PathVals];	//replace values
						}
					}
				}
			}
			else
			{
				data.userConfig[key] = updateData[key];
			}
		}
	}catch (error)
	{
		
		console.error(error);
		return ERROR;
	}
	//console.log(data.userConfig);
	return OK;
}

function getOpfill(index)
{
    const jsonConfig = data.opFill;
    
    if (!jsonConfig) {
        console.log(`Opfill not found`);
        return ERROR;
    }

	let response = {};
	response.CurrentOpFill = jsonConfig.CurrentOpFill;
	response.OpFill = jsonConfig.OpFill[index-1];

	return response;
}

function getCurrentOpfill()
{
    const jsonConfig = data.opFill;
    
    if (!jsonConfig) {
        console.log(`Opfill not found`);
        return ERROR;
    }

	let response = {};
	response.CurrentOpFill = jsonConfig.CurrentOpFill;
	response.OpFill = jsonConfig.OpFill[jsonConfig.CurrentOpFill-1];

	return response;
}

const importedDdsAtStartup = new Set();

function importDdsStepRampAtStartup(unitId, config) {
    const pathIndex = unitId - 0x20;
    if (pathIndex < 0 || pathIndex >= 7 ||
        importedDdsAtStartup.has(unitId)) {
        return false;
    }

    const step = config?.SweepFreqStep; // Hz
    const ramp = config?.RampRate;

    // The LCD edits and displays whole kHz steps.
    if (!Number.isInteger(step) || step < 1000 ||
        step > 4000000 || step % 1000 !== 0 ||
        !Number.isInteger(ramp) || ramp < 1 || ramp > 65535) {
        return false;
    }

    const opFill = data.opFill?.OpFill?.[data.opFill.CurrentOpFill - 1];
    const band = opFill?.RadioFrequencyPath?.[pathIndex];
    if (!band) return false;

    if (band.FrequencyStep === step && band.RampRate === ramp) {
        importedDdsAtStartup.add(unitId);
        return false;
    }

    const oldStep = band.FrequencyStep;
    const oldRamp = band.RampRate;
    band.FrequencyStep = step;
    band.RampRate = ramp;

    if (saveToOpFillJson() !== OK) {
        band.FrequencyStep = oldStep;
        band.RampRate = oldRamp;
        return false;
    }

    importedDdsAtStartup.add(unitId);
    return true;
}


function saveOpfill(op, body)
{
	const opFillConfig = data.opFill;
    
    if (!opFillConfig) {
        console.log(`Opfill not found`);
        return ERROR;
    }

	data.opFill.OpFill[op].ModulationEnabled = body.ModulationEnabled;
	data.opFill.OpFill[op].RadioFrequencyPath = body.RadioFrequencyPath;

	if(saveToOpFillJson() === ERROR)
	{
		return "Save file error";
	}
	return OK;
}

function uploadOpfill(opFillIndex)
{
	const opFillConfig = data.opFill;
    
    if (!opFillConfig) {
        console.log(`Opfill not found`);
        return ERROR;
    }
	
	if(opFillIndex !== opFillConfig.CurrentOpFill)
	{
		opFillConfig.CurrentOpFill = opFillIndex;

		if(saveToOpFillJson() === ERROR)
		{
			return ERROR;
		}
	}
	return OK;
}

function destroyOpfill()
{
	const opFillConfig = data.opFill;
    
    if (!opFillConfig) {
        console.log(`Opfill not found`);
        return ERROR;
    }

	for(let i in data.opFill.OpFill)
	{
		data.opFill.OpFill[i].RadioFrequencyPath = data.opFill.DefaultOpFill.RadioFrequencyPath;
	}	

	if(saveToOpFillJson() === ERROR)
	{
		return ERROR;
	}
	return OK;
}

function saveToOpFillJson()
{
	try{   
		if(fs.existsSync(path.join(__dirname, '..', 'model', 'opFill.json')))   //check the file is where it should be
		{
			try {
				savingOpFillFlag = 1;
				//WARNING - in dev mode using Nodemon, writing to the file will restart software as there is a change in the file.
				fs.writeFileSync(path.join(__dirname, '..', 'model', 'opFill.json'), JSON.stringify(data.opFill, null, 2), 'utf8'); //overwrite file data with new settings
				savingOpFillFlag = 0;
				console.log('Op Fill Config successfully saved to disk');
				
			}catch(error) {
					savingOpFillFlag = 0;
					console.log('An error has occurred ', error);
					return ERROR;
			}
			
			return OK;
		}
		else{
			console.log("no Op Fill file");
			return ERROR;   
		}
	}catch(err){
		console.log(err);
		return ERROR;   
	}
}

function saveToMemDataJson()
{
	const memData = require('../model/memData.json');
	try{   
		if(fs.existsSync(path.join(__dirname, '..', 'model', 'memData.json')))   //check the file is where it should be
		{
			try {
				savingMemDataFlag = 1;
				//WARNING - in dev mode using Nodemon, writing to the file will restart software as there is a change in the file.
				fs.writeFileSync(path.join(__dirname, '..', 'model', 'memData.json'), JSON.stringify(memData, null, 2), 'utf8'); //overwrite file data with new settings
				savingMemDataFlag = 0;
				console.log('MemData successfully saved to disk');
			}catch(error) {
					console.log('An error has occurred ', error);
			}
			
			return OK;
		}
		else{
			console.log("no Op Fill file");
			return ERROR;   
		}
	}catch(err){
		console.log(err);
		return ERROR;   
	}
}

function saveToUserConfigJson()
{
	try{   
		if(fs.existsSync(path.join(__dirname, '..', 'model', 'userConfig.json')))   //check the file is where it should be
		{
			try {
				//WARNING - in dev mode using Nodemon, writing to the file will restart software as there is a change in the file.
					fs.writeFileSync(path.join(__dirname, '..', 'model', 'userConfig.json'), JSON.stringify(data.userConfig, null, 2), 'utf8'); //overwrite file data with new settings
					console.log('User Config Data successfully saved to disk');
			}catch(error) {
					console.log('An error has occurred ', error);
			}
			
			return OK;
		}
		else{
			console.log("no user config file");
			return ERROR;   
		}
	}catch(err){
		console.log(err);
		return ERROR;   
	}
}

function getPassword()
{
    const jsonConfig = data.passwordConfig.password;
    
    if (!jsonConfig) {
        console.log(`password file not found`);
        return ERROR;
    }
	return jsonConfig;
}

function setPassword(newPassword)
{
	const jsonConfig = data.passwordConfig;
    
    if (!jsonConfig) {
        console.log(`password file not found`);
        return ERROR;
    }

	if(newPassword != data.passwordConfig.password)
	{
		data.passwordConfig.password = newPassword;
		if(saveToPasswordJson() === ERROR)
		{
			return ERROR;
		}
	}
	return OK;
}

function saveToPasswordJson()
{
	try{   
		if(fs.existsSync(path.join(__dirname, '..', 'model', 'password.json')))   //check the file is where it should be
		{
			try {
				savingPasswordFlag = 1;
				//WARNING - in dev mode using Nodemon, writing to the file will restart software as there is a change in the file.
				fs.writeFileSync(path.join(__dirname, '..', 'model', 'password.json'), JSON.stringify(data.passwordConfig, null, 2), 'utf8'); //overwrite file data with new settings
				savingPasswordFlag = 0;
				console.log('Password Data successfully saved to disk');
				
			}catch(error) {
					console.log('An error has occurred ', error);
			}
			
			return OK;
		}
		else{
			console.log("no password file");
			return ERROR;   
		}
	}catch(err){
		console.log(err);
		return ERROR;   
	}
}

function updateUnitOverallAlarm(alarmState)
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	jsonConfig.UnitOverallAlarm = alarmState;

	return OK;
}

function updateUnitOverallAlarmType(alarmState)
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	jsonConfig.UnitOverallAlarmType = alarmState;

	return OK;
}

function updateUnitOverallWarning(warningState)
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	jsonConfig.UnitOverallWarning = warningState;

	return OK;
}

function updateUnitOverallWarningType(warningState)
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	jsonConfig.UnitOverallWarningType = warningState;

	return OK;
}

function getUnitOverallAlarm()
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	return jsonConfig.UnitOverallAlarm;
}

function getCovertMode()
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	return jsonConfig.IsConvertModeOn;
}

function getBuzzLedMode()
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	return jsonConfig.IsBuzzLedOn;
}

function getBatteryCharging()
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	return jsonConfig.BatteryCharging;
}

function getPowerSource()
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	return jsonConfig.PowerSource;
}

function getTxButtonOnState()
{
	const jsonConfig = data.userConfig;
    
    if (!jsonConfig) {
        console.log(`user config not found`);
        return ERROR;
    }

	return jsonConfig.IsTxButtonOn;
}

function getPaHighestTemp()
{
	try
	{
		const jsonConfig = data.userConfig;
		
		if (!jsonConfig) {
			console.log(`user config not found`);
			return ERROR;
		}
		let highestTemp = data.userConfig.RadioFrequencyPath[0].Temperature;
		for(let i in data.userConfig.RadioFrequencyPath)
		{
			if(highestTemp < data.userConfig.RadioFrequencyPath[i].Temperature)
			{
				highestTemp = data.userConfig.RadioFrequencyPath[i].Temperature;
			}
		}
		
		return highestTemp;
	}catch(error)
	{
		console.log("error getting highest temperature")
		console.log(error);
	}
}



module.exports = {
	initMap, createNewUserConfigMap, getUserConfig, updateUserConfig, 
	getUserConfig, getUserPath, getUserIpSettings, getUserIsUnitOn, getUserBuildInfo, 
	saveUserDataMap, getUserUnitName, getUserSystemInfo, 
	getOpfill, uploadOpfill, getPassword, setPassword, saveOpfill, destroyOpfill, 
	updateUnitOverallAlarm, getUnitOverallAlarm, getCurrentOpfill, getBatteryCharging,
	updateUnitOverallAlarmType, getCovertMode, getBuzzLedMode, getTxButtonOnState, getPowerSource,
	getPaHighestTemp, updateUnitOverallWarning, updateUnitOverallWarningType, saveToMemDataJson, 
	getUserIsTransmitting, getSavingStatus, latchNarrowSweepAlert, acknowledgeNarrowSweepAlert, importDdsStepRampAtStartup
}
