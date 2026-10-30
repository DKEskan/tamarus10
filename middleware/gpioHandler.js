var blink_period = 2000; //in milisseconds  
const { spawn } = require("child_process");

//initialise pins
//use gpiofind SODIMM_100 to find the chip and line numbers

var gpioPin =
{
    shutdownFlag: new NewGpio(1, 21, 1),   //SODIMM_101
    fp_3v3: new NewGpio(1, 4, 0), //SODIMM_102
    led1: new NewGpio(1, 20, 0), //SODIMM_103
    led2: new NewGpio(1, 23, 1), //SODIMM_105
    led3: new NewGpio(1, 24, 1), //SODIMM_107
    flagSpare: new NewGpio(1, 6, 0), //SODIMM_127
    USBH_5V: new NewGpio(2, 31, 0), //SODIMM_129
}

function NewGpio (chip, line, state) {                           
    this.chip = chip;                                                     
    this.line = line;                                      
    this.state = state;                                                   
}

const executeCommand = (textToExecute, tag) => new Promise(resolve => {
    //console.log(`sending ${tag}: ${textToExecute}`);
    const command = spawn(textToExecute, { shell: true })
    command.on('close', (data) => {
        resolve();
        if(data !== 0)
        {
            console.log(`child process exited with code ${data}`);
        }
    });

    command.stdout.on("data", (data) => {
        resolve();
       // console.log(`stdout ${tag}: ${data}`);
    });

    command.stderr.on("data", (data) => {
        resolve();
    // console.log(`stderr : ${data}`);
    });

    command.on('error', (error) => {
        resolve();
        console.log(`error : ${error.message}`);
    });     
})

function initPins(){             
    //callback has error as argument, or null if no error    
    
    //may need to only enable fp 3v3 when browser starts
    executeCommand(`gpioset ${gpioPin.fp_3v3.chip} ${gpioPin.fp_3v3.line}=${gpioPin.fp_3v3.state}`, "fp_3v3"); 
    executeCommand(`gpioset ${gpioPin.led1.chip} ${gpioPin.led1.line}=${gpioPin.led1.state}`, "led1"); 
    executeCommand(`gpioset ${gpioPin.led2.chip} ${gpioPin.led2.line}=${gpioPin.led2.state}`, "led2"); 
    executeCommand(`gpioset ${gpioPin.led3.chip} ${gpioPin.led3.line}=${gpioPin.led3.state}`, "led3");    
    executeCommand(`gpioset ${gpioPin.shutdownFlag.chip} ${gpioPin.shutdownFlag.line}=${gpioPin.shutdownFlag.state}`, "shutdownFlag");   
    executeCommand(`gpioset ${gpioPin.flagSpare.chip} ${gpioPin.flagSpare.line}=${gpioPin.flagSpare.state}`, "flagSpare");        
    executeCommand(`gpioset ${gpioPin.USBH_5V.chip} ${gpioPin.USBH_5V.line}=${gpioPin.USBH_5V.state}`, "USBH_5V");   
}

function writePin(pin, state)
{
    pin.state = state;
    executeCommand(`gpioset ${pin.chip} ${pin.line}=${pin.state}`, `${pin.chip}`);    
}

function cuReadyInit()
{
    executeCommand(`gpioset ${gpioPin.fp_3v3.chip} ${gpioPin.fp_3v3.line}=${gpioPin.fp_3v3.state}`, "fp_3v3");     
}

function getPinState()
{
    return gpioPin;
}

gpioInit = function(){
    initPins();                        
}

module.exports = { gpioInit, writePin, gpioPin, cuReadyInit, getPinState };