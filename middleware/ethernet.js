const fs = require('fs');
const path = require('path'); 
const { spawn } = require("child_process");

const userDataController = require('../controllers/userDataController');
const moduleDataController = require('../controllers/moduleDataController');
	
const settings = {
    ipDefault: require('../model/defaultIpSettings.json'),
    setUserConfig: function (data) { this.default = data },
};

const OK = 0;
const ERROR = null;

let ipAddress = "";
let ipSubmask = "";
let ipGateway = "";
let ipDns = "";
let ipDhcp = "";

let savingDefaultIpFlag = 0;
let savingIpFlag = 0;
function getSavingStatus()
{

    return savingDefaultIpFlag || savingIpFlag;
}

const executeCommand = (textToExecute) => new Promise(resolve => {
   // console.log(`sending ${textToExecute}`);
    const command = spawn(textToExecute, { shell: true })
    command.on('close', (data) => {
        resolve();
     //   console.log(`child process exited with code ${data}`);
    });

    command.stderr.on("data", (data) => {
        resolve();
    //    console.log(`stderr execute command: ${data}`);
        return data;
    });

    command.on('error', (error) => {
        resolve();
     //   console.log(`error execute command: ${error.message}`);
    });     
})

function loadIpConfig()
{
    try{    //check HDMI is enabled.
        if(fs.existsSync(path.join(__dirname, '..', '..', 'etc', 'systemd', 'network', 'wired.network'))) 
        {  //check the file is where it should be
            const data = fs.readFileSync('../../etc/systemd/network/wired.network', 'utf8');
            ipAddress=data.slice(data.indexOf("Address=")+8, data.indexOf("/", data.indexOf("Address=")+8));
            ipSubmask=(parseInt(data.slice(data.indexOf("/", data.indexOf("Address=")+8)+1, data.indexOf("\n", data.indexOf("Address=")+8)))).toString(10);
            ipGateway=data.slice(data.indexOf("Gateway=")+8, data.indexOf("\n", data.indexOf("Gateway=")+8));
            ipDns=data.slice(data.indexOf("DNS=")+4);
            ipDhcp = "0";
            if((data[data.indexOf("DHCP=")-1]) !== '#')
            {
                ipDhcp = "1";
            }
            
            let ipObj = {
                "IPAddress": ipAddress,
                "Subnet": ipSubmask,
                "Gateway": ipGateway
            };

            userDataController.updateUserConfig(ipObj); //update local file with status
            
            let CuCarrierObj = {"config":{}};
            CuCarrierObj.config = ipObj;
            moduleDataController.updateCarrierConfig(CuCarrierObj); 
            
            return 0;
        }
        else{
            console.log("no network file");
            return 1;
        }
    }catch(err){
        console.log(err);
    	return 1;
    }
}

//TO DO - SEND TO HELPER FILE
function commentOrUncommentLineHelper(newSettings, parameter, toComment)
{
    if(toComment !== 0)
    {
        return newSettings.slice(0, newSettings.indexOf(parameter.toString())) + "#" +
            newSettings.slice(newSettings.indexOf(parameter.toString()));
    }
    return newSettings.slice(0, newSettings.indexOf(parameter.toString())-1) +
            newSettings.slice(newSettings.indexOf(parameter.toString()));
}

function ValidateIPaddress(ipaddress) 
{  
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
      return true;
    }  
    return false;
}  

function validateIpInput(newIpAddress, newIpSubmask, newIpGateway, newIpDns, newIpDhcp)
{
    let regExp = /[a-zA-Z]/g;     //characters to test values against
    let err = 0;

    
    if(ValidateIPaddress(newIpAddress) !== true)    //check valid IP
    {
        err += 1;
    }
    if((parseInt(newIpSubmask) > 32) || (newIpSubmask === "") || (regExp.test(newIpSubmask)))    //check 0-32 and no characters
    {
        err += 2;
    }
    if(ValidateIPaddress(newIpGateway) !== true)
    {
        err += 4;
    }
    if(ValidateIPaddress(newIpDns) !== true)
    {
        err += 8;
    }
    if((parseInt(newIpDhcp) !== 1) && (parseInt(newIpDhcp) !== 0) || regExp.test(newIpDhcp)) //check 0 or 1 and no characters
    {
        err += 16;
    }
    console.log(err);
    return err;
}

function restartEthService()
{
    executeCommand("systemctl restart systemd-networkd.service");   //restart the service to implement changes
}

function resetToDefaultIpConfig()
{  
    return setIpConfig(settings.ipDefault.IPAddress, settings.ipDefault.Subnet, settings.ipDefault.Gateway);
}

function setIpConfig(newIpAddress, newIpSubmask, newIpGateway)  //set values of configuration
{
    //TO DO - make file searchs asynchronous / blocking. See format of logEvents file
    
    try{   
        
        //if no new changes, return current configuration
        if(	(newIpAddress === ipAddress) && 
        	(newIpSubmask === ipSubmask) &&
            (newIpGateway === ipGateway) )
        {
            console.log("No New Changes");
            return 0;
        }

        if(fs.existsSync(path.join(__dirname, '..', '..', 'etc', 'systemd', 'network', 'wired.network')))   //check the file is where it should be
        {
            const data = fs.readFileSync('../../etc/systemd/network/wired.network', 'utf8');
            var newSettings = data; //split into array of characters to allow use of splice

            //ensure DHCP is commented out
            if(newSettings.indexOf("#DHCP=") === -1)    //if not found comment, add one
            {
                newSettings = commentOrUncommentLineHelper(newSettings, "DHCP=", 1);
            }

            //ensure IP settings uncommented 
            if(newSettings.indexOf("#Address=") !== -1)    //if found comment, remove
            {
                newSettings = commentOrUncommentLineHelper(newSettings, "Address=", 0);
            }
            if(newSettings.indexOf("#Gateway=") !== -1) 
            {
                newSettings = commentOrUncommentLineHelper(newSettings, "Gateway=", 0);
            }
            if(newSettings.indexOf("#DNS=") !== -1)   
            {
                newSettings = commentOrUncommentLineHelper(newSettings, "DNS=", 0);
            }
              
            //configure new settings if DHCP disabled
            newSettings = newSettings.slice(0, newSettings.indexOf("Address=")+8) + newIpAddress +  //cut out current IP address and subnet mask, and insert new ip address and new subnet mask
                                "/" + newIpSubmask + newSettings.slice(newSettings.indexOf("\n", newSettings.indexOf("Address=")+8));
            
            newSettings = newSettings.slice(0, newSettings.indexOf("Gateway=")+8) + newIpGateway +  //cut out current gateway address and insert new gateway address
                                newSettings.slice(newSettings.indexOf("\n", newSettings.indexOf("Gateway=")+8));
            
            savingIpFlag = 1;
            fs.writeFileSync('../../etc/systemd/network/wired.network', newSettings); //overwrite file data with new settings
            savingIpFlag = 0;

            let success = loadIpConfig();   //read the settings as a local value to provide externally 
            return success;
        }
        else{
            console.log("no network file");
        	return 1;   
        }
    }catch(err){
        console.log(err);
    	return 1;   
    }
}

function saveDefaultIpSettings()
{
    try{   
        if(fs.existsSync(path.join(__dirname, '..', 'model', 'defaultIpSettings.json')))   //check the file is where it should be
        {
        	let defaultIpSettings= settings.ipDefault;
        	console.log(defaultIpSettings);
        	console.log("exists");
        	try {
        		//WARNING - in dev mode using Nodemon, writing to the file will restart software as there is a change in the file.
                savingDefaultIpFlag = 1;
                fs.writeFileSync(path.join(__dirname, '..', 'model', 'defaultIpSettings.json'), JSON.stringify(defaultIpSettings, null, 2), 'utf8'); //overwrite file data with new settings
                savingDefaultIpFlag = 0;
                console.log('default Ip Settings successfully saved to disk');
			}catch(error) {
			  	console.log('An error has occurred ', error);
			}
        	
            return OK;
        }
        else{
            console.log("no default IP file");
            return ERROR;   
        }
    }catch(err){
        console.log(err);
        return ERROR;   
    }
}

function setDefaultIpConfig(updateData)
{  
    try
    {
        for(let index in updateData)
        {
            settings.ipDefault[index]= updateData[index];	//replace values
        }

        if(saveDefaultIpSettings() === OK)
        {
            return OK;
        }
        else 
        {
            return ERROR;
        }
    } catch{
        return ERROR;
    }
}

function getDefaultIpSettings()
{
    const jsonMap = settings.ipDefault;
    
    if (!jsonMap) {
        console.log(`Config not found`);
        return "cannot find Default IP";
    }
	return settings.ipDefault;
}

module.exports = { loadIpConfig, setIpConfig, validateIpInput, restartEthService, resetToDefaultIpConfig, setDefaultIpConfig, getDefaultIpSettings, getSavingStatus };