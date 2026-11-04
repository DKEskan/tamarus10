/*
    UARTC is for the comms bus interfacing with modules.

    acting as master
*/

const { SerialPort } = require('serialport');
const uiWebServer = require('./uiWebServer');

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
	setUnitId: 0xA5,
	getBuildInfo: 0xB0,
	getConfig: 0xC0,
	setSoftReset: 0xE0
}

const apiTimeout = 20; //seconds - match UART message timeout with a margin, all messages currently internal
const UART_MESSAGE_TIMEOUT = 1500; //ms
var sendingFlag = 0; //flag to ensure one message and response handled at a time
var sendingMessage = 0;
var portOpen = 0;

var rxBuffHead = 0;
var rxBuffTail = 0;
var rxDataFlag = 0;
const rxBuffSize = 32;
const rxBuffMaxChars = 1024;
var rxBuffLength = 0;
let currentRxFrame = [];
let receivingFrame = false;

let rxBuffer = new Array(rxBuffSize);   //create an array with rxBuffSize values

var txBuffHead = 0;
var txBuffTail = 0;
var txDataFlag = 0;
const txBuffSize = 256; //allow enough room for init messages and multiple requests from multiple users
const txBuffMaxChars = 1024;
var txBuffLength = 0;

let txBuffer = new Array(txBuffSize);   //create an array with rxBuffSize values

const { v4: uuid } = require('uuid');
const cmdQueue = new Map();

const OK = 0;
const ERROR = null;
let timeoutFinished = 1;


var checkRxTimeoutId;

//const checkRxTimeoutId; // = setTimeout(checkRxTimeout, 3000);

const port = new SerialPort({ 
    path: '../dev/colibri-uartb', baudRate: 38400, dataBits: 8, parity: 'none', stopBits: 1, flowControl: false }, function (err) {
    if (err) {
        return console.log('Error: ', err.message)
    }
})

function MsgInQueue(queue, unitId, msgId, endPoint) {
    for (let [key, value] of queue.entries()) {
        if ((value.unitId === unitId) && (value.msgId === msgId) && (value.endPoint === endPoint))
        {
            return true;
        }
    }
    return false;
}

function RefreshTimeout(queue, unitId, msgId, endPoint) {
    for (let [key, value] of queue.entries()) {
        if ((value.unitId === unitId) && (value.msgId === msgId) && (value.endPoint === endPoint))
        {
        	value.apiTimeout = apiTimeout;
        }
    }
}

function addToTxQueue(data, endPoint, cmdData)
{
    console.log('[QUEUE]', Buffer.from(data).toString('hex'));

    if(endPoint !== 0)
    {
        let unitId = data[1];
        let msgId = data[2];
        let setMsg = cmdData;
        if(!MsgInQueue(cmdQueue, unitId, setMsg, endPoint))	//if message already in queue, ignore duplicate
        {
	        const id = uuid();
	        const metadata = {endPoint, unitId, msgId, setMsg, apiTimeout};
	        cmdQueue.set(id, metadata);
	        
        }
        else
        {
        	RefreshTimeout(cmdQueue, unitId, setMsg, endPoint);
        }
    }
        
    txBuffer[txBuffHead++] = data;  
    if(txBuffHead >= txBuffSize)
    {
        txBuffHead = 0;
    } 
    txDataFlag = 1;        
}


const handleTxData = () => {
    if((txDataFlag === 1) && (sendingFlag === 0))    //send buffer command in a managed way
    {    
        sendingFlag = 1; //raise flag to say uart is in use (mutex functionality). Only clear when response received or timeout
        sendingMessage = txBuffTail; //track which message is being sent for timeout check.
       	// if(txBuffer[txBuffTail][1] === 0x30)
       	// {
        //     console.log("sent PA command");
        //     console.log(txBuffTail);
        //     console.log(txBuffHead);
        	// console.log("sent");
            // console.log(sendingMessage);
            // console.log(txBuffer[txBuffTail]);
        // }
        
        console.log('[TX]', Buffer.from(txBuffer[txBuffTail]).toString('hex'));
        port.write(txBuffer[txBuffTail], function(err) {
        	if (err) {
            	return console.log('Error on write: ', err.message)
    		}
        })     
        txBuffTail++;
        if(txBuffTail >= txBuffSize)
        {
            txBuffTail = 0;
        }
        if(txBuffHead === txBuffTail)
        {
            txDataFlag = 0;
        }   

        timeoutFinished = 0;
        checkRxTimeoutId = setTimeout(checkRxTimeout, UART_MESSAGE_TIMEOUT);
    }
}

function checkRxTimeout()
{
    const polling = require('./polling');
    const pa = require('./unitModules/pa');
	const dds = require('./unitModules/dds');
	const fan = require('./unitModules/fan');
    const distribution = require('./unitModules/distribution');
    const CuPower = require('./unitModules/CuPower');
    const CuInterface = require('./unitModules/CuInterface');
    const protection = require('./unitModules/protection');
    const power = require('./unitModules/power');

    console.log(sendingFlag, sendingMessage, txBuffTail, txBuffHead);

    //if((sendingFlag === 1) && (txBuffTail-1 === sendingMessage)) //if still no response from the same message
    if((sendingFlag === 1) && (((txBuffTail - 1 + txBuffSize) % txBuffSize) === sendingMessage))
    {     
        sendingFlag = 0;    //assume no response will be coming, continue communication messages
        
        if(!polling.IsMappingModules())  //poll all addresses on startup, not all will be used. Only account for errors after init.
        {
        	console.log("UART timeout:");
            if(pa.isModule(txBuffer[sendingMessage][1]))
            {
            	console.log(`PA address ${txBuffer[sendingMessage][1]}`);
                pa.uartCommsAlarm(txBuffer[sendingMessage],ERROR);
            }
            else if(dds.isModule(txBuffer[sendingMessage][1]))
            {
            	console.log(`dds address ${txBuffer[sendingMessage][1]}`);
                dds.uartCommsAlarm(txBuffer[sendingMessage],ERROR);
            }
            else if(fan.isModule(txBuffer[sendingMessage][1]))
            {
            	console.log(`Fan address ${txBuffer[sendingMessage][1]}`);
                fan.uartCommsAlarm(txBuffer[sendingMessage],ERROR);
            }
            else if(distribution.isModule(txBuffer[sendingMessage][1]))
            {
            	console.log(`Distribution address ${txBuffer[sendingMessage][1]}`);
                distribution.uartCommsAlarm(txBuffer[sendingMessage],ERROR);
            }
            else if(CuPower.isModule(txBuffer[sendingMessage][1]))
            {
            	console.log(`CuPower address ${txBuffer[sendingMessage][1]}`);
                CuPower.uartCommsAlarm(txBuffer[sendingMessage],ERROR);
            }
            else if(CuInterface.isModule(txBuffer[sendingMessage][1]))
            {
            	console.log(`CuInterface address ${txBuffer[sendingMessage][1]}`);
                CuInterface.uartCommsAlarm(txBuffer[sendingMessage],ERROR);
            }
            else if(protection.isModule(txBuffer[sendingMessage][1]))
            {
            	console.log(`protection address ${txBuffer[sendingMessage][1]}`);
                protection.uartCommsAlarm(txBuffer[sendingMessage],ERROR);
            }
            else if(power.isModule(txBuffer[sendingMessage][1]))
            {
            	console.log(`power address ${txBuffer[sendingMessage][1]}`);
                power.uartCommsAlarm(txBuffer[sendingMessage],ERROR);
            }
            else
            {
                console.log(`Unknown address ${txBuffer[sendingMessage]}`);
            }
            
//            console.log(txBuffer[sendingMessage]);
        }
    }
}

const runUart = () => {
    port.on('open', onOpen);

    function onOpen(){
       // console.log('Open UART C!');
        portOpen = 1;
    }

    // Read data that is available but keep the stream in "paused mode"
    port.on('readable', function () {  
    	//clearTimeout(checkRxTimeoutId);
        rxByte(port.read());   //send data straight into a buffer unprocessed
        //console.log(port.read()); 
    })    
    
    port.on('error', function(err) {
    	 console.log('Error: ', err.message); 
    })                          
}

function uartInit()
{
    // console.log("reset data");
    // console.log(rxBuffTail);
    rxBuffHead = 0;
    rxBuffTail = 0;
    rxDataFlag = 0;
    rxBuffLength = 0;
    currentRxFrame = [];
    receivingFrame = false;
    
    for (var i = 0; i < rxBuffSize; i++)
    {
        rxBuffer[i] = new Array(rxBuffMaxChars);    //inside each array, allocate rxBuffMaxChars space per message
    }
    return 0;
}

// function rxByte(data)    
// {
//      //console.log("rxData");
//     //console.log(data);
//     var tmp = [];
//     if(data === null)
//     {
//         return null;
//     }
    
//     // if(data[2] !== 0x03)
//     // {
//     // 	console.log(data.toString()); 
//     // }
// //	if(data[2] === 0x19)
// //{
// //console.log("received response");
// //}
//     for(var i = 0; i < data.length; i++)
//     {
//         if (data[i] === 0x01) // Start of message
//         {
//             rxBuffLength = 0;
//             tmp[rxBuffLength++] = data[i] ; // Add to RxBuffer
//             // console.log("start of message");
//             // console.log(buffer[rxBuffHead]);
//         }
//         else if (data[i]  === 0x02) // End of message
//         {
//             tmp[rxBuffLength++] = data[i];
//             rxBuffer[rxBuffHead] = tmp ; // Add to RxBuffer
//             rxBuffHead += 1;    //circular buffer, keep track of head
//             rxDataFlag = 1; //flag message is ready
//            // console.log("received");    	
//             sendingFlag = 0;
//             if(rxBuffHead >= rxBuffSize) //limit size of buffer    
//             {
//                 rxBuffHead = 0;
//             }      
                
//         }
//         else
//         {
//             tmp[rxBuffLength++] = data[i] ; // Add to RxBuffer
//         }
//     }
// }

function rxByte(data)
{
    if(data === null || data === undefined)
    {
        return null;
    }

    for(let i=0; i<data.length; ++i)
    {
        const byte = data[i];

        if(byte === 0x01)
        {
            currentRxFrame = [byte];
            rxBuffLength = 1;
            receivingFrame = true;
            continue;
        }

        if(!receivingFrame)
        {
            continue;
        }

        if(currentRxFrame.length >= rxBuffMaxChars)
        {
            currentRxFrame = [];
            rxBuffLength = 0;
            receivingFrame = false;
            continue;
        }

        currentRxFrame.push(byte);
        rxBuffLength = currentRxFrame.length;

        if(byte === 0x02)
        {
            rxBuffer[rxBuffHead] = currentRxFrame;

            rxBuffHead++;
            if(rxBuffHead >= rxBuffSize)
            {
                rxBuffHead = 0;
            }

            rxDataFlag = 1;
            clearTimeout(checkRxTimeoutId);
            sendingFlag = 0;

            // Use a new array for the next message.
            // The queued array remains unchanged.
            currentRxFrame = [];
            rxBuffLength = 0;
            receivingFrame = false; 
        }
    }
}

function handleRxData()
{
    if(rxDataFlag === 1)     //buffer filled from uart and flag given when message ready  
    {
        console.log("UART Received");
        let i = 0;
        console.log("RX analyse");
        console.log(rxBuffer[rxBuffTail]);
        while((rxBuffTail !== rxBuffHead) && (i < 10))    //go through maximum queue of 10 uart message. This should not build up
        {
            processRx(rxBuffer[rxBuffTail]);
            
            rxBuffTail+=1;
            if(rxBuffTail === rxBuffHead)
            {
                rxBuffHead = 0;
                rxBuffTail = 0;
                rxDataFlag = 0;
            }
            else if(rxBuffTail > rxBuffSize) //limit size of buffer    
            {
                rxBuffTail = 0;
            }
            i+=1;
        }
    }  
}

function processRx(message)
{
	const moduleDataController = require('../controllers/moduleDataController');
    const userDataController = require('../controllers/userDataController');
	const eskanProtocol = require('./eskanProtocol');
    const polling = require('./polling');
    const pa = require('./unitModules/pa');
	const dds = require('./unitModules/dds');
	const fan = require('./unitModules/fan');
    const distribution = require('./unitModules/distribution');
    const CuPower = require('./unitModules/CuPower');
    const CuInterface = require('./unitModules/CuInterface');
    const protection = require('./unitModules/protection');
    const power = require('./unitModules/power');

    try
    {
        let code;
        let codeMessage;

        let data = eskanProtocol.unpackAndValidate(message);

        // if(data[0] === 0x30)
       	// {
        //     console.log("received PA command");
        // }

        if(data !== ERROR)
        {
            let unitId = data[0];
            let msgId = data[1];
            let response = mapGetByValue(cmdQueue, unitId, msgId);
                    
            if(response !== ERROR)  //Set command handle
            {
                let key = response[0];
                let endPoint = response[1];
                let setMsg = response[2];
                uiWebServer.apiSetResponse(endPoint, data, setMsg);
                cmdQueue.delete(key);
            }    
            else    //internal poll commands handle. Update locally stored values
            {
                if(pa.isModule(unitId))
                {
                    if(polling.IsMappingModules() && (msgId === CommandId.getStatus)) //mapping set up handle
                    {
                        userDataController.createNewUserConfigMap(unitId - pa.ModuleIdRange.MIN);    //only create one user config per path. Use PA as reference
                        moduleDataController.createNewModuleMap(unitId, "paCount");  
                        code = HttpCode.OK;
                        codeMessage = "";
                    }
                    else
                    {
                        [code,codeMessage] = pa.EskanToJson(data);
                    }
                }
                else if(dds.isModule(unitId))
                {
                    if(polling.IsMappingModules() && (msgId === CommandId.getStatus)) //mapping set up handle
                    {
                        moduleDataController.createNewModuleMap(unitId, "ddsCount");   
                        code = HttpCode.OK;
                        codeMessage = "";   
                    }
                    else
                    {
                        [code,codeMessage] = dds.EskanToJson(data);    //commands do not require Json Module object for response
                    }
                }
                else if(fan.isModule(unitId))
                {
                    if(polling.IsMappingModules() && (msgId === CommandId.getStatus)) //mapping set up handle
                    {
                        moduleDataController.createNewModuleMap(unitId, "fanCount");   
                        code = HttpCode.OK;
                        codeMessage = "";
                    }
                    else
                    {
                        [code,codeMessage] = fan.EskanToJson(data);
                    }
                }
                else if(distribution.isModule(unitId))
                {
                    if(polling.IsMappingModules() && (msgId === CommandId.getStatus)) //mapping set up handle
                    {
                        moduleDataController.createNewModuleMap(unitId, "distributionCount"); 
                        code = HttpCode.OK;
                        codeMessage = "";
                    }
                    else
                    {
                        [code,codeMessage] = distribution.EskanToJson(data);    //commands do not require Json Module object for response
                    }
                }
                else if(CuPower.isModule(unitId))
                {
                    if(polling.IsMappingModules() && (msgId === CommandId.getStatus)) //mapping set up handle
                    {
                        moduleDataController.createNewModuleMap(unitId, "CuPowerCount"); 
                        code = HttpCode.OK;
                        codeMessage = "";
                    }
                    else
                    {
                        [code,codeMessage] = CuPower.EskanToJson(data);    //commands do not require Json Module object for response
                    }
                }
                else if(CuInterface.isModule(unitId))
                {
                    if(polling.IsMappingModules() && (msgId === CommandId.getStatus)) //mapping set up handle
                    {
                        moduleDataController.createNewModuleMap(unitId, "CuInterfaceCount"); 
                        code = HttpCode.OK;
                        codeMessage = "";
                    }
                    else
                    {
                        [code,codeMessage] = CuInterface.EskanToJson(data);    //commands do not require Json Module object for response
                    }
                }
                else if(protection.isModule(unitId))
                {
                    if(polling.IsMappingModules() && (msgId === CommandId.getStatus)) //mapping set up handle
                    {
                        moduleDataController.createNewModuleMap(unitId, "protectionCount"); 
                        code = HttpCode.OK;
                        codeMessage = "";
                    }
                    else
                    {
                        [code,codeMessage] = protection.EskanToJson(data);    //commands do not require Json Module object for response
                    }
                }
                else if(power.isModule(unitId))
                {
                    if(polling.IsMappingModules() && (msgId === CommandId.getStatus)) //mapping set up handle
                    {
                        moduleDataController.createNewModuleMap(unitId, "powerCount"); 
                        code = HttpCode.OK;
                        codeMessage = "";
                    }
                    else
                    {
                        [code,codeMessage] = power.EskanToJson(data);    //commands do not require Json Module object for response
                    }
                }
                else
                {
                    code = HttpCode.BadRequest;
                    codeMessage = "Uart response module type not found";
                }

                //TO DO - ADD ERROR LOG
                if(code >= 400)
                {
                    console.log(code + ", " + codeMessage);
                }
            }
        }
        else
        {
            //TO DO - ADD ERROR LOG
            console.log("CRC error, " + data);
        }
    }catch(error)
    {
        console.log("UART bus reply error");
        console.log(error);
    }
}

function mapGetByValue(queue, unitId, msgId) {
    for (let [key, value] of queue.entries()) {
        if ((value.unitId === unitId) && (value.msgId === msgId))
        {
            return [key, value.endPoint, value.setMsg];
        }
    }
    return ERROR;
}

function isPortOpen()
{
	if(portOpen)
	{
		return 1;
	}
	return 0;
}

function isInitPollFinished()
{
    if(txDataFlag)
	{
		return 0;
	}
	return 1;
}

module.exports = { runUart, handleTxData, handleRxData, addToTxQueue, uartInit, isPortOpen, isInitPollFinished, //functions to export
                    cmdQueue }; //variables to export

                    
