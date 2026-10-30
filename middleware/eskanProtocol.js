const uart_bus = require('./uart_bus');

const OK = 0;
const ERROR = null;

function unpackAndValidate(message)
{
	if(message === null)   //error, invalid input
    {
    	console.log("NULL Response")
        return 1;
    }

    let data = unpackSubProtocol(message); //take message from substitute protocol

    if(data === null)   //error, went through entire buffer.
    {
        console.log("Invalid data from UART RX")
        return ERROR;
    }

    let receiveSuccess = validate(data);    //validate and remove CRC chars   
	
    if(receiveSuccess)
    {
        return data;
    }
    else
    {
        console.log("CRC error from UART RX")
        return ERROR;
    }
}

//apply substituion to data
function unpackSubProtocol(data)    
{
    let subFlag = 0;
    let rxBuffLength = 0;
    let tx_data = [];
    
    if(data === null)
    {
        return null;
    }
    for(let i = 0; i < data.length; i++)
    {
        if (data[i] === 0x01) // Start of message
        {
            rxBuffLength = 0;
            subFlag = 0; // Clear substitution flag
        }
        else if (data[i]  === 0x06) // Next byte is substituted .... ignore this byte and taken 0x20 away from next byte
        {
            subFlag = 1; // Set substitution flag
        }
        else if (data[i]  === 0x02) // End of message
        {
            return tx_data;                
        }
        else
        {
            if ((subFlag === 1) && ((data[i]  === 0x21) || (data[i]  === 0x22) || (data[i]  === 0x26))) // If substituted byte
            {
                tx_data[rxBuffLength++] = parseInt(data[i])  - 0x20; // Take away 0x20 to get original value and add to RxBuffer
                subFlag = 0; // Clear substitution flag
            }
            else
            {
                tx_data[rxBuffLength++] = data[i] ; // Add to RxBuffer
            }
        }
    }
    return null;    //Error, should never reach here
}

function validate(data_raw)
{
    //take CRC bytes and make into uint16
    valH = data_raw[data_raw.length-1];
    valL = data_raw[data_raw.length-2];

    crc16_embed = ((0xff & valH) << 8);
    crc16_embed = crc16_embed + (0xff & valL);

    //remove the CRC bytes from data received and compute CRC on data
    data_raw = data_raw.slice(0, -2); // Remove embedded CRC

    crc16 = ComputeCrc16(data_raw);

    return (crc16_embed == crc16);  //compare received CRC with received data, if the same then data has been transfered correctly
}

const crc16tab = 
    [0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50A5, 0x60C6, 0x70E7, 0x8108, 0x9129, 0xA14A, 0xB16B, 0xC18C, 0xD1AD, 0xE1CE, 0xF1EF,
    0x1231, 0x0210, 0x3273, 0x2252, 0x52B5, 0x4294, 0x72F7, 0x62D6, 0x9339, 0x8318, 0xB37B, 0xA35A, 0xD3BD, 0xC39C, 0xF3FF, 0xE3DE,
    0x2462, 0x3443, 0x0420, 0x1401, 0x64E6, 0x74C7, 0x44A4, 0x5485, 0xA56A, 0xB54B, 0x8528, 0x9509, 0xE5EE, 0xF5CF, 0xC5AC, 0xD58D,
    0x3653, 0x2672, 0x1611, 0x0630, 0x76D7, 0x66F6, 0x5695, 0x46B4, 0xB75B, 0xA77A, 0x9719, 0x8738, 0xF7DF, 0xE7FE, 0xD79D, 0xC7BC,
    0x48C4, 0x58E5, 0x6886, 0x78A7, 0x0840, 0x1861, 0x2802, 0x3823, 0xC9CC, 0xD9ED, 0xE98E, 0xF9AF, 0x8948, 0x9969, 0xA90A, 0xB92B,
    0x5AF5, 0x4AD4, 0x7AB7, 0x6A96, 0x1A71, 0x0A50, 0x3A33, 0x2A12, 0xDBFD, 0xCBDC, 0xFBBF, 0xEB9E, 0x9B79, 0x8B58, 0xBB3B, 0xAB1A,
    0x6CA6, 0x7C87, 0x4CE4, 0x5CC5, 0x2C22, 0x3C03, 0x0C60, 0x1C41, 0xEDAE, 0xFD8F, 0xCDEC, 0xDDCD, 0xAD2A, 0xBD0B, 0x8D68, 0x9D49,
    0x7E97, 0x6EB6, 0x5ED5, 0x4EF4, 0x3E13, 0x2E32, 0x1E51, 0x0E70, 0xFF9F, 0xEFBE, 0xDFDD, 0xCFFC, 0xBF1B, 0xAF3A, 0x9F59, 0x8F78,
    0x9188, 0x81A9, 0xB1CA, 0xA1EB, 0xD10C, 0xC12D, 0xF14E, 0xE16F, 0x1080, 0x00A1, 0x30C2, 0x20E3, 0x5004, 0x4025, 0x7046, 0x6067,
    0x83B9, 0x9398, 0xA3FB, 0xB3DA, 0xC33D, 0xD31C, 0xE37F, 0xF35E, 0x02B1, 0x1290, 0x22F3, 0x32D2, 0x4235, 0x5214, 0x6277, 0x7256,
    0xB5EA, 0xA5CB, 0x95A8, 0x8589, 0xF56E, 0xE54F, 0xD52C, 0xC50D, 0x34E2, 0x24C3, 0x14A0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
    0xA7DB, 0xB7FA, 0x8799, 0x97B8, 0xE75F, 0xF77E, 0xC71D, 0xD73C, 0x26D3, 0x36F2, 0x0691, 0x16B0, 0x6657, 0x7676, 0x4615, 0x5634,
    0xD94C, 0xC96D, 0xF90E, 0xE92F, 0x99C8, 0x89E9, 0xB98A, 0xA9AB, 0x5844, 0x4865, 0x7806, 0x6827, 0x18C0, 0x08E1, 0x3882, 0x28A3,
    0xCB7D, 0xDB5C, 0xEB3F, 0xFB1E, 0x8BF9, 0x9BD8, 0xABBB, 0xBB9A, 0x4A75, 0x5A54, 0x6A37, 0x7A16, 0x0AF1, 0x1AD0, 0x2AB3, 0x3A92,
    0xFD2E, 0xED0F, 0xDD6C, 0xCD4D, 0xBDAA, 0xAD8B, 0x9DE8, 0x8DC9, 0x7C26, 0x6C07, 0x5C64, 0x4C45, 0x3CA2, 0x2C83, 0x1CE0, 0x0CC1,
    0xEF1F, 0xFF3E, 0xCF5D, 0xDF7C, 0xAF9B, 0xBFBA, 0x8FD9, 0x9FF8, 0x6E17, 0x7E36, 0x4E55, 0x5E74, 0x2E93, 0x3EB2, 0x0ED1, 0x1EF0];

    
function ComputeCrc16(datalst){
    vcrc16 = 0  // 16-bit
    pos = 0  // 8-bit

    if(datalst.length > 0)
    {

        for (let i = 0; i < datalst.length; i++)
        {
            shrcrc16 = (0xffff & vcrc16) >> 8;
            mrflt = MyReflect8(datalst[i]);
            // XOR-ing next input byte into MSB of crc, 
            // that's our new intermediate divident :
            pos = 0xff & (shrcrc16 ^ mrflt);
            // equal: ((crc ^ (b << 8)) >> 8)
            // Shift out the MSB used for division per lookup table 
            // and XOR with the remainder :
            shlcrc16 = (0xffff & vcrc16) << 8;
            //c16tb = self.das.crc16tab[pos] DataProc
            c16tb = 0xffff & crc16tab[pos];
            vcrc16 = 0xffff & (shlcrc16 ^ c16tb);
        }
    }
    return vcrc16;
}

function MyReflect8(val){
    //gets reflected bits:
    // 00000011 -> 11000000
    let retVal = 0; // 8-bit
    for (let i = 0; i < 8; i++)
    {
        if (((0xff & val) & (1 << i)) != 0)
        {
            retVal = 0xff & (retVal | (1 << (7 - i)));
        }
    }

    return retVal;
}

function packSubProtocol(data) //apply substitution protocol
{
    let tx_data = [];

    for(let i = 0; i < data.length; i++)    //apply substitution protocol
    {
        if ((data[i] === 0x01) || (data[i] === 0x02) || (data[i] === 0x06))
        {
            tx_data.push(0x06);
            tx_data.push(0x20 + parseInt(data[i]));
        }
        else
        {
            tx_data.push(data[i]);
        }
    }
    
    return (tx_data);
}

function packAndSend(data) //send data over uart
{ 
    //calculate crc
    let crc16 = ComputeCrc16(data); 


    let valL = (0xff & crc16);  //first crc byte
    let valH = 0xff & ((0xff00 & crc16) >> 8); //second crc byte
    //pack data
    let tx_data = [];
    let tmp = [];
    
    tmp=packSubProtocol(data);  //apply eskan protocol 
     
    //compile response message with start character, data, and stop character. No CRC for Display
    tx_data=tx_data.concat(1, tmp, valL, valH, 2);

    //send data
    //const uart = require('./uart'); //make uart visible inside timeout thread
    uart_bus.handleTxData(tx_data);                     
}

function packAndQueue(data, endPoint, uartPort) //send data over uart
{ 
    let cmdData = data;
	const uart_fp = require('./uart_fp'); //make uart visible inside timeout thread
    const uart_bus = require('./uart_bus'); //make uart visible inside timeout thread
    //calculate crc
    let crc16 = ComputeCrc16(data); 
    
    let valL = (0xff & crc16);  //first crc byte
    let valH = 0xff & ((0xff00 & crc16) >> 8); //second crc byte
	
    let data_crc = data.slice();	//use slice so a new array reference is created (does not write over original data)
	data_crc.push(valL, valH);

    //pack data
    let tx_data = [];    
    let tmp = [];
   
    tmp=packSubProtocol(data_crc);  //apply eskan protocol 

    tx_data = [1].concat(tmp, 2);
    
    if(uartPort === "UARTB")    // SBUS and test / debug
    {
        uart_fp.handleTxData(tx_data); //send response straight out
    }
    else    //main bus UARTC
    {
        uart_bus.addToTxQueue(tx_data, endPoint, cmdData); //add to queue to manage UART traffic
    }
}

module.exports = { packAndSend, unpackSubProtocol, packSubProtocol, packAndQueue, validate, unpackAndValidate };

