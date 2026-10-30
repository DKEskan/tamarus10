const fs = require('fs');
const path = require('path'); 
const uart_bus = require('./uart_bus');
const gpioHandler = require('./gpioHandler');
const execSync = require('child_process').execSync;

const { spawn } = require("child_process");

const memData = require('../model/memData.json');

const OK = 0;
const ERROR = null;

let CuInit = 0;

//TO DO - Send errors to an error log 
const executeCommand = (textToExecute) => new Promise(resolve => {
   // console.log(`sending ${textToExecute}`);
    const command = spawn(textToExecute, { shell: true })
    command.on('close', (data) => {
        resolve();
   //     console.log(`child process exited with code ${data}`);
    });

    command.stderr.on("data", (data) => {
        resolve();
      //  console.log(`stderr execute command: ${data}`);
        
        if((CuInit === 0) && (data.includes("cog") || data.includes("Cog") || data.includes("COG")))	//initialise gpio to show device ready when screen appears.
        {
        	CuInit = 1;
        	gpioHandler.cuReadyInit();
        }
        
        return data;
    });

    command.on('error', (error) => {
        resolve();
       // console.log(`error execute command: ${error.message}`);
    });     
})

function initLcdInterface()
{

/*	
 	To change screen resolution, use:
	executeCommand("COG_PLATFORM_WL_VIEW_WIDTH=640 COG_PLATFORM_WL_VIEW_HEIGHT=480 cog --platform=wl views/index.html");   //start browser in 640x480
	Note that this will no longer be in full screen and the linux parts will be displayed. 
	Using the full screen command with this will simply use the system default full screen.
*/

    try{    //start browser webpage in full screen
        executeCommand("COG_PLATFORM_WL_VIEW_FULLSCREEN=1 cog --platform=wl ../../../tamarus10/views/index.html");  
        //let data = execSync("COG_PLATFORM_WL_VIEW_FULLSCREEN=1 cog --platform=wl ../../../tamarus10/views/index.html");   
    }catch(err){
        console.log("LCD start webpage catch error");
        console.log(err);
    }
}

const nodeData = {
    nodeJsPackage: require('../package.json')
};

function getSoftware()
{
    const jsonData = nodeData.nodeJsPackage;
    
    if (!jsonData) {
        console.log(`NodeJsPackage not found`);
        return "cannot find NodeJsPackage";
    }
    let Software = jsonData.version; //nodejs inbuilt version handler is our FW equivalent
	return Software;
}

function initData()
{
    const userDataController = require('../controllers/userDataController');
    const moduleDataController = require('../controllers/moduleDataController');

    // //Load CU Carrier buildInfo Software
    let systemObj = {};
    systemObj.Software = getSoftware().toString();
    userDataController.updateUserConfig(systemObj); 

    let CuCarrierObj = {"buildInfo":{}, "config":{}};
    CuCarrierObj.buildInfo.Software = systemObj.Software;

    //Load configurables
    CuCarrierObj.config.PaTargetTemp = memData.PaTargetTemp;
    CuCarrierObj.config.PaTempHyst = memData.PaTempHyst;

    moduleDataController.updateCarrierConfig(CuCarrierObj); 
}

function initAuthKeys()
{
 	if( !fs.existsSync(path.join('security', 'keys', 'eskan-cert.pem')) || //check if certificate available. if not, create it
        !(fs.readFileSync(path.join('security', 'keys', 'eskan-cert.pem')).includes("END CERTIFICATE")) || //check if certificate and private key completed correctly, if not, create it
        !(fs.readFileSync(path.join('security', 'keys', 'eskan-key.pem')).includes("END PRIVATE KEY")) ||
        !(fs.readFileSync(path.join('security', 'keys', 'eskan-csr.pem')).includes("END CERTIFICATE REQUEST"))  ) 
 	{
        //certificate self certified for 25 years  
		//run synchronously, each stage required one at a time
		try{   //Generate a private key
			execSync('cd ../../tamarus10/security/keys; openssl genrsa -out ./eskan-key.pem 2048', {stdio : 'pipe' });   
	    }catch(err){
	        console.log("Generate private key commands catch error");
	        console.log(err);
	    }
	
	    try{ //create a certificate signing request 
	       execSync('cd ../../tamarus10/security/keys; openssl req -new -sha256 -subj "/CN=www.eskan.com/C=UK/L=Greenford" -key ./eskan-key.pem -out ./eskan-csr.pem', {stdio : 'pipe' }); 
	    }catch(err){
	        console.log("Create cetificate signing request commands catch error");
	        console.log(err);
	    }
	    
	    try{   //self sign the certificate
	      execSync('cd ../../tamarus10/security/keys; openssl x509 -req -days 9131 -in ./eskan-csr.pem -signkey ./eskan-key.pem -out ./eskan-cert.pem', {stdio : 'pipe' });      
	    }catch(err){
	        console.log("Self sign certificate commands catch error");
	        console.log(err);
	    }
    }
}

runInit = function(){
    initAuthKeys();	//create fresh authentication keys if required.
    initData(); //initialise data
}

module.exports = { runInit, initLcdInterface };
