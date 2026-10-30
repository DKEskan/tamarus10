var adc_poll = 100; //in millisseconds  
const moduleDataController = require('../controllers/moduleDataController');
const userDataController = require('../controllers/userDataController');
const gpioHandler = require('./gpioHandler');
const ethernet = require('./ethernet');

const execSync = require('child_process').execSync;

const POWER_DOWN_THRESH = 10500; //10.5V

let adc_an3_vin_mV = 0;
let prev_adc_an3_vin_status = 0;

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

function adc_read()
{   
	let data = 0;
	let tmp = 0;
		
    data = executeCommand("cat ../../../dev/colibri-ain3");
 	tmp = (3300/4095)*parseInt(data);
    adc_an3_vin_mV = parseInt(tmp*(222 / 22));  //(Vout*(R1+R2))/R2 = Vin. R1 = 20k, R2 = 2k2, Vout = Tmp. Units = mV
        
    if(adc_an3_vin_mV < POWER_DOWN_THRESH) 
    {
        try{   //shutdown toradex module when running on backup supply. Use reboot command in case short on off used
            while(userDataController.getSavingStatus() && ethernet.getSavingStatus()){}
            gpioHandler.writePin(gpioHandler.gpioPin.shutdownFlag, 0);
            executeCommand(`reboot`, "Reboot");   
        }catch(err){
          //  console.error("error during poweroff due to powersupply drop");
            console.error(err);
        }
    }

    let CuCarrierObj = {"status":{}};

    CuCarrierObj.status.V_IN = adc_an3_vin_mV;
    moduleDataController.updateCarrierConfig(CuCarrierObj);

    if((adc_an3_vin_mV >= 10500) && (adc_an3_vin_mV <= 30000))
    {
        if(prev_adc_an3_vin_status !== 1)   //this is polled quickly, do not call more functions than required
        {
            moduleDataController.updateCarrierStatus("status", moduleDataController.statusCode.PG_VIN, 1);
            prev_adc_an3_vin_status = 1;
        }
    }
    else
    {
        moduleDataController.updateCarrierStatus("status", moduleDataController.statusCode.PG_VIN, 0);
        prev_adc_an3_vin_status = 0;
    }
}  

adcInit = function(){
	adc_read();
    setInterval(function(){                                       
        adc_read();
    }, adc_poll);//call periodically                                 
}

module.exports = { adcInit };