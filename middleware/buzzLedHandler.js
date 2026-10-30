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

const OK = 0;
const ERROR = null;

function buzzLedStateOn(state)
{
    const CuInterface = require('./unitModules/CuInterface');
    const userDataController = require('../controllers/userDataController');

    let alertStateSetError = 0;
    let modules = 1;
    let buzzObj = {"IsBuzzLedOn":"off"};
    //turn on if not in covert mode and not already on
    if((userDataController.getCovertMode() === false) && (userDataController.getBuzzLedMode() !== state))
    {
        if((userDataController.getBuzzLedMode() === "off") || (userDataController.getBuzzLedMode() === "pulse")) 
        {
            if(state === "on")
            {
                message = {"IsAlertState":"on"};
                buzzObj.IsBuzzLedOn = "on";
            }
            else
            {
                message = {"IsAlertState":"pulse"};
                buzzObj.IsBuzzLedOn = "pulse";
            }

            let msgTx = CuInterface.SetAlertState(modules, message, null); //start index from 0

            let Status = msgTx[0];
            let errorCode = msgTx[1];
            let errorResponse = msgTx[2];
            if(Status === ERROR)
            {
                alertStateSetError = 1;
                console.log(`Turn on Cu Interface module ${modules} alarm failed, status ${Status}, error code ${errorCode}, error response ${errorResponse}`)	
            }
            else
            {
                userDataController.updateUserConfig(buzzObj); //update local file with status
            }
        }       
    }

    if(alertStateSetError === 0)
    {
        return OK;
    }
    return ERROR;
}

function buzzLedStateOff()
{
    const CuInterface = require('./unitModules/CuInterface');
    const userDataController = require('../controllers/userDataController');
    
    let alertStateSetError = 0;
    let modules = 1;
    
    //turn off if already on
    if((userDataController.getBuzzLedMode() === "on") || (userDataController.getBuzzLedMode() === "pulse"))
    {
        message = {"IsAlertState":"off"};
        let msgTx = CuInterface.SetAlertState(modules, message, null); //start index from 0

        let Status = msgTx[0];
        let errorCode = msgTx[1];
        let errorResponse = msgTx[2];
        if(Status === ERROR)
        {
            alertStateSetError = 1;
            console.log(`Turn off Cu Interface module ${modules} alarm failed, status ${Status}, error code ${errorCode}, error response ${errorResponse}`)	
        }
        else
        {
            let buzzObj = {"IsBuzzLedOn":"off"};
            userDataController.updateUserConfig(buzzObj); //update local file with status
        }
    }
    if(alertStateSetError === 0)
    {
        return OK;
    }
    return ERROR;
}

module.exports = { buzzLedStateOff, buzzLedStateOn };