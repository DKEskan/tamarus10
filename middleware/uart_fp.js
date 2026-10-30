/*
    UARTB is for the testing/debug comms and for the front panel button board comms.

    Acting as slave
*/

const { SerialPort } = require('serialport');
const eskanProtocol = require('./eskanProtocol');
const uiWebServer = require('./uiWebServer');
const execSync = require('child_process').execSync;
const uiWebSocket = require('../middleware/uiWebSocket');


//DEVICE IDs

const UNIT_ID = 0x04	//CU Carrier ID

//ERRORS
const ErrorCode = 
{
    OOR: 100,
    UNKNOWN_COMMAND: 101,
    INDEX_OOR: 102,
    INTERNAL_DATA: 103,
	TX_OFF_FAIL: 104,
	TX_ON_FAIL: 105,
	DESTROY_COVERT_FAIL: 106,
	BUTTON_SEND_FAIL: 107,
	INVALID_IP_SETTINGS: 108,
	GRACEFUL_CU_SHUTDOWN_FAIL: 109,
	PA_SHUTDOWN_FAIL: 110,
}

// TEST COMMANDS
const TestCommand = 
{
    ReadVoltages: 0x40,
	ReadPinState: 0x60,
    SetLed: 0x61,
	SetFp3v3: 0x64,
	SetShutdownFlag: 0x65,
	SetSpareFlag: 0x66,
	SetUsbh5V: 0x67,
	SetPaTargetTemp: 0x82,
    SetPaTempHyst: 0x83,
	SetIpAddress: 0x84
}

// SBUS COMMS
const SBusEvents = 
{
	TxButton: 0xF0,
	DestroyButton: 0xF1,
    CovertButton: 0xF2,
	UpButton: 0xF3,
	DownButton: 0xF4,
	LeftButton: 0xF5,
	RightButton: 0xF6,
	EnterButton: 0xF7,
	Charger: 0xF8,
	PowerSource: 0xF9,
	RequestPaShutdown: 0xFA,
	RequestCuShutdown: 0xFB,
	UnitOnSwitch: 0xFC,
	DeadPixelCheck: 0xFD,
	ReadSbusState:0xFE
}

// STANDARD COMMMANDS
const StandardCommand = 
{
    GetStatus: 0xA0,
    ClearAlarms: 0xA1,
    SetUnitId: 0xA5, // VERY SPECIAL COMMAND!
    GetBuildInfo: 0xB0,
    SetBarcode: 0xB1,
    SetVersion: 0xB2,
    SetSN: 0xB3,
    getConfig: 0xC0,
    ResetController: 0xE0 
}

// RESPONSE TYPES
const ResponseType = 
{
    Ack: 0x41,
    Data: 0x44,
    Nack: 0x4E
}

var portOpen = 0;
var rxBuffLength = 0;

const OK = 0;
const ERROR = null;

const port = new SerialPort({ 
    path: '../dev/colibri-uartc', baudRate: 38400, dataBits: 8, parity: 'none', stopBits: 1, flowControl: false }, function (err) {
    if (err) {
        return console.log('Error: ', err.message)
    }
})

const handleTxData = (data) => {
           
        port.write(data, function(err) {
        	if (err) {
            	return console.log('Error on write: ', err.message)
    		}
        })     
}

const runUart = () => {
    port.on('open', onOpen);

    function onOpen(){
      //  console.log('Open UART B!');
        portOpen = 1;
    }

    // Read data that is available but keep the stream in "paused mode"
    port.on('readable', function () {  
        rxByte(port.read());   //send data straight into a buffer unprocessed
        //console.log(port.read()); 
    })    
    
    port.on('error', function(err) {
    	console.log('Error: ', err.message); 
    })                          
}

function rxByte(data)    
{
     //console.log("rxData");
    //console.log(data);

    const eskanProtocol = require('./eskanProtocol');
    
    var tmp = [];
    if(data === null)
    {
        return null;
    }

    for(var i = 0; i < data.length; i++)
    {
        if (data[i] === 0x01) // Start of message
        {
            rxBuffLength = 0;
            tmp[rxBuffLength++] = data[i] ; // Add to RxBuffer
        }
        else if (data[i]  === 0x02) // End of message
        {
            tmp[rxBuffLength++] = data[i];

            let message = eskanProtocol.unpackAndValidate(tmp);
            if(message !== ERROR)
            {
                handleRxData(message);  
            }    
        }
        else
        {
            tmp[rxBuffLength++] = data[i] ; // Add to RxBuffer
        }
    }
}

function handleRxData(message)
{
    const moduleDataController = require('../controllers/moduleDataController');
    const eskanProtocol = require('./eskanProtocol');
    const gpioHandler = require('./gpioHandler');
    const userDataController = require('../controllers/userDataController');
	const transmitHandler = require('./transmitHandler');
	const buzzLedHandler = require('./buzzLedHandler');
	const CuInterface = require('./unitModules/CuInterface');
	const CuPower = require('./unitModules/CuPower');
	const power = require('./unitModules/power');
	const memData = require('../model/memData.json');
	const ethernet = require('./ethernet');
	
	
    let response = [];

	try{
		if(message[0] === UNIT_ID)
		{
			
			if(message[1] === TestCommand.ReadVoltages)
			{
				let CuCarrierData = (moduleDataController.getModuleMap()).System;
	
				if(CuCarrierData !== ERROR)  //Set command handle
				{        
					response.push(UNIT_ID); // Unit ID
					response.push(message[1]); // Msg ID  ... Status Request
					response.push(ResponseType.Data); // Data to follow

					response.push(CuCarrierData.status.V_3V3 & 0xFF);
					response.push((CuCarrierData.status.V_3V3 >> 8) & 0xFF);
		
					response.push(CuCarrierData.status.V_3V3P & 0xFF);
					response.push((CuCarrierData.status.V_3V3P>> 8) & 0xFF);
		
					response.push(CuCarrierData.status.V_SOM3V3 & 0xFF);
					response.push((CuCarrierData.status.V_SOM3V3 >> 8) & 0xFF);
		
					response.push(CuCarrierData.status.I_SOM3V3 & 0xFF);
					response.push((CuCarrierData.status.I_SOM3V3 >> 8) & 0xFF);
		
					eskanProtocol.packAndQueue(response,0,"UARTB");
				}
				else
				{
					sendNak(message[1], ErrorCode.INTERNAL_DATA);
				}
			}
			else if(message[1] === TestCommand.ReadPinState) // SET Green led LED1
			{

				response.push(UNIT_ID); // Unit ID
				response.push(message[1]); // Msg ID  ... Status Request
				response.push(ResponseType.Data); // Data to follow

				let gpioPins = gpioHandler.getPinState();
				if (gpioPins.led1.state === 1)
				{
					response.push(0x30);
				}
				else
				{
					response.push(0x31);
				}

				if (gpioPins.led2.state === 1)
				{
					response.push(0x30);
				}
				else
				{
					response.push(0x31);
				}

				if (gpioPins.led3.state === 1)
				{
					response.push(0x30);
				}
				else
				{
					response.push(0x31);
				}

				if (gpioPins.shutdownFlag.state === 1)
				{
					response.push(0x31);
				}
				else
				{
					response.push(0x30);
				}

				if (gpioPins.flagSpare.state === 1)
				{
					response.push(0x31);
				}
				else
				{
					response.push(0x30);
				}

				if (gpioPins.fp_3v3.state === 1)
				{
					response.push(0x31);
				}
				else
				{
					response.push(0x30);
				}

				if (gpioPins.USBH_5V.state === 1)
				{
					response.push(0x30);
				}
				else
				{
					response.push(0x31);
				}
				
				eskanProtocol.packAndQueue(response,0,"UARTB");
			}
			else if(message[1] === TestCommand.SetLed) // SET Green led LED1
			{
				if(message[2] === 0x00)
				{
					if (message[3] === 0x31) // LED on (lit)
					{
						gpioHandler.writePin(gpioHandler.gpioPin.led1, 0);
						sendAck(message[1]);
					}
					else if (message[3] === 0x30) // LED off (extinguished)
					{
						gpioHandler.writePin(gpioHandler.gpioPin.led1, 1);
						sendAck(message[1]);
					}
					else
					{
						sendNak(message[1], ErrorCode.OOR);
					}
				}
				else if(message[2] === 0x01)
				{
					if (message[3] === 0x31) // LED on (lit)
					{
						gpioHandler.writePin(gpioHandler.gpioPin.led2, 0);
						sendAck(message[1]);
					}
					else if (message[3] === 0x30) // LED off (extinguished)
					{
						gpioHandler.writePin(gpioHandler.gpioPin.led2, 1);
						sendAck(message[1]);
					}
					else
					{
						sendNak(message[1], ErrorCode.OOR);
					}
				}
				else if(message[2] === 0x02)
				{
					if (message[3] === 0x31) // LED on (lit)
					{
						gpioHandler.writePin(gpioHandler.gpioPin.led3, 0);
						sendAck(message[1]);
					}
					else if (message[3] === 0x30) // LED off (extinguished)
					{
						gpioHandler.writePin(gpioHandler.gpioPin.led3, 1);
						sendAck(message[1]);
					}
					else
					{
						sendNak(message[1], ErrorCode.OOR);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === TestCommand.SetFp3v3) // SET FP 3V3
			{
				if (message[2] === 0x31) // FP 3V3 ON
				{
					gpioHandler.writePin(gpioHandler.gpioPin.fp_3v3, 1);
					sendAck(message[1]);
				}
				else if (message[2] === 0x30) // FP 3V3 OFF
				{
					gpioHandler.writePin(gpioHandler.gpioPin.fp_3v3, 0);
					sendAck(message[1]);
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === TestCommand.SetShutdownFlag) // SET shutdown flag
			{
				if (message[2] === 0x31) // flag ON
				{
					
					gpioHandler.writePin(gpioHandler.gpioPin.shutdownFlag, 1);
					sendAck(message[1]);
				}
				else if (message[2] === 0x30) // flag OFF
				{
					gpioHandler.writePin(gpioHandler.gpioPin.shutdownFlag, 0);
					sendAck(message[1]);
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === TestCommand.SetSpareFlag) // SET spare flag
			{
				if (message[2] === 0x31) // flag ON
				{
					
					gpioHandler.writePin(gpioHandler.gpioPin.flagSpare, 1);
					sendAck(message[1]);
				}
				else if (message[2] === 0x30) // flag OFF
				{
					gpioHandler.writePin(gpioHandler.gpioPin.flagSpare, 0);
					sendAck(message[1]);
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === TestCommand.SetUsbh5V) // SET USBH 5V output
			{
				if (message[2] === 0x31) // flag ON
				{
					
					gpioHandler.writePin(gpioHandler.gpioPin.USBH_5V, 0);
					sendAck(message[1]);
				}
				else if (message[2] === 0x30) // flag OFF
				{
					gpioHandler.writePin(gpioHandler.gpioPin.USBH_5V, 1);
					sendAck(message[1]);
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === TestCommand.SetPaTargetTemp) // Msg ID  ... Set PA Target Temperature
			{
				if ((message[2] >=20) && (message[2] <=100))
				{
					memData.PaTargetTemp = message[2];
					if(userDataController.saveToMemDataJson() !== ERROR)
					{
						let CuCarrierObj = {"config":{}};
						CuCarrierObj.config.PaTargetTemp = message[2];
						moduleDataController.updateCarrierConfig(CuCarrierObj);
						sendAck(message[1]);
					}
					else
					{
						sendNak(message[1], ErrorCode.INTERNAL_DATA);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === TestCommand.SetPaTempHyst) // Msg ID  ... Set PA Temperature Hysteresis
			{
				if ((message[2] >=0) && (message[2] <=20))
				{
					memData.PaTempHyst = message[2];
					if(userDataController.saveToMemDataJson() !== ERROR)
					{
						let CuCarrierObj = {"config":{}};
						CuCarrierObj.config.PaTempHyst = message[2];
						moduleDataController.updateCarrierConfig(CuCarrierObj);
						sendAck(message[1]);
					}
					else
					{
						sendNak(message[1], ErrorCode.INTERNAL_DATA);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === TestCommand.SetIpAddress) // Msg ID  ... Set IP Address
			{
				let ipAddr = message[2] + "." + message[3] + "." + message[4] + "." + message[5];
				let subnet = message[6];
				let gatewayAddr = message[7] + "." + message[8] + "." + message[9] + "." + message[10];
				if((ethernet.validateIpInput(ipAddr, subnet, gatewayAddr, 0, 0)&0x07) === 0) //check parameters valid
				{
					if(ethernet.setIpConfig(ipAddr, subnet, gatewayAddr) === 0)
					{
						ethernet.restartEthService();
						sendAck(message[1]);
					}
					else
					{
						sendNak(message[1], ErrorCode.INTERNAL_DATA);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.INVALID_IP_SETTINGS);
				}
			}
			else if(message[1] === StandardCommand.GetStatus)
			{
				let CuCarrierData = (moduleDataController.getModuleMap()).System;
				
				if(CuCarrierData !== ERROR)  //Set command handle
				{       
					response.push(UNIT_ID); // Unit ID
					response.push(message[1]); // Msg ID  ... Status Request
					response.push(ResponseType.Data); // Data to follow
		
					response.push(CuCarrierData.status.overallStatusVal); // 1 byte overall status summary
					response.push(CuCarrierData.status.alarmsVal);
					response.push(CuCarrierData.status.warningsVal);
					response.push(CuCarrierData.status.statusVal);
					
					response.push(CuCarrierData.status.V_IN & 0xFF);
					response.push((CuCarrierData.status.V_IN >> 8) & 0xFF);

					//CU power module comms alarm bitfield
					response.push(CuCarrierData.uartCommsAlarms.CuPowerVal & 0xFF);

					//Distribution module comms alarm bitfield
					response.push(CuCarrierData.uartCommsAlarms.distriVal & 0xFF);
		
					//fan module comms alarm bitfield
					response.push(CuCarrierData.uartCommsAlarms.fanVal & 0xFF);
					response.push((CuCarrierData.uartCommsAlarms.fanVal >> 8) & 0xFF);
		
					//PA module comms alarm bitfield
					response.push(CuCarrierData.uartCommsAlarms.paVal  & 0xFF);
					response.push((CuCarrierData.uartCommsAlarms.paVal  >> 8) & 0xFF);
		
					//DDS module comms alarm bitfield
					response.push(CuCarrierData.uartCommsAlarms.ddsVal & 0xFF);
					response.push((CuCarrierData.uartCommsAlarms.ddsVal >> 8) & 0xFF);

					//CU Interface module comms alarm bitfield
					response.push(CuCarrierData.uartCommsAlarms.CuInterfaceVal & 0xFF);

					//Protection module comms alarm bitfield
					response.push(CuCarrierData.uartCommsAlarms.protectionVal  & 0xFF);
					response.push((CuCarrierData.uartCommsAlarms.protectionVal  >> 8) & 0xFF);	
					
					//Power module comms alarm bitfield
					response.push(CuCarrierData.uartCommsAlarms.powerVal & 0xFF);

					//TX button status
					response.push(userDataController.getTxButtonOnState() === true ? 0x31 : 0x30);

					//covert mode status
					response.push(userDataController.getCovertMode() === true ? 0x31 : 0x30);
					
					eskanProtocol.packAndQueue(response,0,"UARTB");
				}
				else
				{
					sendNak(message[1], ErrorCode.INTERNAL_DATA);
				}
			}
			else if(message[1] === StandardCommand.ClearAlarms) // Clear Alarms Command
			{
				moduleDataController.clearCarrierAlarms(); 
				sendAck(message[1]);
			}
			else if(message[1] === StandardCommand.GetBuildInfo) // Get Build info
			{			
				if(message[2] === 0) //PCB data
				{
					let CuCarrierData = (moduleDataController.getModuleMap()).System.buildInfo;
					
					if(CuCarrierData !== ERROR)  //Set command handle
					{
						response.push(UNIT_ID); // Unit ID
						response.push(message[1]); // Msg ID  ... Status Request
						response.push(ResponseType.Data); // Data to follow
						response.push(message[2]); // build index
						
						for(let i = 0; i < CuCarrierData.PcbBarcode.length; i++)
						{
							response.push((CuCarrierData.PcbBarcode[i]).charCodeAt(0));
						}
						
						response.push(CuCarrierData.PcbVersion & 0xFF);
						response.push((CuCarrierData.PcbVersion >> 8) & 0xFF);
						
						for(let i = 0; i < CuCarrierData.PcbSerialNumber.length; i++)
						{
							response.push((CuCarrierData.PcbSerialNumber[i]).charCodeAt(0));
						}

						let fw = CuCarrierData.PcbFirmware.split(".");
						response.push((parseInt(fw[0]) & 0xFF));
						response.push((parseInt(fw[1]) & 0xFF));
						response.push((parseInt(fw[2]) & 0xFF));
						
						eskanProtocol.packAndQueue(response,0,"UARTB");
					}
					else
					{
						sendNak(message[1], ErrorCode.INTERNAL_DATA);
					}
				}
				else if(message[2] === 1)    //system data
				{
					let CuCarrierData = (moduleDataController.getModuleMap()).System.buildInfo;
				
					if(CuCarrierData !== ERROR)  //Set command handle
					{
						response.push(UNIT_ID); // Unit ID
						response.push(message[1]); // Msg ID  ... Status Request
						response.push(ResponseType.Data); // Data to follow
						response.push(message[2]); // build index
		
						for(let i = 0; i < CuCarrierData.Barcode.length; i++)
						{
							response.push((CuCarrierData.Barcode[i]).charCodeAt(0));
						}
						
						response.push(CuCarrierData.Version & 0xFF);
						response.push((CuCarrierData.Version >> 8) & 0xFF);
						
						for(let i = 0; i < CuCarrierData.SerialNumber.length; i++)
						{
							response.push((CuCarrierData.SerialNumber[i]).charCodeAt(0));
						}
						
						let sw = CuCarrierData.Software.split(".");
						response.push((parseInt(sw[0]) & 0xFF));
						response.push((parseInt(sw[1]) & 0xFF));
						response.push((parseInt(sw[2]) & 0xFF));
								
						eskanProtocol.packAndQueue(response,0,"UARTB");
					}
					else
					{
						sendNak(message[1], ErrorCode.INTERNAL_DATA);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.INDEX_OOR);
				}
			}
			else if(message[1] === StandardCommand.SetBarcode) // Bar Code String
			{
				if(message[2] <= 1)
				{
					let buildInfo = {"Index":message[2],"Barcode":message.slice(3, 13)};
					let validData = validateBarCode(buildInfo.Barcode);

					if (validData === OK)
					{
						if (CuPower.SetBarcode(CuPower.ModuleIdRange.MIN, buildInfo, null) !== ERROR)
						{
							sendAck(message[1]);
						}
						else
						{
							sendNak(message[1], ErrorCode.INTERNAL_DATA);
						}
					}
					else
					{
						sendNak(message[1], ErrorCode.OOR);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.INDEX_OOR);
				}
			}
			else if (message[1] === StandardCommand.SetVersion) // Version
			{
				if(message[2] <= 1)
				{
					let buildInfo = {"Index":message[2],"Version":0};
					buildInfo.Version = (message[4] << 8) + message[3];
		
					if (buildInfo.Version <= 999)
					{
						if (CuPower.SetVersion(CuPower.ModuleIdRange.MIN, buildInfo, null) !== ERROR)
						{
							sendAck(message[1]);
						}
						else
						{
							sendNak(message[1], ErrorCode.INTERNAL_DATA);
						}
					}
					else
					{
						sendNak(message[1], ErrorCode.OOR);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.INDEX_OOR);
				}
			}
			else if (message[1] === StandardCommand.SetSN)  //  SN String
			{
			
				if(message[2] <= 1)
				{
					let buildInfo = {"Index":message[2],"SerialNumber":message.slice(3, 13)};
					let validData = validateSerialNumber(buildInfo.SerialNumber);

					if (validData === OK)
					{
						if (CuPower.SetSerialNumber(CuPower.ModuleIdRange.MIN, buildInfo, null) !== ERROR)
						{
							sendAck(message[1]);
						}
						else
						{
							sendNak(message[1], ErrorCode.INTERNAL_DATA);
						}
					}
					else
					{
						sendNak(message[1], ErrorCode.OOR);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.INDEX_OOR);
				}
			}
			else if (message[1] === StandardCommand.getConfig)
			{
				let CuCarrierData = (moduleDataController.getModuleMap()).System;

				if(CuCarrierData !== ERROR)  //Set command handle
				{
					response.push(UNIT_ID); // Unit ID
					response.push(message[1]); // Msg ID  ... Status Request
					response.push(ResponseType.Data); // Data to follow

					for(let i = 0; i < CuCarrierData.buildInfo.PcbBarcode.length; i++)
					{
						response.push((CuCarrierData.buildInfo.PcbBarcode[i]).charCodeAt(0));
					}

					response.push(CuCarrierData.buildInfo.PcbVersion & 0xFF);
					response.push((CuCarrierData.buildInfo.PcbVersion >> 8) & 0xFF);
					
					for(let i = 0; i < CuCarrierData.buildInfo.PcbSerialNumber.length; i++)
					{
						response.push((CuCarrierData.buildInfo.PcbSerialNumber[i]).charCodeAt(0));
					}

					let PcbFw = CuCarrierData.buildInfo.PcbFirmware.split(".");
					response.push((parseInt(PcbFw[0]) & 0xFF));
					response.push((parseInt(PcbFw[1]) & 0xFF));
					response.push((parseInt(PcbFw[2]) & 0xFF));
					
					for(let i = 0; i < CuCarrierData.buildInfo.Barcode.length; i++)
					{
						response.push((CuCarrierData.buildInfo.Barcode[i]).charCodeAt(0));
					}
					
					response.push(CuCarrierData.buildInfo.Version & 0xFF);
					response.push((CuCarrierData.buildInfo.Version >> 8) & 0xFF);

					for(let i = 0; i < CuCarrierData.buildInfo.SerialNumber.length; i++)
					{
						response.push((CuCarrierData.buildInfo.SerialNumber[i]).charCodeAt(0));
					}
		
					let sw = CuCarrierData.buildInfo.Software.split(".");
					response.push((parseInt(sw[0]) & 0xFF));
					response.push((parseInt(sw[1]) & 0xFF));
					response.push((parseInt(sw[2]) & 0xFF));

					let ipArr = CuCarrierData.config.IPAddress.split(".");
					response.push((parseInt(ipArr[0]) & 0xFF));
					response.push((parseInt(ipArr[1]) & 0xFF));
					response.push((parseInt(ipArr[2]) & 0xFF));
					response.push((parseInt(ipArr[3]) & 0xFF));
		
					response.push(CuCarrierData.config.Subnet & 0xFF);

					let gatewayArr = CuCarrierData.config.Gateway.split(".");
					response.push((parseInt(gatewayArr[0]) & 0xFF));
					response.push((parseInt(gatewayArr[1]) & 0xFF));
					response.push((parseInt(gatewayArr[2]) & 0xFF));
					response.push((parseInt(gatewayArr[3]) & 0xFF));
		
					response.push(CuCarrierData.config.PaTargetTemp & 0xFF);
					response.push(CuCarrierData.config.PaTempHyst & 0xFF);
				
					eskanProtocol.packAndQueue(response,0,"UARTB");
				}
				else
				{
					sendNak(message[1], ErrorCode.INTERNAL_DATA);
				}
			}
			else if(message[1] === SBusEvents.TxButton) // Msg ID  ... Set transmit on/off
			{
				// let overallAlarm = userDataController.getUnitOverallAlarm();
				// if(overallAlarm === true)	//on button press, try to reset alarm state.
				// {
				// 	moduleDataController.clearAlarms();
				// 	uiWebSocket.sendButtonUpdate("U");
				// }
				// else if(moduleDataController.getPowerPcbWarning() === true)
				// {
				// 	moduleDataController.updateOverallAlarm(moduleDataController.ResetOptions.Warnings);
				// }

				let overallAlarm = userDataController.getUnitOverallAlarm();

				if (overallAlarm === true)
				{
					moduleDataController.clearAlarms();
					uiWebSocket.sendButtonUpdate("U");
				}
				else if (moduleDataController.getPowerPcbWarning() === true)
				{
					moduleDataController.updateOverallAlarm(
						moduleDataController.ResetOptions.Warnings
					);
				}
				
				let state;
				let success;
				if(userDataController.getCovertMode() === true)	//pressing any button turns off covert mode
				{
					state = {"IsConvertModeOn":false};	
					success = userDataController.updateUserConfig(state);
					uiWebSocket.sendButtonUpdate("U");
				} 

				if(success !== ERROR)
				{
					if(message[2] === 0x30)	//mute / transmit off
					{
						//transmitting, needs to turn off regardless of unit on/off
						if((userDataController.getUserIsTransmitting()).IsTransmitting === true)	
						{
							transmitHandler.TxState(transmitHandler.TxNewStates.Stop);
							success = uiWebSocket.sendButtonUpdate("U");
							if(success !== ERROR)
							{
								sendAck(message[1]);
							}
							else
							{
								sendNak(message[1], ErrorCode.BUTTON_SEND_FAIL);
							}							
						}
						else //do nothing if already off
						{
							sendAck(message[1]);
						}
					}
					else if(message[2] === 0x31)	//Unmute / transmit on
					{

						if(	((userDataController.getUserIsTransmitting()).IsTransmitting === false) &&	//check if already transmitting
							((userDataController.getUserIsUnitOn()).IsUnitOn === true) &&	//unit needs to be turned on for transmitting, could be charging
							(userDataController.getUnitOverallAlarm() === false) ) //only turn on if no alarms
						{
							transmitHandler.TxState(transmitHandler.TxNewStates.Start); //carry out turning on unit, if not already running process
							success = uiWebSocket.sendButtonUpdate("U");
							if(success !== ERROR)
							{
								sendAck(message[1]);
							}
							else
							{
								sendNak(message[1], ErrorCode.BUTTON_SEND_FAIL);
							}
						}
						else //do nothing if already on
						{
							sendAck(message[1]);
						}
					}
					else
					{
						sendNak(message[1], ErrorCode.OOR);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.DESTROY_COVERT_FAIL);
				}
			}
			else if(	(message[1] === SBusEvents.CovertButton) || (message[1] === SBusEvents.DestroyButton) || 
						(message[1] === SBusEvents.RightButton)  || (message[1] === SBusEvents.LeftButton) ||
						(message[1] === SBusEvents.UpButton) 	 || (message[1] === SBusEvents.DownButton) ||
						(message[1] === SBusEvents.EnterButton) 	) // Msg ID  ... Set Button Press
			{
				// let overallAlarm = userDataController.getUnitOverallAlarm();
				// if(overallAlarm === true)	//on button press, try to reset alarm state.
				// {
				// 	moduleDataController.clearAlarms();
				// 	uiWebSocket.sendButtonUpdate("U");
				// }
				// else if(moduleDataController.getPowerPcbWarning() === true)
				// {
				// 	moduleDataController.updateOverallAlarm(moduleDataController.ResetOptions.Warnings);
				// }
		
				let overallAlarm = userDataController.getUnitOverallAlarm();

				const isAlarmNavigation =
					message[1] === SBusEvents.UpButton ||
					message[1] === SBusEvents.DownButton;

				if (overallAlarm === true)
				{
					// Up/down browses the alarm list without clearing alarms.
					if (!isAlarmNavigation)
					{
						moduleDataController.clearAlarms();
						uiWebSocket.sendButtonUpdate("U");
					}
				}
				else if (moduleDataController.getPowerPcbWarning() === true)
				{
					moduleDataController.updateOverallAlarm(
						moduleDataController.ResetOptions.Warnings
					);
				}


				let success = OK;

				let state;
				if(userDataController.getCovertMode() === true)	//any button turns off covert mode
				{
					state = {"IsConvertModeOn":false};	
					success = userDataController.updateUserConfig(state);
				} 
				else
				{
					if(message[1] === SBusEvents.CovertButton)	//covert button pressed, turn on
					{
						state = {"IsConvertModeOn":true};
						buzzLedHandler.buzzLedStateOff();
						success = userDataController.updateUserConfig(state);
						// CuInterface.SetTxLedState(1, {"IsTxLedOn":false}, null);	//LED stays on during covert
					}
				}
					
				if(success !== ERROR)
				{
				
					switch(message[1])	//send button update to UI
					{
						case SBusEvents.RightButton : 
							success = uiWebSocket.sendButtonUpdate("6");
							break;
						case SBusEvents.LeftButton : 
							success = uiWebSocket.sendButtonUpdate("4");
							break;
						case SBusEvents.UpButton : 
							success = uiWebSocket.sendButtonUpdate("8");
							break;
						case SBusEvents.DownButton : 
							success = uiWebSocket.sendButtonUpdate("2");
							break;
						case SBusEvents.EnterButton : 
							success = uiWebSocket.sendButtonUpdate("5");
							break;
						case SBusEvents.CovertButton : 
							success = uiWebSocket.sendButtonUpdate("U");	//UI to get config
							break;
						case SBusEvents.DestroyButton : 
							success = uiWebSocket.sendButtonUpdate("D");
							break;
						default :
							break;
					}
					
					if(success !== ERROR)
					{
						sendAck(message[1]);
					}
					else
					{
						sendNak(message[1], ErrorCode.BUTTON_SEND_FAIL);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.DESTROY_COVERT_FAIL);
				}
			}
			else if(message[1] === SBusEvents.PowerSource) // Msg ID  ... Set Button Press
			{
				let state;
				if(userDataController.getCovertMode() === true)	//revert covert mode if power plugged in
				{
					state = {"IsConvertModeOn":false};	
					success = userDataController.updateUserConfig(state);
					uiWebSocket.sendButtonUpdate("U");
				} 

				//if power source connected, clear alarms as they may be from restart
				moduleDataController.clearCarrierAlarms(); 
    			moduleDataController.updateOverallAlarm(moduleDataController.ResetOptions.Alarms);

				if((message[2] === 0x31) || (message[2] === 0x30))	//External 24V Connected
				{
					let state = (message[2] === 0x31) ? {"PowerSource":"EXT24V"} : {"PowerSource":"BAT"}; 
					let success = userDataController.updateUserConfig(state);
					
					if(success !== ERROR)
					{
						success = uiWebSocket.sendButtonUpdate("U"); //update UI	
						if(success !== ERROR)
						{	
							sendAck(message[1]);
						}
						else
						{
							sendNak(message[1], ErrorCode.BUTTON_SEND_FAIL);
						}
					}
					else
					{
						sendNak(message[1], ErrorCode.INTERNAL_DATA);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === SBusEvents.RequestCuShutdown) // Msg ID  ... Set Button Press
			{
				try
				{
					console.log("RequestCuShutdown");
					while(userDataController.getSavingStatus() && ethernet.getSavingStatus()){}	//wait for any saving to complete
					sendAck(message[1]);
					for(let i = 0; i < 1000; i++){}	//short wait for response to be sent
					gpioHandler.writePin(gpioHandler.gpioPin.shutdownFlag, 0);
					executeCommand(`poweroff`, "poweroff"); 
				}
				catch(error)
				{
					console.log("UART FP Request CU Shutdown. Failed to shutdown CU gracefully");
					console.log(error);
					sendNak(message[1], ErrorCode.GRACEFUL_CU_SHUTDOWN_FAIL);
				}
			}
			else if(message[1] === SBusEvents.RequestPaShutdown) // Msg ID  ... Set Button Press
			{
				try
				{
					console.log("RequestPaShutdown");
					transmitHandler.TxState(transmitHandler.TxNewStates.UrgentOff); //carry out turning off, if not already turning on/off
					sendAck(message[1]);
				}
				catch(error)
				{
					console.log("UART FP Request PA Shutdown. Failed to shutdown PAs");
					console.log(error);
					sendNak(message[1], ErrorCode.PA_SHUTDOWN_FAIL);
				}
			}
			else if(message[1] === SBusEvents.Charger) // Msg ID  ... Set Button Press
			{
				/*
					0x30 - Not present
					0x31 - Present and not charging
					0x32 - Present and charging
					0x33 - Present but flat and not charging
				*/
				let state = {"BatteryCharging":[0,0,0]};
				state.BatteryCharging[0] = parseInt(message[2] - 0x30);
				state.BatteryCharging[1] = parseInt(message[3] - 0x30);
				state.BatteryCharging[2] = parseInt(message[4] - 0x30);

				if((state.BatteryCharging[0] <= 3) || (state.BatteryCharging[1] <= 3) || (state.BatteryCharging[2] <= 3))
				{
					let success = userDataController.updateUserConfig(state);
					if(success !== ERROR)
					{
						success = uiWebSocket.sendButtonUpdate("U");	
						if(success !== ERROR)
						{	
							sendAck(message[1]);
						}
						else
						{
							sendNak(message[1], ErrorCode.BUTTON_SEND_FAIL);
						}
					}
					else
					{
						sendNak(message[1], ErrorCode.INTERNAL_DATA);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === SBusEvents.UnitOnSwitch) // Msg ID  ... Set Button Press
			{
				let state;
				let success = OK;
				if(userDataController.getCovertMode() === true)	//revert covert mode if unit turned on
				{
					state = {"IsConvertModeOn":false};	
					success = userDataController.updateUserConfig(state);
					uiWebSocket.sendButtonUpdate("U");
				} 

				//if unit on switch triggered, turn off alarms
				moduleDataController.clearCarrierAlarms(); 
    			moduleDataController.updateOverallAlarm(moduleDataController.ResetOptions.Alarms);

				//ensure TX is off regardless of turning switch on or off.
				if((userDataController.getUserIsTransmitting()).IsTransmitting === true)
				{
					transmitHandler.TxState(transmitHandler.TxNewStates.UrgentOff);
				}

				if((message[2] === 0x31) || (message[2] === 0x30))	//External 24V Connected
				{
					state = (message[2] === 0x31) ? {"IsUnitOn":true} : {"IsUnitOn":false}; 
					success = userDataController.updateUserConfig(state);
					
					if(success !== ERROR)
					{
						success = uiWebSocket.sendButtonUpdate("U"); //update UI	
						if(success !== ERROR)
						{	
							sendAck(message[1]);
						}
						else
						{
							sendNak(message[1], ErrorCode.BUTTON_SEND_FAIL);
						}
					}
					else
					{
						sendNak(message[1], ErrorCode.INTERNAL_DATA);
					}
				}
				else
				{
					sendNak(message[1], ErrorCode.OOR);
				}
			}
			else if(message[1] === SBusEvents.DeadPixelCheck) // Msg ID  ... Set Button Press
			{
				let success = uiWebSocket.sendButtonUpdate("P");	
				if(success !== ERROR)
				{	
					sendAck(message[1]);
				}
				else
				{
					sendNak(message[1], ErrorCode.BUTTON_SEND_FAIL);
				}
			}
			else if(message[1] === SBusEvents.ReadSbusState) // Get Charging / power source states
			{
				response.push(UNIT_ID); // Unit ID
				response.push(message[1]); // Msg ID  ... Status Request
				response.push(ResponseType.Data); // Data to follow

				if (userDataController.getBatteryCharging()[0] === false)
				{
					response.push(0x30);
				}
				else
				{
					response.push(0x31);
				}

				if (userDataController.getBatteryCharging()[1]  === false)
				{
					response.push(0x30);
				}
				else
				{
					response.push(0x31);
				}

				if (userDataController.getBatteryCharging()[2]  === false)
				{
					response.push(0x30);
				}
				else
				{
					response.push(0x31);
				}

				if (userDataController.getPowerSource() === "BAT")
				{
					response.push(0x30);
				}
				else
				{
					response.push(0x31);
				}
				
				eskanProtocol.packAndQueue(response,0,"UARTB");
			}
			else if (message[1] === StandardCommand.ResetController) // RESET uC
			{
				execSync("reboot", {stdio : 'pipe' });
			}
			else
			{
				sendNak(message[1], ErrorCode.UNKNOWN_COMMAND);
			}
		}
	}
	catch(error){
		console.log(`SBUS Message error, command ${message[1]}`);
		console.log(error);
	}
}

function sendAck(CommandID)
{
	let response = [];

    response.push(UNIT_ID); // Unit ID
    response.push(CommandID); // Msg ID  ... Status Request
    response.push(ResponseType.Ack); // ack response

	eskanProtocol.packAndQueue(response,0,"UARTB");
}

function sendNak(CommandID, errorNumber)
{
	let response = [];
	
    response.push(UNIT_ID); // Unit ID
    response.push(CommandID); // Msg ID  ... Status Request
    response.push(ResponseType.Nack); // ack response
    response.push(errorNumber & 0xFF); // ack response
    response.push((errorNumber >> 8) & 0xFF); // ack response

	eskanProtocol.packAndQueue(response,0,"UARTB");
}

function validateBarCode(barcode)
{
	let retVal = OK;

	// Check first 4 characters are upper case letters 'A'-'Z'
	for (let i = 0; i <= 3; i++)
	{
		if ((barcode[i] < 'A') || (barcode[i] > 'Z'))
		{
			retVal = ERROR;
			break;
		}
	}

	if (retVal === 1)
	{
		// Check characters 4-7 are numeric '0'->'9'
		for (let i = 4; i <= 7; i++)
		{
			if ((barcode[i] < '0') || (barcode[i] > '9'))
			{
				retVal = ERROR;
				break;
			}
		}
	}

	if (retVal === 1)
	{
		// Check characters 8-9 are upper case letters 'A'->'Z'
		for (let i = 8; i <= 9; i++)
		{
			if ((barcode[i] < 'A') || (barcode[i] > 'Z'))
			{
				retVal = ERROR;
				break;
			}
		}
	}

	return retVal;

}

function validateSerialNumber(sn)
{
	let retVal = OK;

	// Check first 3 characters are upper case letters 'A'-'Z'
	for (let i = 0; i < 3; i++)
	{
		if ((sn[i] < 'A') || (sn[i] > 'Z'))
		{
			retVal = ERROR;
			break;
		}
	}

	if (retVal === 1)
	{
		// Check characters 3-9 are numeric '0'->'9'
		for (let i = 3; i <= 9; i++)
		{
			if ((sn[i] < '0') || (sn[i] > '9'))
			{
				retVal = ERROR;
				break;
			}
		}
	}

	return retVal;

}

function executeCommand(textToExecute)
{
    //console.log(`sending ${tag}: ${textToExecute}`);
    	
	try{
        const data = execSync(textToExecute, {stdio : 'pipe' });  
        return data;
    }catch(err){
        console.error(err);
    }
}

module.exports = { runUart, handleTxData, handleRxData, UNIT_ID }; //functions to export

                    
