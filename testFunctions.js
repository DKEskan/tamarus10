/*
    useful functions for testing sections of code
*/

// TEST CHARGER SBUS FUNCTION
function PowerSource_SBUS()
{
    const uart_fp = require('./middleware/uart_fp');
    tmp = [0x04,0xF8, 0x30, 0x31, 0x32];
    uart_fp.handleRxData(tmp);
}


//TEST SBUS STATE SBUS FUNCTION
function SbusState_SBUS()
{
    const uart_fp = require('./middleware/uart_fp');
    tmp = [0x04,0xFE];
    uart_fp.handleRxData(tmp);
}



//TEST Power Source SBUS FUNCTION
function PowerSource_SBUS()
{
    const uart_fp = require('./middleware/uart_fp');
    tmp = [0x04,0xF9, 0x31];
    uart_fp.handleRxData(tmp);
}


//UNIT ON / OFF BATTERY CHARGING SCREEN TRANSITION TESTS
let powerSourceUiState = 0;
const powerSourceUiTimer = function() {
    const userDataController = require('./controllers/userDataController');
    const uiWebSocket = require('./middleware/uiWebSocket');
	let sourceObj = {"PowerSource":"EXT24V", "IsUnitOn":false};
	
	userDataController.updateUserConfig(sourceObj); //update local file with status
	if(powerSourceUiState === 0)
    {
		sourceObj.IsUnitOn = false;
		sourceObj.PowerSource = "EXT24V";
		userDataController.updateUserConfig(sourceObj); //update local file with status
		uiWebSocket.sendButtonUpdate("U");
		console.log("display charging screen");
		powerSourceUiState++;
	}
	else if(powerSourceUiState === 1)
	{
		sourceObj.IsUnitOn = true;
		sourceObj.PowerSource = "BAT";
		userDataController.updateUserConfig(sourceObj); //update local file with status
		uiWebSocket.sendButtonUpdate("U");
		console.log("main no charging symbol");
		powerSourceUiState++;
	}
	else if(powerSourceUiState === 2)
	{
		sourceObj.PowerSource = "BAT";
		sourceObj.IsUnitOn = false;
		userDataController.updateUserConfig(sourceObj); //update local file with status
		uiWebSocket.sendButtonUpdate("U");
		powerSourceUiState++;
		console.log("Shut off by power PCB");
	}
   	else
    {
		sourceObj.IsUnitOn = true;
		sourceObj.PowerSource = "EXT24V";
		userDataController.updateUserConfig(sourceObj); //update local file with status
		uiWebSocket.sendButtonUpdate("U");
    	powerSourceUiState = 0;
		console.log("main with charging plug symbol");
    }
	
    setTimeout(powerSourceUiTimer, 5000); //restart timeout timer
}

function PowerSourceUI_SBUS()
{
    setTimeout(powerSourceUiTimer, 5000); //restart timeout timer
}


//TRANSMIT TRANSITION TESTS
let transmittingTimerState = 0;
const transmittingTimer = function() {
    const userDataController = require('./controllers/userDataController');
    const uiWebSocket = require('./middleware/uiWebSocket');
	let unitObj = {"IsTransmitting": true};

	if(transmittingTimerState === 0)
    {
		unitObj.IsTransmitting = true;
		// console.log(unitObj.IsUnitOn);
		userDataController.updateUserConfig(unitObj);
		uiWebSocket.sendButtonUpdate("U");
		console.log(userDataController.getUserIsTransmitting().IsTransmitting);
		transmittingTimerState = 1;
	}
   	else
    {
		unitObj.IsTransmitting = false;
		// console.log(unitObj.IsUnitOn);
		userDataController.updateUserConfig(unitObj);
		uiWebSocket.sendButtonUpdate("U");
		console.log(userDataController.getUserIsTransmitting().IsTransmitting);
    	transmittingTimerState = 0;
    }
    setTimeout(transmittingTimer, 5000); //restart timeout timer
}

function TransmittingUI_SBUS()
{
    setTimeout(transmittingTimer, 5000); //restart timeout timer
}

//TRANSMIT DELAYED TRANSITION TEST
const transmittingDelayedTimer = function() {
    const userDataController = require('./controllers/userDataController');
    const uiWebSocket = require('./middleware/uiWebSocket');
	let unitObj = {"IsTransmitting": true};

	// console.log(unitObj.IsUnitOn);
	userDataController.updateUserConfig(unitObj);
	uiWebSocket.sendButtonUpdate("U");
	console.log(userDataController.getUserIsTransmitting().IsTransmitting);
	
}

function TransmittingDelayedUI_SBUS()
{
    setTimeout(transmittingDelayedTimer, 15000); //restart timeout timer
}


//UNIT ON / OFF BATTERY CHARGING SCREEN TRANSITION TESTS
let transitionsUiState = 0;
const screenTransitionsUiTimer = function() {
    const userDataController = require('./controllers/userDataController');
    const uiWebSocket = require('./middleware/uiWebSocket');
	let transitionObj = {"PowerSource":"EXT24V", "IsUnitOn":false, "IsConvertModeOn":false, "UnitOverallAlarm":false, "UnitOverallWarning":false};
	
	userDataController.updateUserConfig(transitionObj); //update local file with status
	if(transitionsUiState === 0)    //battery screen on, no alarms, covert screen off
    {
		transitionObj.IsUnitOn = false;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.IsConvertModeOn = false;
        transitionObj.UnitOverallAlarm = false;
        transitionObj.UnitOverallWarning = false;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		console.log("Battery screen basic");
		transitionsUiState++;
	}
	else if(transitionsUiState === 1) //battery screen on, warning alarms, covert screen off
	{
		transitionObj.IsUnitOn = false;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.IsConvertModeOn = false;
        transitionObj.UnitOverallAlarm = false;
        transitionObj.UnitOverallWarning = true;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		console.log("Battery screen warning alarm");
		transitionsUiState++;
	}
	else if(transitionsUiState === 2) //battery screen on, Error alarms, covert screen off
	{
		transitionObj.IsUnitOn = false;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.IsConvertModeOn = false;
        transitionObj.UnitOverallAlarm = true;
        transitionObj.UnitOverallWarning = false;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		transitionsUiState++;
		console.log("Battery screen error alarm");
	}
    else if(transitionsUiState === 3) //battery screen on, Both alarms, covert screen off
	{
		transitionObj.IsUnitOn = false;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.IsConvertModeOn = false;
        transitionObj.UnitOverallAlarm = true;
        transitionObj.UnitOverallWarning = true;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		transitionsUiState++;
		console.log("Battery screen both alarms");
	}
    else if(transitionsUiState === 4) //battery screen on, alarm on, covert screen on
	{
		transitionObj.IsUnitOn = false;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.IsConvertModeOn = true;
        transitionObj.UnitOverallAlarm = true;
        transitionObj.UnitOverallWarning = true;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		console.log("Battery screen both alarms covert");
		transitionsUiState++;
	}
    else if(transitionsUiState === 5) //battery screen on, no alarm, covert screen on
	{
		transitionObj.IsUnitOn = false;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.IsConvertModeOn = true;
        transitionObj.UnitOverallAlarm = false;
        transitionObj.UnitOverallWarning = false;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		console.log("Battery screen covert");
		transitionsUiState++;
	}
    else if(transitionsUiState === 5) //main screen on, no alarm, covert screen on
	{
		transitionObj.IsUnitOn = true;
		transitionObj.PowerSource = "BAT";
        transitionObj.IsConvertModeOn = true;
        transitionObj.UnitOverallAlarm = false;
        transitionObj.UnitOverallWarning = false;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		console.log("normal screen covert");
		transitionsUiState++;
	}
   	else
    {
		transitionObj.IsUnitOn = true;
		transitionObj.PowerSource = "BAT";
        transitionObj.IsConvertModeOn = true;
        transitionObj.UnitOverallAlarm = true;
        transitionObj.UnitOverallWarning = false;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
    	transitionsUiState = 0;
		console.log("normal screen covert alarm");
    }
	
    setTimeout(screenTransitionsUiTimer, 10000); //restart timeout timer
}

function ScreenTransitionsUI_SBUS()
{
    setTimeout(screenTransitionsUiTimer, 10000); //restart timeout timer
}



//UNIT ON / OFF BATTERY CHARGING SCREEN TRANSITION TESTS
let alarmTransitionsUiState = 0;
const AlarmTransitionsUiTimer = function() {
    const userDataController = require('./controllers/userDataController');
    const uiWebSocket = require('./middleware/uiWebSocket');
	let transitionObj = {"PowerSource":"EXT24V", "IsUnitOn":false, "UnitOverallAlarm":false, "UnitOverallWarning":false};
	
	userDataController.updateUserConfig(transitionObj); //update local file with status
	if(alarmTransitionsUiState === 0)    //battery screen on, no alarms
    {
		transitionObj.IsUnitOn = false;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.UnitOverallAlarm = false;
        transitionObj.UnitOverallWarning = false;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		console.log("Battery screen basic");
		alarmTransitionsUiState++;
	}
	else if(alarmTransitionsUiState === 1) //battery screen on, warning alarms
	{
		transitionObj.IsUnitOn = false;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.UnitOverallAlarm = false;
        transitionObj.UnitOverallWarning = true;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		console.log("Battery screen warning alarm");
		alarmTransitionsUiState++;
	}
   	else
    {
		transitionObj.IsUnitOn = false;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.UnitOverallAlarm = false;
        transitionObj.UnitOverallWarning = false;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
    	alarmTransitionsUiState = 0;
		console.log("Battery screen basic");
    }
	
    setTimeout(AlarmTransitionsUiTimer, 10000); //restart timeout timer
}

function AlarmTransitionsUI_SBUS()
{
    setTimeout(AlarmTransitionsUiTimer, 10000); //restart timeout timer
}

//UNIT ON / OFF BATTERY CHARGING SCREEN TRANSITION TESTS
let covertTransitionsUiState = 0;
const screenTransitionsCovertUiTimer = function() {
    const userDataController = require('./controllers/userDataController');
    const uiWebSocket = require('./middleware/uiWebSocket');
	let transitionObj = {"PowerSource":"EXT24V", "IsUnitOn":false, "IsConvertModeOn":false};
	
	userDataController.updateUserConfig(transitionObj); //update local file with status
	if(covertTransitionsUiState === 0)    //battery screen on, no alarms
    {
		transitionObj.IsUnitOn = true;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.IsConvertModeOn = true;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
		console.log("Charge mode, covert enabled");
		covertTransitionsUiState++;
	}
   	else
    {
		transitionObj.IsUnitOn = true;
		transitionObj.PowerSource = "EXT24V";
        transitionObj.IsConvertModeOn = false;
		userDataController.updateUserConfig(transitionObj); //update local file with status
		// uiWebSocket.sendButtonUpdate("U");
    	covertTransitionsUiState = 0;
		console.log("Charge mode, covert disabled");
    }
	
    setTimeout(screenTransitionsCovertUiTimer, 10000); //restart timeout timer
}

function ScreenTransitionsCovertUI_SBUS()
{
    setTimeout(screenTransitionsCovertUiTimer, 10000); //restart timeout timer
}

//WARNING ALARM TRANSITION TESTS
let repeatWarningUiTimerState = 0;
const RepeatWarningUiTimer = function() {
    const userDataController = require('./controllers/userDataController');
    const uiWebSocket = require('./middleware/uiWebSocket');
	let unitObj = {"UnitOverallWarning": false};

	if(repeatWarningUiTimerState === 0)
    {
		unitObj.UnitOverallWarning = true;
		// console.log(unitObj.IsUnitOn);
		userDataController.updateUserConfig(unitObj);
		uiWebSocket.sendButtonUpdate("U");
		console.log(unitObj.UnitOverallWarning);
		repeatWarningUiTimerState = 1;
	}
   	else
    {
		unitObj.UnitOverallWarning = false;
		// console.log(unitObj.IsUnitOn);
		userDataController.updateUserConfig(unitObj);
		uiWebSocket.sendButtonUpdate("U");
		console.log(unitObj.UnitOverallWarning);
    	repeatWarningUiTimerState = 0;
    }
    setTimeout(RepeatWarningUiTimer, 5000); //restart timeout timer
}

function repeatWarningUi()
{
    setTimeout(RepeatWarningUiTimer, 5000); //restart timeout timer
}

//ERROR ALARM TRANSITION TESTS
let repeatErrorUiTimerState = 0;
const RepeatErrorUiTimer = function() {
    const userDataController = require('./controllers/userDataController');
    const uiWebSocket = require('./middleware/uiWebSocket');
	let unitObj = {"UnitOverallAlarm": false};

	if(repeatErrorUiTimerState === 0)
    {
		unitObj.UnitOverallAlarm = true;
		// console.log(unitObj.IsUnitOn);
		userDataController.updateUserConfig(unitObj);
		uiWebSocket.sendButtonUpdate("U");
		console.log(unitObj.UnitOverallAlarm);
		repeatErrorUiTimerState = 1;
	}
   	else
    {
		unitObj.UnitOverallAlarm = false;
		// console.log(unitObj.IsUnitOn);
		userDataController.updateUserConfig(unitObj);
		uiWebSocket.sendButtonUpdate("U");
		console.log(unitObj.UnitOverallAlarm);
    	repeatErrorUiTimerState = 0;
    }
    setTimeout(RepeatErrorUiTimer, 10000); //restart timeout timer
}

function repeatErrorUi()
{
    setTimeout(RepeatErrorUiTimer, 10000); //restart timeout timer
}

//PIXEL CHECK TEST
const DeadPixelCheckUiTimer = function() {
	const uiWebSocket = require('./middleware/uiWebSocket');
    uiWebSocket.sendButtonUpdate("P");
	setTimeout(DeadPixelCheckUiTimer, 90000); //restart timeout timer
}

function DeadPixelCheckUi()
{
	setTimeout(DeadPixelCheckUiTimer, 10000); //restart timeout timer
}

//TEMPERATURE FAN TESTS
let TemperatureFanTestTimerState = 0;
const TemperatureFanTestTimer = function() {
    const moduleDataController = require('./controllers/moduleDataController');
	if(TemperatureFanTestTimerState === 0)
    {
		let paTargetTemp = {"System":{"config":{"PaTargetTemp":60, "PaTempHyst":2}}};
		console.log("temperature low");
		moduleDataController.updateConfig(paTargetTemp);
		TemperatureFanTestTimerState = 1;
	}
   	else
    {
		let paTargetTemp = {"System":{"config":{"PaTargetTemp":30, "PaTempHyst":2}}};
		console.log("temperature high");
		moduleDataController.updateConfig(paTargetTemp);
    	TemperatureFanTestTimerState = 0;
    }
    setTimeout(TemperatureFanTestTimer, 250000); //restart timeout timer
}

function TemperatureFanTest()
{
	const moduleDataController = require('./controllers/moduleDataController');
	const polling = require('./middleware/polling');
	let paTargetTemp = {"System":{"config":{"PaTargetTemp":30, "PaTempHyst":2}}};

	moduleDataController.updateConfig(paTargetTemp); //update local file with status
	setTimeout(polling.temperatureHandler, 1000); //start timeout timer
	setTimeout(TemperatureFanTestTimer, 250000); //start timeout timer
}

//TEST BATTERY PERCENT INCREMENTS
let BatteryPercentIncrementsTimerState = "5";
function BatteryPercentIncrementsTestTimer()
{
	const userDataController = require('./controllers/userDataController');

	let batteryObj = {"BatteryCharging":[0,0,0], "Battery":["0","0","0"], "PowerSource":"EXT24V"};
	batteryObj.Battery[0] = BatteryPercentIncrementsTimerState.toString();
	batteryObj.Battery[1] = BatteryPercentIncrementsTimerState.toString();
	batteryObj.Battery[2] = BatteryPercentIncrementsTimerState.toString();
		
	if(BatteryPercentIncrementsTimerState === 100)
	{
		batteryObj.BatteryCharging[0] = 1;
		batteryObj.BatteryCharging[1] = 1;
		batteryObj.BatteryCharging[2] = 1;
	}
	else
	{
		batteryObj.BatteryCharging[0] = 1;
		batteryObj.BatteryCharging[1] = 1;
		batteryObj.BatteryCharging[2] = 1;
		BatteryPercentIncrementsTimerState++;
	}
	console.log(batteryObj)
	userDataController.updateUserConfig(batteryObj);

	setTimeout(BatteryPercentIncrementsTestTimer, 1000); //start timeout timer
}

module.exports = { PowerSource_SBUS, SbusState_SBUS, PowerSource_SBUS, ScreenTransitionsCovertUI_SBUS, 
	TransmittingUI_SBUS, TransmittingDelayedUI_SBUS, PowerSourceUI_SBUS, ScreenTransitionsUI_SBUS, 
	AlarmTransitionsUI_SBUS, repeatWarningUi, repeatErrorUi, DeadPixelCheckUi, TemperatureFanTest,
	BatteryPercentIncrementsTestTimer }; //functions to export

/*
const os = require('os');
var totalMemory = os.totalmem();
var freeMemory = os.freemem();

console.log(`Total memory: ${totalMemory}, free memory: ${freeMemory}`);
*/

/*
	systemd-analyze time
	Startup finished in 2.881s (kernel) + 14.763s (userspace) = 17.644s 
	graphical.target reached after 14.533s in userspace
*/