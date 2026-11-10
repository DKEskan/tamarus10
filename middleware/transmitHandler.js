const OK = 0;
const ERROR = null;

const TxPowerStates = 
{  
    TxStart: 0,
	PaSet: 1,
    PaOnCheck: 2,
	DdsFreqSet: 3,
    DdsUnmute: 4,
	DdsOnCheck: 5,
	TxOnComplete: 6,
    TxOn: 7,
    TxStop: 8,
    PaDisabling: 9,
	PaOffCheck: 10,
    DdsMute: 11,
	DdsOffCheck: 12,
	TxOffComplete: 13,
    TxOff: 14
}

const TxNewStates = 
{
    NoChange: 0,
    Start: 1,
    Stop: 2,
    UrgentOff: 3
}

const TxReturnStates = 
{
    StandardPolling: 0,
    TxProcessStateTransitions:1,
    TxProcessPollingGetVals: 2
}


let transmitTimeoutCnt = 0;
let currentState = TxPowerStates.TxOff;

function isTxFullyOff()
{
    return currentState === TxPowerStates.TxOff;
}

let reattempts = 0;
// let paCheckTimeDebug = 0;
function TxState(newState)
{
    const moduleDataController = require('../controllers/moduleDataController');
    const userDataController = require('../controllers/userDataController');
    const uiWebSocket = require('./uiWebSocket');
    const CuInterface = require('./unitModules/CuInterface');

    let currentOpFill = userDataController.getCurrentOpfill();

    let msgTx;
    let Status;
    let errorCode;
    let errorResponse;    
   
    if((newState === TxNewStates.UrgentOff) && (currentState < TxPowerStates.TxStop))  //Make sure TX in process of turning off or turned off
    {
        currentState = TxPowerStates.TxStop;
        console.log("Start TX Process Urgent");
    }
    else if((currentState === TxPowerStates.TxOff) || (currentState === TxPowerStates.TxOn))  //only allow state change once transition process is complete
    {
        if(newState === TxNewStates.Start)    //start transmit process
        {
            currentState = TxPowerStates.TxStart;
            console.log("Start TX Process");
        }
        else if(newState === TxNewStates.Stop)   //stop transmit process
        {
            currentState = TxPowerStates.TxStop;
            console.log("Stop TX Process");
        }
    }

    // if((currentState === TxPowerStates.PaSet) || (currentState !== TxPowerStates.PaOnCheck) ||
    //     (currentState === TxPowerStates.PaOffCheck) || (currentState !== TxPowerStates.PaDisabling))
    // {
    //     paCheckTimeDebug++;
    // }

    try
    {
        switch(currentState)
        {
            case TxPowerStates.TxStart: //Turn on order: turn PA on, Set DDS frequency, unmute DDS, 
                message = {"IsTxLedOn":true};
                msgTx = CuInterface.SetTxLedState(1, message, null);
                Status = msgTx[0];
                errorCode = msgTx[1];
                errorResponse = msgTx[2];
                console.log("TxStart LED... ");
                if(Status === ERROR)
                {
                    if(reattempts === 1) //re-attempt once, then change to off. No PA or DDS set yet 
                    {
                        console.log("Turn on TX LED CU Interface failed");
                        reattempts = 0;
                        transmitTimeoutCnt = 0;
                        currentState = TxPowerStates.TxOff;
                    }
                    else
                    {
                        console.log(`Turn on TX LED CU Interface failed, status ${Status}, error code ${errorCode}, error response ${errorResponse}, re-attempting`)	
                    }
                    reattempts++;
                    break;
                }
                else
                {
                    transmitTimeoutCnt = 0;
                    currentState = TxPowerStates.PaSet;
                    console.log("TxStart LED success");
                }
                break;

            case TxPowerStates.PaSet:
                console.log("PaSet... ");
                if(TxPaOn() === OK)
                {
                    currentState = TxPowerStates.PaOnCheck;
                    // paCheckTimeDebug = 0;
                    console.log("PaSet Success");
                }
                else
                {
                    console.log("TxState PA On error");
                    //should never fail here
                }
                transmitTimeoutCnt = 0;
                break;

            case TxPowerStates.PaOnCheck:
                console.log("PaOnCheck... ");
                if(moduleDataController.TxPaOnStateCheck(currentOpFill.OpFill) === OK)
                {
                    // console.log("PA On Success time count, multiply by 100ms");
                    // console.log(paCheckTimeDebug);
                    console.log("PaOnCheck Success");
                    paCheckTimeDebug = 0;
                    transmitTimeoutCnt = 0;
                    currentState = TxPowerStates.DdsFreqSet;
                }
                else
                {
                    if(transmitTimeoutCnt > 30)   //15s timeout
                    {
                        transmitTimeoutCnt = 0;
                        console.log("TxState PA On check error");
                        currentState = TxPowerStates.TxStop;
                        moduleDataController.updateCarrierStatus("alarm", moduleDataController.alarmsCode.TX_Start, 1);
                    }
                    transmitTimeoutCnt++;
                }
                break;

            case TxPowerStates.DdsFreqSet:
                console.log("DdsFreqSet... ");
                if(TxDdsFreqSet() === OK)
                {
                    currentState = TxPowerStates.DdsUnmute;
                    console.log("DdsFreqSet success");
                }
                else
                {
                    console.log("TxState DDS Frequency set error");
                     //should never fail here
                }
                transmitTimeoutCnt = 0;
                break;

            case TxPowerStates.DdsUnmute:
                console.log("DdsUnmute... ");
                if(TxDdsUnmute() === OK)
                {
                    console.log("DdsUnmute success");
                    currentState = TxPowerStates.DdsOnCheck;
                }
                else
                {
                    console.log("TxState DDS Unmute error");
                    //should never fail here
                }
                transmitTimeoutCnt = 0;
                break;

            case TxPowerStates.DdsOnCheck:
                console.log("DdsOnCheck... ");
                if(moduleDataController.TxDdsOnStateCheck(currentOpFill.OpFill) === OK)
                {
                    transmitTimeoutCnt = 0;
                    console.log("DdsOnCheck success");
                    currentState = TxPowerStates.TxOnComplete;
                }
                else
                {
                    if(transmitTimeoutCnt > 3)   //1.5s timeout
                    {
                        transmitTimeoutCnt = 0;
                        console.log("TxState DDS On check error");
                        currentState = TxPowerStates.TxStop;
                        moduleDataController.updateCarrierStatus("alarm", moduleDataController.alarmsCode.TX_Start, 1);
                    }
                    transmitTimeoutCnt++;
                }
                break;

            case TxPowerStates.TxOnComplete:
                console.log("TxOnComplete... ");
                if(userDataController.updateUserConfig({"IsTransmitting":true}) === OK)
                {
                    console.log("transmit on process complete");
                    uiWebSocket.sendButtonUpdate("U");
                    currentState = TxPowerStates.TxOn;
                }
                else
                {
                    if(reattempts === 1) //re-attempt once, then change to shut down as display will be out of track.
                    {
                        console.log("TX State transmit on complete error");
                        reattempts = 0;
                        transmitTimeoutCnt = 0;
                        currentState = TxPowerStates.TxStop;
                    }
                    else
                    {
                        console.log("TX State transmit on complete error, re-attempting");
                    }
                    reattempts++;
                }
                transmitTimeoutCnt = 0;
                break;

            case TxPowerStates.TxOn:    //stable state for TX ON
                break;

            case TxPowerStates.TxStop:  //Turn off order: turn PA off, mute DDS, 
                console.log("TxStop... ");
                message = {"IsTxLedOn":false};
                msgTx = CuInterface.SetTxLedState(1, message, null);
                Status = msgTx[0];
                errorCode = msgTx[1];
                errorResponse = msgTx[2];
                if(Status === ERROR)
                {
                    console.log(`Turn off TX LED CU Interface failed, status ${Status}, error code ${errorCode}, error response ${errorResponse}`)	
                    //re-attempt once, should never fail here
                    break;
                }
                transmitTimeoutCnt = 0;
                currentState = TxPowerStates.PaDisabling;
                break;

            case TxPowerStates.PaDisabling:
                console.log("PaDisabling... ");
                if(TxPaOff() === OK)
                {
                    // paCheckTimeDebug = 0;
                    console.log("PaDisabling success");
                    currentState = TxPowerStates.PaOffCheck;
                }
                else
                {
                    console.log("TxState PA Off error");
                    //should never fail here
                }
                transmitTimeoutCnt = 0;
                break;

            case TxPowerStates.PaOffCheck:
                console.log("PaOffCheck... ");
                if(moduleDataController.TxPaOffStateCheck(currentOpFill.OpFill) === OK)
                {
                    console.log("PaOffCheck success");
                    // console.log("PA On Success time count, multiply by 100ms");
                    // console.log(paCheckTimeDebug);
                    currentState = TxPowerStates.DdsMute;
                    transmitTimeoutCnt = 0;
                }
                else
                {
                    if(transmitTimeoutCnt > 30)   //15s timeout
                    {
                        transmitTimeoutCnt = 0;
                        console.log("TxState PA Off check error");
                        currentState = TxPowerStates.DdsMute;
                        //Continue, PA check failing could be PA fault or comms drop, expect comms alarm
                    }
                    transmitTimeoutCnt++;
                }
                break;

            case TxPowerStates.DdsMute:
                console.log("DdsMute... ");
                if(TxDdsMute() === OK)
                {
                    console.log("DdsMute success");
                    currentState = TxPowerStates.DdsOffCheck;
                }
                else
                {
                    //should never fail here
                    console.log("TxState DDS Off error");
                }
                transmitTimeoutCnt = 0;
                break;

            case TxPowerStates.DdsOffCheck:
                console.log("DdsOffCheck... ");
                if(moduleDataController.TxDdsOffStateCheck() === OK)
                {
                    console.log("DdsOffCheck success");
                    transmitTimeoutCnt = 0;
                    currentState = TxPowerStates.TxOffComplete;
                }
                else
                {
                    if(transmitTimeoutCnt > 3)   //1.5s timeout
                    {
                        transmitTimeoutCnt = 0;
                        console.log("TxState DDS Off check error");
                        currentState = TxPowerStates.TxOffComplete;
                        //Continue, DDS check failing could be PA fault or comms drop, expect comms alarm
                    }
                    transmitTimeoutCnt++;
                }
                break;

            case TxPowerStates.TxOffComplete:
                console.log("TxOffComplete... ");
                if(userDataController.updateUserConfig({"IsTransmitting":false}) === OK)
                {
                    console.log("transmit off process complete"); 
                    uiWebSocket.sendButtonUpdate("U");
                    currentState = TxPowerStates.TxOff;
                }
                else
                {
                    console.log("TX State transmit off complete error");
                    //should never fail here
                }           
                transmitTimeoutCnt = 0;    
                break;

            case TxPowerStates.TxOff:  //stable state for TX OFF
                break;

            default:
                break;
        }
    }catch(error)
    {
        console.log("TX State error")
        console.log(error);
    }

    if((currentState === TxPowerStates.TxOff) || (currentState === TxPowerStates.TxOn))
    {
        return TxReturnStates.StandardPolling;
    }
    else if((currentState === TxPowerStates.PaOffCheck) || (currentState === TxPowerStates.PaOnCheck) ||
            (currentState === TxPowerStates.DdsOffCheck) || (currentState === TxPowerStates.DdsOnCheck)   )
    {
        return TxReturnStates.TxProcessPollingGetVals;
    }
    else
    {
        return TxReturnStates.TxProcessStateTransitions;
    }
}

function TxPaOn()
{
    const pa = require('./unitModules/pa');
    const moduleDataController = require('../controllers/moduleDataController');
    const userDataController = require('../controllers/userDataController');
    
    let currentOpFill = userDataController.getCurrentOpfill();
    let message = {};

    let paPowerSetError = 0;

    try{
        for(let modules = 1; modules <= (moduleDataController.getPaCount()); modules++)
        {
            message = {"IsPathOn":false};
            message.IsPathOn = currentOpFill.OpFill.RadioFrequencyPath[modules-1].IsPathOn;
            if(message.IsPathOn === true)   //if path is on, enable PA
            {
                message = {"power":0};
                message.power = currentOpFill.OpFill.RadioFrequencyPath[modules-1].Power;
                msgTx = pa.SetOutputLevel(modules, message, null); //start index from 0
                Status = msgTx[0];
                errorCode = msgTx[1];
                errorResponse = msgTx[2];
                if(Status === ERROR)
                {
                    paPowerSetError = 1;
                    console.log("TransmitPAOn PA Power Set error");
                    console.log(`Turn off output PA module ${modules} failed, status ${Status}, error code ${errorCode}, error response ${errorResponse}`)	
                }
            }
        }  
    }catch(error)
    {
        console.log("transmit PA ON error")
        console.log(error);
    }

    if(paPowerSetError === 0)
    {
        return OK;
    }
    return ERROR;
}

function TxPaOff()
{
    const pa = require('./unitModules/pa');
    const moduleDataController = require('../controllers/moduleDataController');    

    let message = {};

    let paPowerSetError = 0;

    try{
        for(let modules = 1; modules <= (moduleDataController.getPaCount()); modules++)
        {
            message = {"power":0};
            msgTx = pa.SetOutputLevel(modules, message, null); //start index from 0
            Status = msgTx[0];
            errorCode = msgTx[1];
            errorResponse = msgTx[2];
            if(Status === ERROR)
            {
                paPowerSetError = 1;
                console.log("TxPaOff PA Power turn off error");
                console.log(`Turn off PA module ${modules} failed, status ${Status}, error code ${errorCode}, error response ${errorResponse}`)	
            }     
        }     
    }catch(error)
    {
        console.log("transmit PA Off error")
        console.log(error);
    }

    if(paPowerSetError === 0)
    {
        return OK;
    }
    return ERROR;
}

function TxDdsUnmute()
{
    const dds = require('./unitModules/dds');
    const moduleDataController = require('../controllers/moduleDataController');
    const userDataController = require('../controllers/userDataController');
    
    let currentOpFill = userDataController.getCurrentOpfill();
    let message = {};

    let ddsUnmuteSetError = 0;

    try{
        for(let modules = 1; modules <= (moduleDataController.getDdsCount()); modules++)
        {
            message = {"IsPathOn":false};
            message.IsPathOn = currentOpFill.OpFill.RadioFrequencyPath[modules-1].IsPathOn;
            let msgTx = dds.SetMuteOutput(modules, message, null); //start index from 0
            let Status = msgTx[0];
            let errorCode = msgTx[1];
            let errorResponse = msgTx[2];               
            if(Status === ERROR)
            {
                ddsUnmuteSetError = 1;
                console.log(`Unmute DDS module ${modules} failed, status ${Status}, error code ${errorCode}, error response ${errorResponse}`)	
            }
        }   
    }catch(error)
    {
        ddsUnmuteSetError = 1;
        console.log("Tx DDS Unmute error")
        console.log(error);
    }

    if(ddsUnmuteSetError === 0)
    {
        return OK;
    }
    return ERROR;
}

function TxDdsMute()
{
    const dds = require('./unitModules/dds');
    const moduleDataController = require('../controllers/moduleDataController');
    
    let message = {};

    let ddsSweepSetError = 0;

    try{
        message = {"IsPathOn":false};
        for(let modules = 1; modules <= (moduleDataController.getDdsCount()); modules++)
        {
            let msgTx = dds.SetMuteOutput(modules, message, null); //start index from 0
            let Status = msgTx[0];
            let errorCode = msgTx[1];
            let errorResponse = msgTx[2];
            if(Status === ERROR)
            {
                ddsMuteSetError = 1;
                console.log(`Turn off DDS module ${modules} failed, status ${Status}, error code ${errorCode}, error response ${errorResponse}`)	
            }
        }   
    }catch(error)
    {
        ddsMuteSetError = 1;
        console.log("transmit DDS Off error")
        console.log(error);
    }

    if(ddsSweepSetError === 0)
    {
        return OK;
    }
    return ERROR;
}

function TxDdsFreqSet()
{
    const dds = require('./unitModules/dds');
    const moduleDataController = require('../controllers/moduleDataController');
    const userDataController = require('../controllers/userDataController');
    
    let currentOpFill = userDataController.getCurrentOpfill();
    let message = {};

    let ddsSweepSetError = 0;

    try{
        for(let modules = 1; modules <= (moduleDataController.getDdsCount()); modules++)
        {
            const opFill = currentOpFill.OpFill;
            const band = opFill.RadioFrequencyPath[modules - 1];

            const address = 0x20 + modules - 1;
            const ddsUnit = moduleDataController.getModuleMap()?.modules
                ?.find(unit => Number(unit.address) === address);
            const multiplier = Number(ddsUnit?.config?.Freq_Multiplier);

            if (![1, 2, 4, 8].includes(multiplier)) {
                ddsSweepSetError = 1;
                console.log(`DDS ${modules}: missing or invalid frequency multiplier`);
                continue;
            }

            const hasNarrowRange = band.Mode === "Sweep" && band.FrequencyRange.some(range=>
                range.Upper != null && range.Lower != null && range.Upper - range.Lower < 2000 * multiplier
            );

            const injected = opFill.ModulationEnabled === true && band.ModulationEnabled === true && !hasNarrowRange;

            const modulationRequested = opFill.ModulationEnabled === true && band.ModulationEnabled === true;

            let tmp = {"IsPathOn":false};
            tmp.IsPathOn = currentOpFill.OpFill.RadioFrequencyPath[modules-1].IsPathOn;

            if(tmp.IsPathOn === true)   //if path is on, enable DDS
            {

                if (modulationRequested && hasNarrowRange) {
                    userDataController.latchNarrowSweepAlert(modules);
                }

                message = 
                {
                    "Mode": "Sweep",
                    //"FrequencyStep": 10000,
                    //"DwellTime": 20,
                    // "FrequencyDeviation": 0,
                    "FrequencyStep": band.FrequencyStep,
                    "DwellTime": band.RampRate,
                    "modulationMode": injected ? 2 : 0,
                    //"modulationSettings": 0x20,
                    "FrequencyRange": []
                };

                message.Mode = currentOpFill.OpFill.RadioFrequencyPath[modules-1].Mode;
                for(let bands = 0; bands < currentOpFill.OpFill.RadioFrequencyPath[modules-1].FrequencyRange.length; bands++)
                {
                    message.FrequencyRange.push({ 
                        "Id": bands+1,
                        "Lower": 40000,
                        "Upper": 50000
                    });
                    message.FrequencyRange[bands].Lower = currentOpFill.OpFill.RadioFrequencyPath[modules-1].FrequencyRange[bands].Lower;
                    message.FrequencyRange[bands].Upper = currentOpFill.OpFill.RadioFrequencyPath[modules-1].FrequencyRange[bands].Upper;
                }
                
                moduleDataController.invalidateDdsSweepReadback(0x20 + modules - 1);
                let msgTx = dds.SetSweepConfig(modules, message, null); //start index from 0
                let Status = msgTx[0];
                let errorCode = msgTx[1];
                let errorResponse = msgTx[2];
                if(Status === ERROR)
                {
                    ddsSweepSetError = 1;
                    console.log(`Set DDS dds module ${modules} failed, status ${Status}, error code ${errorCode}, error response ${errorResponse}`)	
                }
            }
        }       
    }catch(error)
    {
        ddsSweepSetError = 1;
        console.log("transmit DDS ON error")
        console.log(error);
    }

    if(ddsSweepSetError === 0)
    {
        return OK;
    }
    return ERROR;
}


// function ApplyCurrentOpFillDdsWhileMuted(opNumber)
// {
//     const dds = require('./unitModules/dds');
//     const moduleDataController = require('../controllers/moduleDataController');
//     const userDataController = require('../controllers/userDataController');

//     // Do not run during TX or while the DDS outputs are unmuted.
//     if (currentState !== TxPowerStates.TxOff ||
//         moduleDataController.TxDdsOffStateCheck() !== OK)
//     {
//         return false;
//     }

//     const current = userDataController.getCurrentOpfill();
//     if (Number(current.CurrentOpFill) !== Number(opNumber))
//     {
//         return false;
//     }

//     const modules = moduleDataController.getModuleMap().modules;
//     const readback = moduleDataController.getDdsModulationReadback();
//     const commands = [];

//     for (const unit of modules)
//     {
//         const address = Number(unit.address);
//         if (address < 0x20 || address > 0x26) continue;

//         const index = address - 0x20;
//         const band = current.OpFill.RadioFrequencyPath[index];
//         const config = unit.config;

//         if (!band || !config || !Array.isArray(band.FrequencyRange))
//         {
//             return false;
//         }

//         const narrow = band.Mode === "Sweep" &&
//             band.FrequencyRange.some(range =>
//                 range?.Lower != null &&
//                 range?.Upper != null &&
//                 range.Upper - range.Lower < 2000
//             );

//         const mode =
//             current.OpFill.ModulationEnabled === true &&
//             band.ModulationEnabled === true &&
//             !narrow ? 2 : 0;

//         // This DDS already reported the requested mode and 0x27 settings.
//         if (readback[index] === mode &&
//             config.modulationSettings === 0x27)
//         {
//             continue;
//         }

//         let message;

//         if (config.Operating_Mode === 0) // Keep existing CW frequency.
//         {
//             message = {
//                 Mode: "CW",
//                 FrequencyRange: [{
//                     Lower: config.CW_Freq,
//                     Upper: config.CW_Freq
//                 }],
//                 modulationMode: mode
//             };
//         }
//         else if (config.Operating_Mode === 1) // Keep existing sweep.
//         {
//             const count = config.No_of_Active_Sweeps;
//             if (!Number.isInteger(count) || count < 1 || count > 6)
//             {
//                 return false;
//             }

//             const ranges = [];
//             for (let i = 1; i <= count; i++)
//             {
//                 ranges.push({
//                     Lower: config[`Sweep${i}StartFreq`],
//                     Upper: config[`Sweep${i}StopFreq`]
//                 });
//             }

//             message = {
//                 Mode: "Sweep",
//                 FrequencyRange: ranges,
//                 FrequencyStep: config.SweepFreqStep,
//                 DwellTime: config.RampRate,
//                 modulationMode: mode
//             };
//         }
//         else
//         {
//             return false;
//         }

//         commands.push({ path: index + 1, message });
//     }

//     for (const command of commands)
//     {
//         if (dds.SetSweepConfig(
//             command.path, command.message, null
//         )[0] !== OK)
//         {
//             return false;
//         }
//     }

//     //return true; // Queued; the later 0xC0 readback confirms application.
//     return commands.length > 0;
// }

function ApplyCurrentOpFillDdsWhileMuted(opNumber)
{
    const dds = require('./unitModules/dds');
    const moduleDataController = require('../controllers/moduleDataController');
    const userDataController = require('../controllers/userDataController');

    // Never reconfigure during TX or while a DDS output is unmuted.
    if (currentState !== TxPowerStates.TxOff ||
        moduleDataController.TxDdsOffStateCheck() !== OK)
    {
        return false;
    }

    const current = userDataController.getCurrentOpfill();
    if (!Array.isArray(current?.OpFill?.RadioFrequencyPath) ||
        Number(current.CurrentOpFill) !== Number(opNumber))
    {
        return false;
    }

    const moduleMap = moduleDataController.getModuleMap();
    if (!Array.isArray(moduleMap?.modules))
    {
        return false;
    }

    const readback = moduleDataController.getDdsModulationReadback();
    const commands = [];

    for (const unit of moduleMap.modules)
    {
        const address = Number(unit.address);
        if (address < 0x20 || address > 0x26) continue;

        const index = address - 0x20;
        const band = current.OpFill.RadioFrequencyPath[index];
        const config = unit.config;

        if (!band || !config || !Array.isArray(band.FrequencyRange))
        {
            return false;
        }

        const multiplier = Number(config.Freq_Multiplier);
        if (![1, 2, 4, 8].includes(multiplier)) {
            return false;
        }

        const narrow = band.Mode === "Sweep" &&
        band.FrequencyRange.some(range =>
            range?.Lower != null &&
            range?.Upper != null &&
            range.Upper - range.Lower < 2000 * multiplier
        );

        const modulationRequested = current.OpFill.ModulationEnabled === true && band.ModulationEnabled === true;

        if (modulationRequested && narrow) {
            userDataController.latchNarrowSweepAlert(index + 1);
        }

        const modulationMode =
            current.OpFill.ModulationEnabled === true &&
            band.ModulationEnabled === true &&
            !narrow ? 2 : 0;
     
        let message;
        let configurationMatches = true;

        if (config.Operating_Mode === 0) {
            // Change modulation without changing the DDS's current CW frequency.
            message = {
                Mode: "CW",
                FrequencyRange: [{
                    Lower: config.CW_Freq,
                    Upper: config.CW_Freq
                }],
                modulationMode
            };
        }
        else if (config.Operating_Mode === 1) {
            if (!Number.isInteger(config.No_of_Active_Sweeps) ||
                config.No_of_Active_Sweeps < 1 ||
                config.No_of_Active_Sweeps > 6 ||
                !Number.isInteger(band.FrequencyStep) ||
                band.FrequencyStep < 1000 ||
                band.FrequencyStep > 4000000 ||
                !Number.isInteger(band.RampRate) ||
                band.RampRate < 1 ||
                band.RampRate > 65535) {
                return false;
            }

            // Reuse frequencies already accepted by this DDS.
            const ranges = [];
            for (let i = 1; i <= config.No_of_Active_Sweeps; i++) {
                ranges.push({
                    Lower: config[`Sweep${i}StartFreq`],
                    Upper: config[`Sweep${i}StopFreq`]
                });
            }

            message = {
                Mode: "Sweep",
                FrequencyRange: ranges,
                FrequencyStep: band.FrequencyStep, // Hz, from the saved OpFill
                DwellTime: band.RampRate,          // DDS counts, from the saved OpFill
                modulationMode
            };

            configurationMatches =
                config.SweepFreqStep === band.FrequencyStep &&
                config.RampRate === band.RampRate;
        }
        else {
            return false;
        }

        const modulationMatches =
            readback[index] === modulationMode &&
            config.modulationSettings === 0x27;

        if (!configurationMatches || !modulationMatches)
        {
            commands.push({ path: index + 1, message });
        }
    }

    for (const command of commands)
    {
        const result = dds.SetSweepConfig(
            command.path, command.message, null
        );

        if (result[0] !== OK)
        {
            console.log(
                `DDS path ${command.path} configuration failed: ${result[2]}`
            );
            return false;
        }
    }

    // True means at least one 0x80 was queued, not yet confirmed by the DDS.
    return commands.length > 0;
}



module.exports = { TxState, TxNewStates, TxReturnStates, ApplyCurrentOpFillDdsWhileMuted, isTxFullyOff };