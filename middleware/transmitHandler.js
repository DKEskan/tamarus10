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
            let tmp = {"IsPathOn":false};
            tmp.IsPathOn = currentOpFill.OpFill.RadioFrequencyPath[modules-1].IsPathOn;

            if(tmp.IsPathOn === true)   //if path is on, enable DDS
            {
                message = 
                {
                    "Mode": "Sweep",
                    "FrequencyStep": 10000,
                    "DwellTime": 20,
                    // "FrequencyDeviation": 0,
                    "modulationMode": 0,
                    "modulationSettings": 0x20,
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
        console.log("transmit DDS ON error")
        console.log(error);
    }

    if(ddsSweepSetError === 0)
    {
        return OK;
    }
    return ERROR;
}

module.exports = { TxState, TxNewStates, TxReturnStates };