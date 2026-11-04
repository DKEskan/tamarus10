var ALARM_SAFETY = true;

const initMapState =
{
    inactive: 0,
    fillTxBuff: 1,
    awaitingRxComplete: 2
}

// Temporary bench setup 
const skippedBoards = new Set([
    0x20,
    0x21,
    0x22,
    0x23,
    0x24,
    0x25,
    0x26,
    
    0x30,
    0x31,
    0x32,
    0x33,
    0x34,
    0x35,
    0x36,
    
    0x40,
    0x41,
    0x42,
    0x43,
    0x44,
    0x45,
    0x46,
    0x4E,
    0x4F,

    0x05,
    0x60
]);

const OK = 0;
const ERROR = null;

var timer = 10; 
var initMapFlag = initMapState.inactive;   //flag to indicate initial polling
let rxMapFinalWaitCount = 0;

let txStatePollPeriod = 10;
let txStatePollCount = 0;

let pollTxPeriod = 100; //request status update from a module every (pollEntryPeriod * pollTxPeriod) ms
var pollCount = 0;  //count for when to send poll requests
var pollModuleId = 1; //module to poll, start at addresss 1 as 0 is broadcast

const alarmCheckPeriod = 50; //check for alarms every (pollEntryPeriod * alarmCheckPeriod) ms
const alarmRecheckPeriod = 1000; //allow recheck after 10 seconds
var alarmCheckCount = 0;  //count for when to check alarms
var alarmRecheckCount = 0; //count for when to re-check after triggered
var alarmRecheckFlag = 0; //flag that re-check timer is up

function setAlarmSafety(val)
{
    ALARM_SAFETY = val;
}

function initModuleMapping()
{
    const moduleDataController = require('../controllers/moduleDataController');
	const userDataController = require('../controllers/userDataController');
	console.log("Start mapping")
	moduleDataController.initMap();
    userDataController.initMap();
    initMapFlag = initMapState.fillTxBuff;
}

function moduleMappingUartHandler()
{
    const uart_bus = require('./uart_bus');
    const moduleDataController = require('../controllers/moduleDataController');
	const userDataController = require('../controllers/userDataController');

 	if(uart_bus.isPortOpen() === 1)
    {
        //check receive first to unlock TX line
        uart_bus.handleRxData(); //check for messages to handle every "pollPeriod" ms
    	uart_bus.handleTxData();  //send TX messages every "pollPeriod" ms
    }
    else 
    {
    	//console.log("awaiting uart_bus port open");
    }

    if(initMapFlag === initMapState.fillTxBuff)  //polling for initialisation. request status of all modules to locate what's available
    {
        modulePollDir(0x4E, 2);   //turn on 0x4E Supply first to power other boards
        modulePollDir(0x4F, 2);   //turn on 0x4F Supply fan and turn fan speed to lowest
        for(let bootModules = 0x00; bootModules <= 0x50; bootModules++) 
        {       
			 //protection PCB 4E will be powered first, protection PCB 4F will be managed independently
             if((bootModules !== 0x4E) && (bootModules !== 0x4F))  
             {
                 modulePollDir(bootModules, 2);
             }
        }
        for(let initPollModules = 0x00; initPollModules <= 0x50; initPollModules++)
        {       
			modulePollDir(initPollModules, 1);
        }
        initMapFlag = initMapState.awaitingFinalRxResponses;
    }  
    else if((initMapFlag === initMapState.awaitingFinalRxResponses) && uart_bus.isInitPollFinished()) 
    {
        rxMapFinalWaitCount+=1;
        if(rxMapFinalWaitCount > 500)
        {
        	// console.log(rxMapFinalWaitCount);
            initMapFlag = initMapState.awaitingRxComplete;
            rxMapFinalWaitCount = 0;
        }
    }
    else if(initMapFlag === initMapState.awaitingRxComplete)
    {
    	let saveMapFail = 0;
    	let saveUserMapFail = 0;

        //save map
        saveUserMapFail = userDataController.saveUserDataMap();
        saveMapFail = moduleDataController.saveModuleMap();
        
        if((saveMapFail === 1) || (saveUserMapFail === 1))	//TO DO
        {
        	console.log(`saveMapFail ${saveMapFail} or saveUserMapFail ${saveUserMapFail} failed`);
        	//create error status
        }
        initMapFlag = initMapState.inactive;
    }
}

let bootingUp = true;
function ModulesUartHandler(){
    const uart_bus = require('./uart_bus');
    const moduleDataController = require('../controllers/moduleDataController');
    const userDataController = require('../controllers/userDataController');
    const transmitHandler = require('./transmitHandler');
    const uiWebSocket = require('./uiWebSocket');
    
    try{
	    if(bootingUp === true) //Enable supplies power up and internal fans turned on before polling
	    {
	        modulePollDir(0x4E, 2);   //turn on 0x4E Supply first to power other boards
		    modulePollDir(0x4F, 2);   //turn on 0x4F Supply fan and turn fan speed to lowest
		    modulePollDir(0x50, 2);   //get status of unit buttons on load
		    modulePollDir(0x60, 2);   //get status of battery on load
		    let nextBootModule = 0;
		    for(let bootModules = 1; bootModules <= 30; bootModules++)    //should not be more than 
		    {
		        nextBootModule = moduleDataController.getActiveModule(bootModules);  //active modules found by ID starting at 1.  
		        if(nextBootModule === ERROR) //if all modules polled
		        {
		            break;  //end of possible modules
		        }
		        else
		        {
		            //protection PCB 4E will be powered first, protection PCB 4F will be managed independently
		            if(	(nextBootModule !== 0x4E) && (nextBootModule !== 0x4F) &&
		            	(nextBootModule !== 0x50) && (nextBootModule !== 0x60))  
		            {
		                modulePollDir(nextBootModule, 2);
		            }
		        }
		    }
	        bootingUp = false;
	    }
    }catch(error)
    {
        console.log("error in bootup polling");
        console.log(error);
    }
    
   
    txStatePollCount+=1;
    
    if(txStatePollCount >= txStatePollPeriod)    //standard polling, poll active addresses
    {  
        let pollstate = transmitHandler.TxState(transmitHandler.TxNewStates.NoChange);  //TX process handler
        if(pollstate === transmitHandler.TxReturnStates.TxProcessStateTransitions)
        {
            //send config changes and transition between TX states quickly
            txStatePollPeriod = 10;
            pollTxPeriod = 10; 
        }
        else if(pollstate === transmitHandler.TxReturnStates.TxProcessPollingGetVals)
        {
            //Poll quickly, prioritise get status of modules. TxState can be polled slower, 0.3s variation will be unnoticed
            pollTxPeriod = 10; 
            txStatePollPeriod = 50;
        }
        else
        {
            pollTxPeriod = 50;  //standard speed
            txStatePollPeriod = 100;
        }
        txStatePollCount = 0;
    }

    pollCount+=1;
    if((pollCount >= pollTxPeriod) && (bootingUp === false))    //standard polling, poll active addresses
    {   
        try
        {
            let nextModule = moduleDataController.getActiveModule(pollModuleId);  //active modules found by ID starting at 1.  

            if(nextModule === ERROR) //if all modules polled, restart at ID 0
            {
                pollModuleId = 1;
                nextModule = moduleDataController.getActiveModule(pollModuleId);
            }
            
            if(nextModule !== ERROR) //should never be without an address
            {
                modulePollDir(nextModule, 0);
                console.log('[POLL]', pollModuleId, nextModule.toString(16));
                pollModuleId += 1;
            }
        }catch(error)
        {
            console.log("error in standard polling");
            console.log(error);
        }
        pollCount = 0;
    }    
    
    if(uart_bus.isPortOpen() === 1)
    {
        //check receive first to unlock TX line
        uart_bus.handleRxData(); //check for messages to handle every "pollPeriod" ms
    	uart_bus.handleTxData();  //send TX messages every "pollPeriod" ms
    }
    else 
    {
    	//console.log("awaiting uart_bus port open");
    }

    try{
        alarmCheckCount+=1;
        alarmRecheckCount+=1;
        if((alarmRecheckFlag === 0) && (alarmRecheckCount >= alarmRecheckPeriod))
        {
            alarmRecheckFlag = 1;
            alarmRecheckCount = 0;
        }
        if((alarmCheckCount >= alarmCheckPeriod) && (ALARM_SAFETY === true) && (alarmRecheckFlag === 1))    //safety check, turn TX off if alarm
        {  
            let alarmState = userDataController.getUnitOverallAlarm();
            if((alarmState === true) && ((userDataController.getUserIsTransmitting()).IsTransmitting === true))
            {
                transmitHandler.TxState(transmitHandler.TxNewStates.UrgentOff);
                uiWebSocket.sendButtonUpdate("U");
                console.log("Alarm, transmit turning off in Polling");
            }
            alarmCheckCount = 0;
            alarmRecheckFlag = 0;
        }
    }catch(error)
    {
        console.log("Alarm, transmit turning off in Polling error");
        console.log(error);
    }
}

const pollingTimer = function() {
	if(initMapFlag !== initMapState.inactive)
    {
		moduleMappingUartHandler();
	}
   	else
    {
    	ModulesUartHandler();
    }
    setTimeout(pollingTimer, timer); //restart timeout timer
}

function modulePollDir(module, init)
{

    // if(skippedBoards.has(module))
    // {
    //     return;
    // }

    const pa = require('./unitModules/pa');
	const dds = require('./unitModules/dds');
	const fan = require('./unitModules/fan');
    const distribution = require('./unitModules/distribution');
    const CuPower = require('./unitModules/CuPower');
    const CuInterface = require('./unitModules/CuInterface');
    const protection = require('./unitModules/protection');
    const power = require('./unitModules/power');
   
    if(init === 1)
    {
        if(dds.isModule(module)) 
        {
            dds.mapInitCommands(module);       
        }
        else if(pa.isModule(module))    
        {
            pa.mapInitCommands(module);
        }
        else if(fan.isModule(module))    
        {
            fan.mapInitCommands(module);
        }
        else if(distribution.isModule(module))
        {
            distribution.mapInitCommands(module);
        }
        else if(CuPower.isModule(module))
        {
            CuPower.mapInitCommands(module);
        }
        else if(CuInterface.isModule(module))
        {
            CuInterface.mapInitCommands(module);
        }
        else if(protection.isModule(module))
        {
            protection.mapInitCommands(module);
        }
        else if(power.isModule(module))
        {
            power.mapInitCommands(module);
        }
        else
        {
            //TO DO - ADD ERROR LOG
            console.log("Polling module type not found");
            console.log(module);
        }
    }
    else if(init === 2) //boot up 
    {
        if(protection.isModule(module))
        {
            protection.powerupCommands(module);
        }
        else if(CuInterface.isModule(module))
        {
            CuInterface.powerupCommands(module);
        }
        else if(dds.isModule(module))
        {
            dds.powerupCommands(module);
        }
        else if(pa.isModule(module))
        {
            pa.powerupCommands(module);
        }
        else if(CuPower.isModule(module))
        {
            CuPower.powerupCommands(module);
        }
        else if(power.isModule(module))
        {
            power.powerupCommands(module);
        }
        // else if(fan.isModule(module))
        // {
        //     fan.powerupCommands(module);
        // }
        // else if(distribution.isModule(module))
        // {
        //     distribution.powerupCommands(module);
        // }
    }
    else
    {
        if(dds.isModule(module)) 
        {
            dds.pollCommands(module);       
        }
        else if(pa.isModule(module))    
        {
            pa.pollCommands(module);
        }
        else if(fan.isModule(module))    
        {
            fan.pollCommands(module);
        }
        else if(distribution.isModule(module))
        {
            distribution.pollCommands(module);
        }
        else if(CuPower.isModule(module))
        {
            CuPower.pollCommands(module);
        }
        else if(CuInterface.isModule(module))
        {
            CuInterface.pollCommands(module);
        }
        else if(protection.isModule(module))
        {
            protection.pollCommands(module);
        }
        else if(power.isModule(module))
        {
            power.pollCommands(module);
        }
        else
        {
            //TO DO - ADD ERROR LOG
            console.log("Polling module type not found, module");
            console.log(module);
        }
    }
}

var messageTimeoutTimer = 2000; //check timeout of messages every 50ms
var msgTimeoutCount = 0;	//counter for timeout of messages

const MessageTimeout = function() {	//check for messages timing out
	const uiWebServer = require('./uiWebServer');
    const uart_bus = require('./uart_bus');
    
    if(uart_bus.cmdQueue.size != 0)    //ethernet timeout for user
    {
		const firstInQueue = uart_bus.cmdQueue.entries().next().value;
		if(firstInQueue[1].apiTimeout !== 0)
		{
			firstInQueue[1].apiTimeout  = firstInQueue[1].apiTimeout  - 1;
		}
		
        if (firstInQueue[1].apiTimeout <= 0)	//if message timeout counter reaches 0, send message timeout response
        {
            msgTimeoutCount+=1;	
            console.log(firstInQueue[1]);
            uiWebServer.apiTimeoutResponse(firstInQueue[1].endPoint);
	        uart_bus.cmdQueue.delete(firstInQueue[0]);	//delete command recevied from list to be actioned.
        }
    }
	setTimeout(MessageTimeout, messageTimeoutTimer); //restart timeout timer
}

var temperatureTimeoutTimer = 30000; //check timeout of messages every 30s
let fanLevel = 1;
const FAN_STEPS = 5;

const temperatureHandler = function() {	//check for messages timing out
    const moduleDataController = require('../controllers/moduleDataController');
    const userDataController = require('../controllers/userDataController');
    const protection = require('./unitModules/protection');

    let success;
    let code;
    let codeMessage;

    if(IsMappingModules() === 0)
    {
        try
        {
            //turn on / off external fans
            if(userDataController.getPaHighestTemp() > moduleDataController.getPaTargetTemp()+moduleDataController.getPaTempHyst()) 
            {
                if(fanLevel < FAN_STEPS)
                {
                    fanLevel = fanLevel + 1;
                }
                else 
                {
                    if(fanLevel !== FAN_STEPS)
                    {
                        console.log("fan lost level, set max");
                        console.log(fanLevel);
                    }
                    
                    fanLevel = FAN_STEPS;
                }
                
                let message = {"FanSpeed":fanLevel+0x30};
                [success, code, codeMessage] = protection.setExtFanSpeed(16, message, null);
                if(success != OK)
                {
                    console.log("error in controlling fan level");
                    console.log(code);
                    console.log(codeMessage);
                    moduleDataController.updateCarrierStatus("alarm", moduleDataController.alarmsCode.Fan_Control, 1);
                }
            }
            else if(userDataController.getPaHighestTemp() < moduleDataController.getPaTargetTemp()-moduleDataController.getPaTempHyst())
            {
                if(fanLevel > 0)
                {
                    fanLevel = fanLevel - 1;
                }
                else 
                {
                    if(fanLevel !== 0)
                    {
                        console.log("fan lost level, set min");
                        console.log(fanLevel);
                    }
                    
                    fanLevel = 0;
                }

                let message = {"FanSpeed":fanLevel+0x30};   //send fan level as hex
                [success, code, codeMessage] = protection.setExtFanSpeed(16, message, null); ;
                if(success != OK)
                {
                    console.log("error in controlling fan level");
                    console.log(code);
                    console.log(codeMessage);
                    moduleDataController.updateCarrierStatus("alarm", moduleDataController.alarmsCode.Fan_Control, 1);
                }
            }   
        }catch(error)
        {
            console.log("error in PA temperature fan enable polling");
            console.log(error);
        }
    }
	
	setTimeout(temperatureHandler, temperatureTimeoutTimer); //restart timeout timer
}

function pollingInit()
{
    setTimeout(pollingTimer, timer); //start timeout timer
    setTimeout(MessageTimeout, messageTimeoutTimer); //start timeout timer
    setTimeout(temperatureHandler, temperatureTimeoutTimer); //start timeout timer
}

function IsMappingModules()
{
	return (initMapFlag !== 0)? 1 : 0;
}

module.exports = { pollingInit, initModuleMapping, IsMappingModules, setAlarmSafety, temperatureHandler };