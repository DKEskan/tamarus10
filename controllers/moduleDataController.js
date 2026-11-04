const { group } = require('console');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path'); 
const readline = require('readline');

const data = {
    moduleMap: require('../model/moduleMap.json'),
    setModuleMap: function (data) { this.moduleMap = data },
};

const alarmsCode = 
{
    Bus_Module_Comms: 0,
    TX_Start: 1,
    Fan_Control: 2
}

const warningsCode = {}

const statusCode = 
{
    PG_VIN: 0
}

const OK = 0;
const ERROR = null;

function initMap() //add new module to map
{   
	data.moduleMap.ddsCount = 0;
	data.moduleMap.paCount = 0;
	data.moduleMap.fanCount = 0;
	data.moduleMap.distributionCount = 0,
    data.moduleMap.CuPowerCount = 0,
    data.moduleMap.CuInterfaceCount = 0,
    data.moduleMap.protectionCount = 0,
    data.moduleMap.powerCount = 0,
    data.moduleMap.OverallAlarm = [],
	data.moduleMap.System = {
        buildInfo: {
            "Barcode":"ABCD3210AB",
            "Version":999,
            "SerialNumber":"ESK7654321",
            "Firmware":"0.0.0"
        },
        status: {
            overallStatusVal:4,
            overallStatus:"OK",
            alarmsVal:0,
            alarms:{},
            statusVal:0,
            status:{},
            warningsVal:0,
            warnings:{}
        },
        config: {
            PaTargetTemp:51,
            PaTempHyst:6
        },
        uartCommsAlarms: {
            CuPowerVal: 0,
            distriVal: 0,
            fanVal: 0,
            paVal: 0,
            ddsVal: 0,
            CuInterfaceVal: 0,
            protectionVal: 0,
            powerVal: 0
          }
    };
	data.moduleMap.modules = [];
}

function createNewModuleMap(newModuleAddr, moduleType) //add new module to map. Count modules included
{ 
	for(let i in data.moduleMap)
	{  
		if (data.moduleMap.modules[i]?.address === newModuleAddr) 
		{
            console.log("skipped a CU Interface");
			return;
		}
	}
    if(newModuleAddr === 0x50)
    {
        console.log("mapped a CU Interface");
    }
    const newModule = {
        id: data.moduleMap?.modules.length ? data.moduleMap.modules[Object.keys(data.moduleMap.modules).length - 1].id + 1: 1,  //use next free number
        address: "0x" + newModuleAddr.toString(16),
        buildInfo: {},
        status: {},
        config: {}
    }

    data.moduleMap[moduleType] = data.moduleMap[moduleType] + 1;	//increment count for module type.
    data.moduleMap.modules[newModule.id - 1] = newModule;
}

function getModuleMap()
{
    const jsonMap = data.moduleMap;
    
    if (!jsonMap) {
        console.log(`Config not found`);
        return "cannot find config";
    }
	return jsonMap;
}

function saveModuleMap()
{
    try{   
        if(fs.existsSync(path.join(__dirname, '..', 'model', 'moduleMap.json')))   //check the file is where it should be
        {
        	let mapData = data.moduleMap;
        	console.log(mapData);
        	console.log("exists");
        	try {        
                //WARNING - in dev mode using Nodemon, writing to the file will restart software as there is a change in the file.
			  	fs.writeFileSync(path.join(__dirname, '..', 'model', 'moduleMap.json'), JSON.stringify(mapData, null, 2), 'utf8'); //overwrite file data with new settings
                console.log('Module Map Data successfully saved to disk');
			}catch(error) {
			  	console.log('An error has occurred ', error);
			}
        	
            return OK;
        }
        else{
            console.log("no module map file");
            return ERROR;   
        }
    }catch(err){
        console.log(err);
        return ERROR;   
    }
}

function getActiveModule(getId) {
    for(let i = 0; i < 255; i++)
    {
        if(data.moduleMap?.modules[i]?.id === getId)
        {
            return Number(data.moduleMap.modules[i].address);
        }
    }
    
    return ERROR; 
}

function getFanCount() {
    return parseInt(data.moduleMap.fanCount); 
}

function getPathCount() {
    return parseInt(data.moduleMap.ddsCount); 
}

function getDdsCount() {
    return parseInt(data.moduleMap.ddsCount); 
}

function getPaCount() {
    return parseInt(data.moduleMap.paCount); 
}

function TxDdsOffStateCheck()
{
    const dds = require('../middleware/unitModules/dds');

    const jsonConfig = data.moduleMap.modules;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return ERROR;
    }

    let success = ERROR;
    let count = 0;
    let ddsNum = getDdsCount();

    try
    {
        for(let moduleId = 0; moduleId < jsonConfig.length; moduleId++)
        {
            if(dds.isModule(jsonConfig[moduleId].address)) 
            {
                if(jsonConfig[moduleId].status.warnings.Output_Muted == "Warning")
                {
                    count++;
                }
                else //one value not set correcly, not finished yet
                {
                    break;
                }
            }
        }
        if(count === ddsNum)
        {
            success = OK;
            console.log("Set DDS Off OK");
        }
    }catch(error)
    {
        console.log("TxDdsOffStateCheck Error");
        console.log(error);
    }

    return success;
}

// function TxDdsOnStateCheck(currentOpFill)
// {
//     const dds = require('../middleware/unitModules/dds');
//     const jsonConfig = data.moduleMap.modules;
    
//     if (!jsonConfig) {
//         console.log(`config not found`);
//         return ERROR;
//     }

//     let success = ERROR;
//     let count = 0;
//     let freqCount = 0;

//     let ddsNum = getDdsCount();
//     let IsPathOn = false;
    
//     try{
//         for(let moduleId = 0; moduleId < jsonConfig.length; moduleId++)
//         {
//             if(dds.isModule(jsonConfig[moduleId].address))
//             {
//             	// console.log(jsonConfig[moduleId].address);
//                 // console.log(jsonConfig[moduleId].status.warnings.Output_Muted);
//                 if(jsonConfig[moduleId].status.warnings.Output_Muted === "OK") 
//                 {
//                     IsPathOn = true;
//                 }
//                 else
//                 {
//                     IsPathOn = false;
//                 }

//                 let path = jsonConfig[moduleId].address-dds.ModuleIdRange.MIN; //use path as comparison, otherwise the other of the moduleId can break the software

//                 if((IsPathOn === currentOpFill.RadioFrequencyPath[path].IsPathOn) && (currentOpFill.RadioFrequencyPath[path].IsPathOn === true)) //path on, check frequencies are correct         
//                 {
//                     for(let i = 0; i < (currentOpFill.RadioFrequencyPath[path].FrequencyRange).length; i++)
//                     {
//                         if( ((jsonConfig[moduleId].config?.SweepMultiStartFreq_kHz?.[i]) === ((currentOpFill.RadioFrequencyPath[path].FrequencyRange[i].Lower))) &&
//                             ((jsonConfig[moduleId].config?.SweepMultiStopFreq_kHz?.[i]) === ((currentOpFill.RadioFrequencyPath[path].FrequencyRange[i].Upper)))  )
//                         {
                            
//                             freqCount++;
//                         }
//                         else //one value not set correcly, not finished yet
//                         {
//                             // console.log("count inc expected");
//                             // console.log((currentOpFill.RadioFrequencyPath[path].FrequencyRange[i].Lower));
//                             // console.log((currentOpFill.RadioFrequencyPath[path].FrequencyRange[i].Upper));

//                             // console.log("count inc received");
//                             // console.log((jsonConfig[moduleId].config?.SweepMultiStartFreq_kHz?.[i]));
//                             // console.log((jsonConfig[moduleId].config?.SweepMultiStopFreq_kHz?.[i]));
//                             break;
//                         }
//                     }
                    
//                     if(freqCount === (currentOpFill.RadioFrequencyPath[path].FrequencyRange).length)
//                     {
//                         count++;
//                     }
//                     // else
//                     // {
//                     //     console.log("count inc");
//                     //     console.log((currentOpFill.RadioFrequencyPath[path].FrequencyRange).length);
//                     // }
//                     freqCount = 0;
//                 }
//                 else if(IsPathOn === currentOpFill.RadioFrequencyPath[path].IsPathOn)	//PA Off, don't validate frequencies
//                 {
//                 	count++;
//                 }
//                 else    //one value not set correcly, not finished yet
//                 {
//                     break;
//                 }
//             }
//         }
//     }
//     catch(error){
//         console.log("IsTxDdsOn error");
//         console.log(error);
//     }

//     if(count === ddsNum)
//     {
//         success = OK; 
//         console.log("Set DDS On OK");
//     }

//     // console.log("count");
//     // console.log(count);
//     // console.log("ddsNum");
//     // console.log(ddsNum);
//     return success;
// }

function TxDdsOnStateCheck(currentOpFill)
{
    const dds = require('../middleware/unitModules/dds');
    const modules = data.moduleMap.modules;

    if(!Array.isArray(modules) ||
       !Array.isArray(currentOpFill?.RadioFrequencyPath))
    {
        return ERROR;
    }

    let count = 0;
    const ddsNum = getDdsCount();

    for(const module of modules)
    {
        if(!dds.isModule(module.address))
        {
            continue;
        }

        const path = Number(module.address) - dds.ModuleIdRange.MIN;
        const expectedPath = currentOpFill.RadioFrequencyPath[path];
        const config = module.config;
        const muteStatus = module.status?.warnings?.Output_Muted;

        if(!expectedPath ||
           typeof expectedPath.IsPathOn !== "boolean")
        {
            return ERROR;
        }

        // Missing status must not be treated as confirmed muted.
        if(muteStatus !== "OK" && muteStatus !== "Warning")
        {
            return ERROR;
        }

        const isPathOn = muteStatus === "OK";

        if(isPathOn !== expectedPath.IsPathOn)
        {
            return ERROR;
        }

        // Disabled paths only need confirmation that output is muted.
        if(!expectedPath.IsPathOn)
        {
            count++;
            continue;
        }

        if(!config || !Array.isArray(expectedPath.FrequencyRange))
        {
            return ERROR;
        }

        // Match SetSweepConfig's treatment of trailing unused pairs.
        const expectedRanges = [];
        let reachedUnusedPair = false;

        for(const range of expectedPath.FrequencyRange)
        {
            if(!range)
            {
                return ERROR;
            }

            if(range.Lower === null && range.Upper === null)
            {
                reachedUnusedPair = true;
                continue;
            }

            if(reachedUnusedPair ||
               !Number.isInteger(range.Lower) ||
               !Number.isInteger(range.Upper))
            {
                return ERROR;
            }

            expectedRanges.push(range);
        }

        let frequenciesMatch = false;

        if(expectedPath.Mode === "CW")
        {
            frequenciesMatch =
                config.Operating_Mode === 0 &&
                expectedRanges.length === 1 &&
                expectedRanges[0].Lower === expectedRanges[0].Upper &&
                config.CW_Freq === expectedRanges[0].Lower;
        }
        else if(expectedPath.Mode === "Sweep")
        {
            frequenciesMatch =
                config.Operating_Mode === 1 &&
                expectedRanges.length <= 6 &&
                config.No_of_Active_Sweeps === expectedRanges.length &&
                expectedRanges.every((range, i) =>
                    config[`Sweep${i + 1}StartFreq`] === range.Lower &&
                    config[`Sweep${i + 1}StopFreq`] === range.Upper
                );
        }

        if(!frequenciesMatch)
        {
            return ERROR;
        }

        count++;
    }

    if(count === ddsNum)
    {
        console.log("Set DDS On OK");
        return OK;
    }

    return ERROR;
}

function TxPaOnStateCheck(currentOpFill)
{
    const pa = require('../middleware/unitModules/pa');
    const jsonConfig = data.moduleMap.modules;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return ERROR;
    }

    let success = ERROR;
    let count = 0;

    let paNum = getPaCount();
   
    try{
        for(let moduleId = 0; moduleId < jsonConfig.length; moduleId++)
        {
            if(pa.isModule(jsonConfig[moduleId].address))
            {
                let path = jsonConfig[moduleId].address-pa.ModuleIdRange.MIN; //use path as comparison, otherwise the other of the moduleId can break the software
                // console.log(jsonConfig[moduleId].address);
                // console.log(currentOpFill.RadioFrequencyPath[1].IsPathOn);
                // console.log(currentOpFill.RadioFrequencyPath[path].Power);
                // console.log(jsonConfig[moduleId].status.TxState);
                //if path is off, the PA is set to outputlevel 0, status shows Off correct setting
                //If output power is the same as current op fill value, status shows TX correct setting correct setting
                if( ((currentOpFill.RadioFrequencyPath[path].IsPathOn === false) && (jsonConfig[moduleId].config.SetRfLevel === 0) && (jsonConfig[moduleId].status.TxState === "OFF")) || 
                    ((currentOpFill.RadioFrequencyPath[path].IsPathOn === true) && (jsonConfig[moduleId].config.SetRfLevel === currentOpFill.RadioFrequencyPath[path].Power) && (jsonConfig[moduleId].status.TxState === "TX"))  )        
                {
                    count++;
                }
                else //one value not set correcly, not finished yet
                {
                	//console.log(jsonConfig[moduleId].address);
                    //console.log(moduleId);
	                //console.log(currentOpFill.RadioFrequencyPath[path].IsPathOn);
	                //console.log(currentOpFill.RadioFrequencyPath[path].Power);
	                //console.log(jsonConfig[moduleId].config.SetRfLevel);
	                //console.log(jsonConfig[moduleId].status.TxState);
                    break;
                }
            }
        }
        if(count === paNum)
        {
            success = OK; 
            // console.log("Set PA On OK");
        }
        // else
        // {
        //     console.log("Count");
        //     console.log(count);
        // }
    }catch(error)
    {
        console.log("TxPaStateCheck Error");
        console.log(error);
    }

    return success;
}

function TxPaOffStateCheck()
{
    const pa = require('../middleware/unitModules/pa');
    const jsonConfig = data.moduleMap.modules;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return ERROR;
    }

    let success = ERROR;
    let count = 0;

    let paNum = getPaCount();

    try{
        for(let moduleId = 0; moduleId < jsonConfig.length; moduleId++)
        {
            if(pa.isModule(jsonConfig[moduleId].address))
            {
                //Set RF level reported should be 0 and TX state off
                if((jsonConfig[moduleId].config.SetRfLevel === 0) && (jsonConfig[moduleId].status.TxState === "OFF"))
                {
                    count++;
                }
                else //one value not set correcly, not finished yet
                {
                    break;
                }
            }
        }
        if(count === paNum)
        {
            success = OK; 
            // console.log("Set PA On OK");
        }
        // else
        // {
        //     console.log("Count");
        //     console.log(count);
        // }
    }catch(error)
    {
        console.log("TxPaStateCheck Error");
        console.log(error);
    }

    return success;
}

function getAlarmedModules()
{
    const jsonConfig = data.moduleMap;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return ERROR;
    }

    let alarmedAddresses = [];
    
    if(jsonConfig.System.status.overallStatusVal&1)
    {
        alarmedAddresses.push(0x04);
    }

    let modules = 0;
    try{
        for(modules = 0; modules < jsonConfig.modules.length; modules++)
        {
            if(jsonConfig.modules[modules].status.overallStatusVal&1)
            {
                alarmedAddresses.push(Number(jsonConfig.modules[modules].address));
            }
        }
    }catch(error){
        console.error(error);
        console.error("Get overall alarm error");
        console.error(`module target: ${modules}`);
    }

    return alarmedAddresses;
}

function getPowerPcbWarning()
{
    const jsonConfig = data.moduleMap;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return ERROR;
    }

    try{
        for(let modules = 0; modules < jsonConfig.modules.length; modules++)
        {
            if((jsonConfig.modules[modules].address === "0x60") && (jsonConfig.modules[modules].status.overallStatusVal&2))
            {
                return true;
            }
        }
    }catch(error){
        console.error(error);
        console.error("Get Power PCB warning error");
    }
    
    return false;
}

function getVoltages() {

    const jsonConfig = data.moduleMap.System.status;
    
    if (!jsonConfig) {
        console.log(`config not found`);
        return ERROR;
    }

    let response = {};
	response.V_3V3 = jsonConfig.V_3V3;
	response.V_3V3P = jsonConfig.V_3V3P;
	response.V_SOM3V3 = jsonConfig.V_SOM3V3;
	response.I_SOM3V3 = jsonConfig.I_SOM3V3;
	return response;
}

function getPaTempHyst()
{
    try{
        const jsonConfig = data.moduleMap.System.config;
        
        if (!jsonConfig) {
            console.log(`module config not found`);
            return ERROR;
        }

        return jsonConfig.PaTempHyst;

    }catch(error)
    {
        console.log("error getting Pa Temperature Hysterisis");
        console.log(error);
    }
}

function getPaTargetTemp()
{
    try{
        const jsonConfig = data.moduleMap.System.config;
        
        if (!jsonConfig) {
            console.log(`module config not found`);
            return ERROR;
        }

        return jsonConfig.PaTargetTemp;

    }catch(error)
    {
        console.log("error getting Pa Temperature Threshold");
        console.log(error);
    }
}

function getProtFanState()
{
    try{
        const jsonConfig = data.moduleMap.modules
        
        if (!jsonConfig) {
            console.log(`module config not found`);
            return ERROR;
        }
	
        for(let i in jsonConfig)
        {
            if(jsonConfig[i].address === "0x4F")
            {
            	if(typeof jsonConfig[i].config.IsSupplyEnable === 'undefined') //return false if module is not yet polled
            	{
            		return false;
            	}
                return jsonConfig[i].config.IsSupplyEnable;
            }
        }
        console.log("Protection board fan control module not found");
        return false;

    }catch(error)
    {
        console.log("error getting Pa Temperature Threshold");
        console.log(error);
    }
}

/*
take in JSON object and update current json object
*/
function updateModuleConfig(updateData)
{
    try{
        for(let index in data.moduleMap.modules)
        {
            if(data.moduleMap.modules[index].address === updateData.address)
            {
                for(let modIndex in updateData)	//search key within array
                {
                    for(let vals in updateData[modIndex])	//search key within array
                    {
                        
                        data.moduleMap.modules[index][modIndex][vals] = updateData[modIndex][vals];	//replace values
                        
                    }
                }
                break;
            }
        }
        if("status" in updateData)  //update alarms before overwriting
        {
            updateOverallAlarm();
        }
    }catch(error){
        console.error("module not mapped");
        console.error(updateData);
    }
}

function updateCarrierConfig(updateData)
{
    try{
        for(let index in updateData)
        {        
        	for(let vals in updateData[index])	//search key within array
            {
                data.moduleMap.System[index][vals]= updateData[index][vals];	//replace values
                    
            }
        }
        if("status" in updateData)
        {
            updateOverallAlarm();
        }
    }catch(error){
        console.error("carrier not mapped");
        console.error(updateData);
    }
}

function updateConfig(updateData)
{
    try{
        for(let index in updateData)
        {
            for(let vals in updateData[index])	//search key within array
            {
                data.moduleMap[index][vals]= updateData[index][vals];	//replace values
                    
            }
        }
    }catch(error){
        console.error("not mapped");
        console.error(updateData);
    }
}

// TO DO - MOVE TO OWN CARRIER MODULE FILE???
function UpdateUartCommsAlarm(moduleType,moduleNum,set)
{
    if(path > 16)
    {
        console.log("path cannot be greater than 16");
    }
    if(moduleType === "pa")
    {
        if(set === 1)
        {   
            data.moduleMap.System.uartCommsAlarms.paVal |= 1 << moduleNum;
        }
        else if(set === 0)
        {
            data.moduleMap.System.uartCommsAlarms.paVal &= ~(1 << moduleNum);
        }
        else
        {
            console.log("incorrect set input");
        }
    }      
    else if(moduleType === "dds")
    {
        if(set === 1)
        {   
            data.moduleMap.System.uartCommsAlarms.ddsVal |= 1 << moduleNum;
        }
        else if(set === 0)
        {
            data.moduleMap.System.uartCommsAlarms.ddsVal &= ~(1 << moduleNum);
        }
        else
        {
            console.log("incorrect set input");
        }
    }     
    else if(moduleType === "fan")
    {
        if(set === 1)
        {   
            data.moduleMap.System.uartCommsAlarms.fanVal |= 1 << moduleNum;
        }
        else if(set === 0)
        {
            data.moduleMap.System.uartCommsAlarms.fanVal &= ~(1 << moduleNum);
        }
        else
        {
            console.log("incorrect set input");
        }
    }   
    else if(moduleType === "distribution")
    {
        if(set === 1)
        {   
            data.moduleMap.System.uartCommsAlarms.distriVal |= 1 << moduleNum;
        }
        else if(set === 0)
        {
            data.moduleMap.System.uartCommsAlarms.distriVal &= ~(1 << moduleNum);
        }
        else
        {
            console.log("incorrect set input");
        }
    }   
    else if(moduleType === "CuPower")
    {
        if(set === 1)
        {   
            data.moduleMap.System.uartCommsAlarms.CuPowerVal |= 1 << moduleNum;
        }
        else if(set === 0)
        {
            data.moduleMap.System.uartCommsAlarms.CuPowerVal &= ~(1 << moduleNum);
        }
        else
        {
            console.log("incorrect set input");
        }
    }  
    else if(moduleType === "cuInterface")
    {
        if(set === 1)
        {   
            data.moduleMap.System.uartCommsAlarms.CuInterfaceVal |= 1 << moduleNum;
        }
        else if(set === 0)
        {
            data.moduleMap.System.uartCommsAlarms.CuInterfaceVal &= ~(1 << moduleNum);
        }
        else
        {
            console.log("incorrect set input");
        }
    }  
    else if(moduleType === "protection")
    {
        if(set === 1)
        {   
            data.moduleMap.System.uartCommsAlarms.protectionVal |= 1 << moduleNum;
        }
        else if(set === 0)
        {
            data.moduleMap.System.uartCommsAlarms.protectionVal &= ~(1 << moduleNum);
        }
        else
        {
            console.log("incorrect set input");
        }
    }  
    else if(moduleType === "power")
    {
        if(set === 1)
        {   
            data.moduleMap.System.uartCommsAlarms.powerVal |= 1 << moduleNum;
        }
        else if(set === 0)
        {
            data.moduleMap.System.uartCommsAlarms.powerVal &= ~(1 << moduleNum);
        }
        else
        {
            console.log("incorrect set input");
        }
    } 
    else
    {
        console.log("unknown module type")
    }
    
    if( data.moduleMap.System.uartCommsAlarms.paVal || data.moduleMap.System.uartCommsAlarms.ddsVal ||
	    data.moduleMap.System.uartCommsAlarms.fanVal || data.moduleMap.System.uartCommsAlarms.distriVal || 
	    data.moduleMap.System.uartCommsAlarms.CuPowerVal || data.moduleMap.System.uartCommsAlarms.CuInterfaceVal ||
        data.moduleMap.System.uartCommsAlarms.protectionVal || data.moduleMap.System.uartCommsAlarms.powerVal)
    {
        updateCarrierStatus("alarm", alarmsCode.Bus_Module_Comms, 1);
    }
}

// TO DO - MOVE TO OWN CARRIER MODULE FILE???
function updateCarrierStatus(statusParam, code, set)
{
    if((statusParam === "alarm") && ((set === 1) || (set === 0)))
    {
        if(set === 1)
        {   
            data.moduleMap.System.status.alarmsVal |= 1 << code;
        }

        data.moduleMap.System.status.alarms = {Bus_Module_Comms:"", TX_Start:"", Fan_Control:""};

        (data.moduleMap.System.status.alarmsVal&(1<<alarmsCode.Bus_Module_Comms)) ? data.moduleMap.System.status.alarms.Bus_Module_Comms = "FAULT" : data.moduleMap.System.status.alarms.Bus_Module_Comms = "OK";
        (data.moduleMap.System.status.alarmsVal&(1<<alarmsCode.TX_Start)) ? data.moduleMap.System.status.alarms.TX_Start = "FAULT" : data.moduleMap.System.status.alarms.TX_Start = "OK";
        (data.moduleMap.System.status.alarmsVal&(1<<alarmsCode.Fan_Control)) ? data.moduleMap.System.status.alarms.Fan_Control = "FAULT" : data.moduleMap.System.status.alarms.Fan_Control = "OK";
    }
    else if((statusParam === "warning") && ((set === 1) || (set === 0)))
    {
        //No warnings required, Template left here for use if required
        data.moduleMap.System.status.warningsVal = 0;
        // if(set === 1)
        // {
        //     data.moduleMap.System.status.warningsVal |= 1 << code;
        // }
        // else
        // {
        //     data.moduleMap.System.status.warningsVal &= ~(1 << code);
        // }

       // data.moduleMap.System.status.warning = {NoWarningsRequired:""};

       // (data.moduleMap.System.status.warningsVal&(1<<warningsCode.NoWarningsRequired)) ? data.moduleMap.System.status.warning.NoWarningsRequired = "Warning" : data.moduleMap.System.status.warning.NoWarningsRequired = "OK";
    }
    else if((statusParam === "status") && ((set === 1) || (set === 0)))
    {
        if(set === 1)
        {
            data.moduleMap.System.status.statusVal |= 1 << code;
        }
        else
        {
            data.moduleMap.System.status.statusVal &= ~(1 << code);
        }

        data.moduleMap.System.status.status = {PG_VIN:""};

        (data.moduleMap.System.status.statusVal&(1<<statusCode.PG_VIN)) ? data.moduleMap.System.status.status.PG_VIN = "OK" : data.moduleMap.System.status.status.PG_VIN = "Alarm";
    }
    else
    {
        console.log("statusParam input, code input, or set input incorrect");
    }

    // Update status Overall Value

    // If any alarm is set
    if (data.moduleMap.System.status.alarmsVal & 0x0F)
    {
        // Set overall alarm bit
        data.moduleMap.System.status.overallStatusVal |= (1 << 0);
    }
    
    //console.log(let i in data.moduleMap.System.uartCommsAlarms)
    for(let i in data.moduleMap.System.uartCommsAlarms)
    {	
    	if(data.moduleMap.System.uartCommsAlarms[i] === 1)
    	{
	        // Set overall alarm bit
        	data.moduleMap.System.status.overallStatusVal |= (1 << 0);
        	break;
    	}
    }

    // Warnings to follow .....
    if (data.moduleMap.System.status.warningsVal & 0x01)
    {
        // Set overall warning bit
        data.moduleMap.System.status.overallStatusVal |= (1 << 1);
    }

    // If all status is good

    if ((data.moduleMap.System.status.statusVal & 0x01) == 0x01)
    {
        data.moduleMap.System.status.overallStatusVal |= (1 << 2);
    }
    
    switch(data.moduleMap.System.status.overallStatusVal)
	{
		case 0b001 : 
			data.moduleMap.System.status.overallStatus = "Alarm";	
			break;
		case 0b010 :
			data.moduleMap.System.status.overallStatus = "Warning";	
			break;
		case 0b100 :
			data.moduleMap.System.status.overallStatus = "Status OK";	
			break;
		case 0b110 :
			data.moduleMap.System.status.overallStatus = "Status OK, Warning";	
			break;
		case 0b101 :
			data.moduleMap.System.status.overallStatus = "Status OK, Alarm";	
			break;
		case 0b111 :
			data.moduleMap.System.status.overallStatus = "Status OK, Warning, Alarm";	
			break;
		default : 
			console.log("ModuleDataController Unknown state CU");
			console.log(data.moduleMap.System.status.overallStatusVal);
			data.moduleMap.System.status.overallStatus = "Unknown Alarm State";	
			break;
	}
}

function clearCarrierAlarms()
{
    data.moduleMap.System.uartCommsAlarms.CuPowerVal = 0;
    data.moduleMap.System.uartCommsAlarms.distriVal = 0;
    data.moduleMap.System.uartCommsAlarms.fanVal = 0;
    data.moduleMap.System.uartCommsAlarms.paVal = 0;
    data.moduleMap.System.uartCommsAlarms.ddsVal = 0;
    data.moduleMap.System.uartCommsAlarms.CuInterfaceVal = 0;
    data.moduleMap.System.uartCommsAlarms.protectionVal = 0;
    data.moduleMap.System.uartCommsAlarms.powerVal = 0;

    data.moduleMap.System.status.overallStatusVal &= ~(1 << 0);

	switch(data.moduleMap.System.status.overallStatusVal)
	{
		case 0b001 : 
			data.moduleMap.System.status.overallStatus = "Alarm";	
			break;
		case 0b010 :
			data.moduleMap.System.status.overallStatus = "Warning";	
			break;
		case 0b100 :
			data.moduleMap.System.status.overallStatus = "Status OK";	
			break;
		case 0b110 :
			data.moduleMap.System.status.overallStatus = "Status OK, Warning";	
			break;
		case 0b101 :
			data.moduleMap.System.status.overallStatus = "Status OK, Alarm";	
			break;
		case 0b111 :
			data.moduleMap.System.status.overallStatus = "Status OK, Warning, Alarm";	
			break;
		default : 
			console.log("ModuleDataController Unknown state CU");
			console.log(data.moduleMap.System.status.overallStatusVal);
			data.moduleMap.System.status.overallStatus = "Unknown Alarm State";	
			break;
	}

    data.moduleMap.System.status.alarmsVal = 0;
    data.moduleMap.System.status.alarms = {Bus_Module_Comms:"", TX_Start:"", Fan_Control:""};
    data.moduleMap.System.status.alarms.Bus_Module_Comms = "OK";
    data.moduleMap.System.status.alarms.TX_Start = "OK";
    data.moduleMap.System.status.alarms.Fan_Control = "OK";
}

let WarningBlockFlag = 0;
function WarningBlockTimeout()
{
  WarningBlockFlag = 0;
}

const ResetOptions = 
{
    None: 0,
    Warnings:1,
    Alarms: 2   
}

function updateOverallAlarm(resetAlarms)
{
    //could be optimised to update only the module with the status response
    const userDataController = require('./userDataController');
    const buzzLedHandler = require('./../middleware/buzzLedHandler');
    const uiWebSocket = require('./../middleware/uiWebSocket');
    const power = require('../middleware/unitModules/power');
    const WARNING = true;
    const ALARM = true;
    const OK = false;
    try{
        if(resetAlarms === ResetOptions.Alarms)  //global reset of alarms
        {
            for(let i in data.moduleMap.modules)
            {
                data.moduleMap.modules[i].status.overallStatusVal &= ~(1 << 0);
                userDataController.updateUnitOverallAlarm(OK);
            }
        }
        else if(resetAlarms === ResetOptions.Warnings)
        {
            data.moduleMap.modules[25].status.overallStatusVal &= ~(1 << 0);
            userDataController.updateUnitOverallWarning(OK);

            if(WarningBlockFlag === 0)
            {
                power.SetClearAlarms(0x60, null);
                uiWebSocket.sendButtonUpdate("U");

                WarningBlockFlag = 1;
                setTimeout(WarningBlockTimeout, 600000);	//10min timeout
            }
        }
        else
        {
            let alarmActive = false;

            //reset overall alarm list to empty. If alarm still current, it will be re-added.
            data.moduleMap.OverallAlarm = [];

            //CU check
            if((data.moduleMap.System.status.overallStatusVal&1) === 1) //if alarm is in overall status
            {              
                alarmActive = true;
                for(let alarmIndex = 0; alarmIndex < (Object.keys(data.moduleMap.System.status.alarms).length); alarmIndex++)   //go through each alarm status
                {
                    if(	(Object.values(data.moduleMap.System.status.alarms)[alarmIndex] === "FAULT") &&     //if fault, add to overall alarms list if not there yet
                        ((data.moduleMap.OverallAlarm).includes(Object.keys(data.moduleMap.System.status.alarms)[alarmIndex]) === false) )
                    {
                        (data.moduleMap.OverallAlarm).push(Object.keys(data.moduleMap.System.status.alarms)[alarmIndex]);                                
                    }
                }  
            }
            
            for(let i in data.moduleMap.modules)    //overall alarm check on each status response
            {   
                if((data.moduleMap.modules[i].status.overallStatusVal&1) === 1) //if alarm in overall status
                {
                    alarmActive = true;
                    
                    for(let alarmIndex = 0; alarmIndex < (Object.keys(data.moduleMap.modules[i].status.alarms).length); alarmIndex++) //go through each alarm status
	                {
	                    if(	(Object.values(data.moduleMap.modules[i].status.alarms)[alarmIndex] === "FAULT") &&   //if fault, add to overall alarms list if not there yet
	                        ((data.moduleMap.OverallAlarm).includes(Object.keys(data.moduleMap.modules[i].status.alarms)[alarmIndex]) === false) )
	                    {
	                        (data.moduleMap.OverallAlarm).push(Object.keys(data.moduleMap.modules[i].status.alarms)[alarmIndex]);                                
	                    }
	                }                
                }
            }

            //currently only triggers on low battery, skip checking all modules
            let warningActive = false;
            if(data.moduleMap.modules[25].status.overallStatusVal&(1<<1))   //only one warning watched currently. Warnings not designed for user notifications
            {
                for(let warningIndex = 0; warningIndex < (Object.keys(data.moduleMap.modules[25].status.warnings).length); warningIndex++)
                {
                    if( (Object.values(data.moduleMap.modules[25].status.warnings)[warningIndex] === "Warning") &&
                        (Object.keys(data.moduleMap.modules[25].status.warnings)[warningIndex] === "Low_Battery") )
                    {
                        warningActive = true;   //only pulse buzzer on low battery                              
                    }
                }  
            }  

            //re-enable if all warnings are used
            // for(let i in data.moduleMap.modules)    //overall alarm check on each status response
            // {   
            //     if((data.moduleMap.modules[i].status.overallStatusVal&(1<<1)))
            //     {                    
            //         for(let warningIndex = 0; warningIndex < (Object.keys(data.moduleMap.modules[i].status.warnings).length); warningIndex++)
	        //         {
	        //             if( (Object.values(data.moduleMap.modules[i].status.warnings)[warningIndex] === "Warning") &&
            //                 (Object.keys(data.moduleMap.modules[i].status.warnings)[warningIndex] === "Low_Battery") )
	        //             {
            //                 warningActive = true;   //only pulse buzzer on low battery                              
	        //             }
	        //         }                
            //     }
            // }
            
            if(alarmActive === true)
            {
                userDataController.updateUnitOverallAlarm(ALARM);
                if((data.moduleMap.OverallAlarm).includes("Antenna_Connection"))  //specific case to prioritise original unit behaviour
                {
                    userDataController.updateUnitOverallAlarmType(("Antenna_Connection").replace(/_/g, ' ') + " Fault!");
                }
                else if((data.moduleMap.OverallAlarm).includes("Flat_Battery")) //specific case to prioritise original unit behaviour
                {
                    userDataController.updateUnitOverallAlarmType(("Flat_Battery").replace(/_/g, ' ') + " Fault!");
                }
                else
                {
                    if(data.moduleMap.OverallAlarm.length === 0)
                    {
                        userDataController.updateUnitOverallAlarmType("Unit Fault!");   //if unexpected empty alarm leaks through, cover error case
                    }
                    else
                    {
                        userDataController.updateUnitOverallAlarmType((data.moduleMap.OverallAlarm[0]).replace(/_/g, ' ') + " Fault!");
                    }
                }
            }
            else
            {
                userDataController.updateUnitOverallAlarm(OK);
                userDataController.updateUnitOverallAlarmType("");
                data.moduleMap.OverallAlarm = [];
            }

            if(warningActive === true)  //not fully integrated for all warnings, just specific one
            {
                userDataController.updateUnitOverallWarning(WARNING);
                userDataController.updateUnitOverallWarningType("Low Battery Warning!");
            }
            else
            {
                userDataController.updateUnitOverallWarning(OK);
                userDataController.updateUnitOverallWarningType("");
            }

            if(alarmActive === true)
            {
                buzzLedHandler.buzzLedStateOn("on");
            }
            else if(warningActive === true)
            {
                if((WarningBlockFlag === 0))
                {
                    buzzLedHandler.buzzLedStateOn("pulse");
                }
            }
            else if((alarmActive === false) && (warningActive === false))
            {
                buzzLedHandler.buzzLedStateOff();
            }
        }          
    }catch(error){
        console.error("Update module overall alarm error");
        console.error(error);
    }
}

function clearAlarms()
{
    const pa = require('../middleware/unitModules/pa');
	const dds = require('../middleware/unitModules/dds');
	const fan = require('../middleware/unitModules/fan');
    const distribution = require('../middleware/unitModules/distribution');
    const CuPower = require('../middleware/unitModules/CuPower');
    const CuInterface = require('../middleware/unitModules/CuInterface');
    const protection = require('../middleware/unitModules/protection');
    const power = require('../middleware/unitModules/power');
    const uart_fp = require('../middleware/uart_fp');

    let alarmedModules = getAlarmedModules();
    console.log("alarmedModules");
    console.log(alarmedModules);
    //no send retries to ensure message gone throguh, alarm recurring state possible. 
    for(let modules = 0; modules < alarmedModules.length; modules++)
    {
        if(pa.isModule(alarmedModules[modules]))
        {
            pa.SetClearAlarms(alarmedModules[modules], null);
        }
        else if(dds.isModule(alarmedModules[modules]))
        {
            dds.SetClearAlarms(alarmedModules[modules], null);
        }
        else if(fan.isModule(alarmedModules[modules]))
        {
            fan.SetClearAlarms(alarmedModules[modules], null);
        }
        else if(distribution.isModule(alarmedModules[modules]))
        {
            distribution.SetClearAlarms(alarmedModules[modules], null);
        }
        else if(CuPower.isModule(alarmedModules[modules]))
        {
            CuPower.SetClearAlarms(alarmedModules[modules], null);
        }
        else if(CuInterface.isModule(alarmedModules[modules]))
        {
            CuInterface.SetClearAlarms(alarmedModules[modules], null);
        }
        else if(protection.isModule(alarmedModules[modules]))
        {
            protection.SetClearAlarms(alarmedModules[modules], null);
        }
        else if(power.isModule(alarmedModules[modules]))
        {
            power.SetClearAlarms(alarmedModules[modules], null);
        }
    }
    
	clearCarrierAlarms(); 
    updateOverallAlarm(ResetOptions.Alarms);

    return OK;
}

const alarmBoardGroups = [
    { min: 0x00, max: 0x00, name: "Distribution", mask: "distriVal" },
    { min: 0x05, max: 0x05, name: "CU Power", mask: "CuPowerVal" },
    { min: 0x10, max: 0x1F, name: "Fan", mask: "fanVal" },
    { min: 0x20, max: 0x2F, name: "DDS", mask: "ddsVal" },
    { min: 0x30, max: 0x3F, name: "PA", mask: "paVal" },
    { min: 0x40, max: 0x4F, name: "Protection", mask: "protectionVal" },
    { min: 0x50, max: 0x50, name: "CU Interface", mask: "CuInterfaceVal" },
    { min: 0x60, max: 0x60, name: "Power", mask: "powerVal" }
];

function getActiveAlarmList()
{
    const map = data.moduleMap;
    const result = [];
    const seen = new Set();

    function addAlarm(address, code)
    {
        const key = `${address}:${code}`;
        if(seen.has(key))return;
        seen.add(key);

        const group = alarmBoardGroups.find(
            item => address >= item.min && address <= item.max
        );


        let board = "Controller";
        
        if(address !== null){
            board = group ? group.name + (group.min === group.max ? "" : address - group.min + 1)
                           : "Module";
            
        };

        result.push({
            id: key,
            board,

            address: address === null ? null : 
                                "0x" + address.toString(16).toUpperCase().padStart(2, "0"),
                                code,
                                description: code === "Bus_Module_Comms"
                                                    ? "Bus Comm Fault"
                                                    : code.replace(/_/g, " ") + " Fault"

        });
    }

    const masks = map.System?.uartCommsAlarms || {};

    for (const group of alarmBoardGroups)
    {
        const bits = Number(masks[group.mask]) || 0;

        for (let address = group.min; address <= group.max; address++)
        {
            if (bits & (1 << (address - group.min)))
            {
                addAlarm(address, "Bus_Module_Comms");
            }
        }
    }

    const hasBoardBusFault = result.some(
        alarm => alarm.code === "Bus_Module_Comms"
    );

    // Controller alarms.
    const systemStatus = map.System?.status;

    if ((systemStatus?.overallStatusVal & 1) === 1)
    {
        for (const [code, state] of Object.entries(systemStatus.alarms || {}))
        {
            if (state !== "FAULT") continue;

            // Avoid a duplicate generic bus fault when boards are known.
            if (code === "Bus_Module_Comms" && hasBoardBusFault) continue;

            addAlarm(null, code);
        }
    }

    // Alarms reported by individual boards.
    for (const module of map.modules || [])
    {
        if ((module.status?.overallStatusVal & 1) !== 1) continue;

        const address = Number(module.address);
        if (!Number.isInteger(address)) continue;

        for (const [code, state] of Object.entries(module.status.alarms || {}))
        {
            if (state === "FAULT")
            {
                addAlarm(address, code);
            }
        }
    }

    const priority = {
        Antenna_Connection: 0,
        Flat_Battery: 1
    };

    result.sort((a, b) =>
    (priority[a.code] ?? 2) - (priority[b.code] ?? 2)
    );

    return result;
}


module.exports = { initMap, createNewModuleMap, getModuleMap, saveModuleMap, getActiveModule, updateConfig, 
                    updateModuleConfig, updateCarrierConfig, getFanCount, getPathCount, getVoltages, 
                    updateCarrierStatus, clearCarrierAlarms, UpdateUartCommsAlarm, updateOverallAlarm, getDdsCount, 
                    getPaCount, getAlarmedModules, getPaTargetTemp, getProtFanState, clearAlarms,
                    TxPaOnStateCheck, TxPaOffStateCheck, TxDdsOnStateCheck, TxDdsOffStateCheck, getActiveAlarmList, getPaTempHyst, getPowerPcbWarning,
                    alarmsCode, warningsCode, statusCode, ResetOptions }