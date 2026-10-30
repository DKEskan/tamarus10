const initialisation = require('./middleware/initialisation');
const ethernet = require('./middleware/ethernet');
const adc = require('./middleware/adc');
const gpioHandler = require('./middleware/gpioHandler');
const uart_bus = require('./middleware/uart_bus');
const uart_fp = require('./middleware/uart_fp');
const polling = require('./middleware/polling');
const uiWebServer = require('./middleware/uiWebServer');
const uiWebSocket = require('./middleware/uiWebSocket');


async function load()
{
	gpioHandler.gpioInit();	//initiate pins immediately
	adc.adcInit();	//start reading for power shutdowns
	uiWebSocket.runDisplaySocket();
	initialisation.initLcdInterface();
	uart_bus.uartInit();
	initialisation.runInit();
	ethernet.loadIpConfig();
	uart_bus.runUart();
	uart_fp.runUart();
	polling.pollingInit();
	uiWebServer.runWebServer();
}

load();

//   const testFunctions = require('./testFunctions');
//   testFunctions.BatteryPercentIncrementsTestTimer();
