const userDataController = require('../controllers/userDataController');
const moduleDataController = require('../controllers/moduleDataController');

const OK = 0;
const ERROR = null;

// const paLUT = require('../model/paLUT.json')


const HttpCode = 
{
    OK: 200,
	Accepted: 202,	
	BadRequest: 400,	
	Unauthorized: 401,
	NotFound: 404,	
    RequestTimeout: 408,
    UnprocessibleEntity: 422,
    InternalServerError: 500,	
	GatewayTimeout: 504,	
}

const DEFAULT_PASSWORD = "000000";

const POWER_LEVEL = [0,4,5,6,7,8,9,10];	//convert display power level to PA level range. 0 is not used currently
const MAX_POWER_LEVEL = 10;
const MAX_BANDS = 7;

// /*
// 	module APIs
// 	Require data from modules and comms over UART
// */

/*
	message format:
		{
			"type": "GET",
			"command" : "user/config",
			"body": {},
		};

		{
			"type": "PUT",
			"command": "user/config",
			"body": {    
				"IsPathOn":true   
			},
		};

	return format:
		{
			"type" : "GET",
			"command" : "user/config",
			"code" : 200,
			"body" : {},
		};

		{
			"type" : "PUT",
			"command" : "user/config",
			"code" : 202,
			"body" : {},
		};
*/

function route(msg)
{	
	const transmitHandler = require('../middleware/transmitHandler');
	let type;
	let command;
	let body;
	let data;

	try
	{
		for(let key in msg)	//breakdown data to format into eskan
		{
			tmp = msg[key];
			if(key === "type")
			{
				type = tmp;
			}
			else if(key === "command")
			{
				command = tmp;
			}
			else if(key === "body")
			{
				body = tmp;
			}
		}
	
		let response = {
	        "type": type,
	        "command": command,
	        "code": 0,
			"body":{}
	    };
	
		if(type === "GET")
		{
			if(command === "user/config")
			{
				data = userDataController.getUserConfig();
				if(data !== ERROR)
				{
					response.code = HttpCode.OK; 
					response.body = data; 
				}
				else
				{
					response.code = HttpCode.BadRequest; 
					response.body = "OpFill File Not Found"; 
				}
			}
			else if(command === "user/currentOpFill")
			{
				let freshData = JSON.parse(JSON.stringify(userDataController.getCurrentOpfill()));
					/*
					*	Convert information - reduces immediate work for UI side and PA side, take frequency and
					*	translate to index value, take power LUT and convert it to power level step
					*/
					
				data = convertOutgoingInfo(freshData);	
					
				if(data !== ERROR)
				{
					response.code = HttpCode.OK; 
					response.body = data; 
				}
				else
				{
					response.code = HttpCode.BadRequest; 
					response.body = "OpFill File Not Found"; 
				}
			}
			else if(command === "user/opFill")
			{
				let opFillIndex = ERROR;
	
				for(let key in body)	//breakdown data to format into eskan
				{
					tmp = body[key];
					if(key === "op")
					{
						opFillIndex = tmp;
					}
				}
				
				if((opFillIndex !== ERROR) && (opFillIndex < 8) && (opFillIndex !== 0))
				{
					let freshData = JSON.parse(JSON.stringify(userDataController.getOpfill(opFillIndex)));
					/*
					*	Convert information - reduces immediate work for UI side and PA side, take frequency and
					*	translate to index value, take power LUT and convert it to power level step
					*/
					
					data = convertOutgoingInfo(freshData);	
					
					if(data !== ERROR)
					{
						response.code = HttpCode.OK; 
						response.body = data; 
						// response.body.CurrentOpFill = opFillIndex;
					}
					else
					{
						response.code = HttpCode.BadRequest; 
						response.body = "OpFill File Not Found"; 
					}
				}
				else
				{
					response.code = HttpCode.BadRequest; 
					response.body = "key/index not found"; 
				}
			}
			else if(command === "user/passwordVerify")
			{
				let currentPassword = userDataController.getPassword();
				if(currentPassword !== ERROR)
				{
					response.code = HttpCode.OK; 
					response.body = currentPassword; 
				}
				else
				{
					response.code = HttpCode.BadRequest; 
					response.body = "password File Not Found"; 
				}
			}
			else
			{
				response.code = HttpCode.BadRequest; 
				response.body = "command not found"; 
			}
			return response;
		
		}
		else if(type === "PUT")
		{
			if(command === "user/saveOpFill")
			{
				let op = null;
				for(let key in body)
				{
					tmp = body[key];
						
					if(key === "op")
					{
						op = tmp;
					}
				}
				if(op === null)
				{
					response.code = HttpCode.UnprocessibleEntity;
					response.body = "op not in defined";
					return response;
				}
				else if((op === 0) || (op > 7))
				{
					response.code = HttpCode.UnprocessibleEntity;
					response.body = "op not in range";
					return response;
				}
	
				/*
				*	Reduce immediate work for UI side and PA side.
				*	Split frequency Sub Bands. take index value and translate to frequency,
				*	calculate mode, take power level step and convert with LUT
				*/
				//body = splitBandIndex(body);
				body = convertIncomingInfo(body);

				let result;
				result = checkOpFillInput(body, response);

				if(result.code === HttpCode.OK)
				{
					result = userDataController.saveOpfill(op-1, body)
					if(result === OK)
					{
						response.code = HttpCode.OK;
					}
					else
					{
						response.code = HttpCode.InternalServerError; 
						response.body = result; 
					}
				}
				else	//failed input checks
				{
					response.code = result.code;
					response.body = result.body;
				}
			}
			else if(command === "user/uploadOpFill")
			{
				if((userDataController.getUserIsTransmitting()).IsTransmitting === false) //not transmitting
				{
					let opFillIndex = ERROR;
	
					for(let key in body)	//breakdown data to format into eskan
					{
						tmp = body[key];
						if(key === "op")
						{
							opFillIndex = tmp;
						}
					}
					
					if((opFillIndex !== ERROR) && (opFillIndex != 0) && (opFillIndex < 8))
					{
						data = userDataController.uploadOpfill(parseInt(opFillIndex));
						if(data !== ERROR)
						{
							response.code = HttpCode.Accepted; 
						}
						else
						{
							response.code = HttpCode.BadRequest; 
							response.body = "OpFill File Not Found"; 
						}
					}
					else
					{
						response.code = HttpCode.BadRequest; 
						response.body = "key/index not found"; 
					}
				}
				else
				{
					response.code = HttpCode.UnprocessibleEntity; 
					response.body = "Cannot upload when transmitting"; 
				}
			}
			else if(command === "user/destroyConfirm")
			{
				let success = OK;
				
				if((userDataController.getUserIsTransmitting()).IsTransmitting === true) //transmitting, turn off transmitting
				{
					transmitHandler.TxState(transmitHandler.TxNewStates.UrgentOff); //carry out turning off, if not already turning on/off
				}

				success = userDataController.destroyOpfill();

				if(success !== ERROR)
				{
					success = userDataController.setPassword(DEFAULT_PASSWORD);

					if(success !== ERROR)
					{
						response.code = HttpCode.Accepted; 
					}
					else
					{
						response.code = HttpCode.InternalServerError; 
						response.body = "Password File Not Found"; 
					}
				}
				else
				{
					response.code = HttpCode.InternalServerError; 
					response.body = "Error destroying OpFill"; 
				}
			}
			else if(command === "user/newPassword")
			{
				let password = ERROR;
	
				for(let key in body)	//breakdown data to format into eskan
				{
					tmp = body[key];
					if(key === "password")
					{
						password = tmp;
					}
				}
			
				if(password !== ERROR)
				{
					let result = userDataController.setPassword(password);
					if(result !== ERROR)
					{
						response.code = HttpCode.Accepted; 
					}
					else
					{
						response.code = HttpCode.InternalServerError; 
						response.body = "Password File Not Found"; 
					}
				}
				else
				{
					response.code = HttpCode.BadRequest; 
					response.body = "key not found"; 
				}
			}
			else
			{
				response.code = HttpCode.BadRequest; 
				response.body = "command not found"; 
			}
			return response;
		}
		else
		{
			response.code = HttpCode.NotFound; 
			response.body = "Type not found"; 
			return response;
		}
	}catch(error)
	{
		console.log("error in display API");
		console.log(error);
	}
}

function checkOpFillInput(body, response)
{
	/*
		extract values
	*/
	try
	{
		let tmp;
		let tmp2;
		let op = null;
		let power = Array(MAX_BANDS).fill(null);
		let IsPathOn = Array(MAX_BANDS).fill(null);
		let Mode = Array(MAX_BANDS).fill(null);

		let freqLower = Array(MAX_BANDS).fill().map(() => Array(11).fill(null));
		let freqUpper = Array(MAX_BANDS).fill().map(() => Array(11).fill(null));

		for(let index in body.RadioFrequencyPath)
		{
	
			for(let key in body.RadioFrequencyPath[index])	
			{
				tmp = body.RadioFrequencyPath[index][key];
				 
				if(key === "Power")
				{
					power[index] = tmp;
				}
				else if(key === "IsPathOn")
				{
					IsPathOn[index] = tmp;
				}
				else if(key === "Mode")
				{
					Mode[index] = tmp;
				}
				else if(key === "FrequencyRange")
				{					
					for(let freqIndex in body.RadioFrequencyPath[index].FrequencyRange)
					{
						for(let freqKey in body.RadioFrequencyPath[index].FrequencyRange[freqIndex])
						{
							tmp2 = body.RadioFrequencyPath[index].FrequencyRange[freqIndex][freqKey];
							if(freqKey === "Lower")
							{
								freqLower[index][freqIndex] = tmp2;
							}
							else if(freqKey === "Upper")
							{
								freqUpper[index][freqIndex] = tmp2;
							}
						 }
					}
				}
			}
		}
	
		/*
			validate values
		*/
	
		for(let i = 0; i < power.length; i++)
		{
			if(power[i] > MAX_POWER_LEVEL)
			{
				response.code = HttpCode.UnprocessibleEntity;
				response.body = "Power level value over " + MAX_POWER_LEVEL + "";
				return response;
			}
			else if(power[i] === null)
			{
				response.code = HttpCode.UnprocessibleEntity;
				response.body = "Power band " + (i+1) + " Key Value not provided or key not matched";
				return response;
			}
		}
	
		for(let i = 0; i < IsPathOn.length; i++)
		{
			if(typeof IsPathOn[i] != "boolean")
			{
				response.code = HttpCode.UnprocessibleEntity;
				response.body = "IsPathOn value is not boolean";
				return response;
			}
			else if(IsPathOn[i] === null)
			{
				response.code = HttpCode.UnprocessibleEntity;
				response.body = "IsPathOn band " + (i+1) + " Key Value not provided or key not matched";
				return response;
			}
		}
		
		let freqBandCount = 0;
		for(let i = 0; i < Mode.length; i++)
		{
			if(	(Mode[i] !== "CW") && (Mode[i] !== "Sweep") )
			{
				response.code = HttpCode.UnprocessibleEntity;
				response.body = "Mode is not a valid input";
				return response;
			}
			else if(IsPathOn[i] === null)
			{
				response.code = HttpCode.UnprocessibleEntity;
				response.body = "Mode band " + (i+1) + " Key Value not provided or key not matched";
				return response;
			}
			else if(Mode[i] === "Sweep")
			{
				for(freqBandCount = 0; freqBandCount < 11; freqBandCount++)
				{
					if((freqLower[i][freqBandCount] === null) || (freqUpper[i][freqBandCount] === null))	//one value is null, reached end
					{
						if((freqLower[i][freqBandCount] === null) && (freqUpper[i][freqBandCount] === null))	//reached end of count for both values
						{
							break;
						}
						else
						{
							response.code = HttpCode.UnprocessibleEntity;
							response.body = "Mode Sweep band " + (i+1) + " has a upper or lower value with a null";
							return response;
						}
					}
					else if((freqUpper[i][freqBandCount] < freqLower[i][freqBandCount]) && (freqLower[i][freqBandCount] !== null))
					{
						response.code = HttpCode.UnprocessibleEntity;
						response.body = "Mode Sweep band " + (i+1) + ", Lower freq value is larger than upper freq";
						return response;
					}
					else if((freqBandCount !== 0) && (freqUpper[i][freqBandCount-1] > freqLower[i][freqBandCount]) && (freqLower[i][freqBandCount-1] !== null))
					{
						response.code = HttpCode.UnprocessibleEntity;
						response.body = "Mode Sweep band " + (i+1) + ", overlap in bands";
						return response;
					}
				}

				if(freqBandCount > 6)
				{
					response.code = HttpCode.UnprocessibleEntity;
					response.body = "Sweep Mode band " + (i+1) + " has more than 6 bands";
					return response;
				}
				//WARNING - check against acceptable DDS hardware frequency range not done
			}
		}
	
		response.code = HttpCode.OK;
		return response;
	}catch(error)
	{
		console.log("failed op fill check");
		console.log(error);
		response.code = HttpCode.UnprocessibleEntity;
		response.body = "likely too many bands";
		return response;
	}
}

function convertIncomingInfo(body)
{
	try
	{
		let response = body;

		let tmp;

		for(let index in body.RadioFrequencyPath)
		{
			for(let key in body.RadioFrequencyPath[index])	
			{
				
				tmp = body.RadioFrequencyPath[index][key];

				if(key === "Power")
				{
					response.RadioFrequencyPath[index][key] = POWER_LEVEL[tmp];
				}
				else if(key === "Mode")
				{
					response.RadioFrequencyPath[index][key] = "Sweep";
				}
			}
		}
		return response;
	}catch(error){
		console.log("error converting frequency steps to frequency values or power level steps to power levels");
		console.log(error);
	}
}

function convertOutgoingInfo(body)
{
	try
	{
		let response = body;

		let tmp;

		for(let index in body.OpFill.RadioFrequencyPath)
		{
			for(let key in body.OpFill.RadioFrequencyPath[index])	
			{
				
				tmp = body.OpFill.RadioFrequencyPath[index][key];
				if(key === "Power")
				{
					for(let i = 0; i < POWER_LEVEL.length; i++)
					{
						if(tmp === POWER_LEVEL[0])
						{
							response.OpFill.RadioFrequencyPath[index][key] = i;
							break;
						}
						else if(tmp > POWER_LEVEL[i] && tmp <= POWER_LEVEL[i+1])
						{
							response.OpFill.RadioFrequencyPath[index][key] = i+1;
							break;
						}
						else if(i >= (POWER_LEVEL).length-1)
						{
							console.log("power level outgoing conversion error: " + tmp);
							response.OpFill.RadioFrequencyPath[index][key] = 0;
							break;
						}				
					}					
				}
			}
		}
		return response;
	}catch(error){
		console.log("error converting frequency steps to frequency values or power level steps to power levels");
		console.log(error);
	}
}

module.exports = { route };

