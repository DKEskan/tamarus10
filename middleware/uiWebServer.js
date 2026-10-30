//server for handling user web page via HTTP (HTTPS TBA)

const express = require('express');
const web_app = express();
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
//const cors = require('cors');
//const corsOptions = require('../config/corsOptions');
//const { logger } = require('./logEvents');
//const errorHandler = require('./errorHandler');

const IP_ADDR = '0.0.0.0';    //external access host
const WEB_PORT_HTTPS = process.env.PORT || 443; 
const WEB_PORT_HTTP = 80; 

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

function apiSetResponse(endPoint, data, setMsg)
{
	const pa = require('./unitModules/pa');
	const dds = require('./unitModules/dds');
	const fan = require('./unitModules/fan');
	const distribution = require('./unitModules/distribution');
	const CuPower = require('./unitModules/CuPower');
	const CuInterface = require('./unitModules/CuInterface');
	const protection = require('./unitModules/protection');
	const power = require('./unitModules/power');
	let unitId = data[0];
	let response = null;
	let code;
	let codeMessage;

	if(pa.isModule(unitId))
	{
		response = pa.EskanToJson(data, setMsg);
	}
	else if(dds.isModule(unitId))
	{
		response = dds.EskanToJson(data, setMsg);    //commands do not require Json Module object for response
	}
	else if(fan.isModule(unitId))
	{
		response = fan.EskanToJson(data, setMsg);    //commands do not require Json Module object for response
	}
	else if(distribution.isModule(unitId))
	{
		response = distribution.EskanToJson(data, setMsg);    //commands do not require Json Module object for response
	}
	else if(CuPower.isModule(unitId))
	{
		response = CuPower.EskanToJson(data, setMsg);    //commands do not require Json Module object for response
	}
	else if(CuInterface.isModule(unitId))
	{
		response = CuInterface.EskanToJson(data, setMsg);    //commands do not require Json Module object for response
	}
	else if(protection.isModule(unitId))
	{
		response = protection.EskanToJson(data, setMsg);    //commands do not require Json Module object for response
	}
	else if(power.isModule(unitId))
	{
		response = power.EskanToJson(data, setMsg);    //commands do not require Json Module object for response
	}

	if(response === ERROR) //send error response to web server endpoint
	{
		endPoint.status(HttpCode.InternalServerError).send("500 : Internal Server Error");
	}
	else if((response === "InProgress") || (endPoint === null))
	{
		//no action yet, still awaiting responses for command or no response needed
	}
	else	//send response to web server endpoint
	{
		code = response[0];
		codeMessage = response[1];
		if(codeMessage !== "")
		{
			endPoint.status(code).json(codeMessage);
		}
		else
		{
			endPoint.status(code).json();
		}
	}
}

function apiTimeoutResponse(endPoint)
{
	try{
		endPoint.status(HttpCode.InternalServerError).send("500 : Internal Server Error");
	}catch(error){
        console.error("API Timeout Error");
    }
}

runWebServer = function() {
    //custom middleware logger
    //web_app.use(logger);

    // cross origin resource sharing
    // app.use(cors(corsOptions));  //allow whitelist/blacklist
   // web_app.use(cors());

    // built-in middleware to handle urlencoded form data
    web_app.use(express.urlencoded({ extended: false }));

    // built-in middleware for json
    web_app.use(express.json());
	
	//routes
    web_app.use('/api/v1/', require('../routes/eskanAPIv1'));

    //anything that is not handled comes here and gets a 404 error
    web_app.all('*', (req,res) => {
		res.status(HttpCode.NotFound).send("404 : Not Found - " + req.url);
    })

   //web_app.use(errorHandler);

    //certificate self certified for 25 years
    const options = {
        key: fs.readFileSync(path.join(__dirname,'./../security/keys/eskan-key.pem')),
        cert: fs.readFileSync(path.join(__dirname,'./../security/keys/eskan-cert.pem')),
    };

    //always start server listen at end of file
    http.createServer(web_app).listen(WEB_PORT_HTTP, IP_ADDR);// => console.log(`Web server running on port ${WEB_PORT_HTTP}, IP ${IP_ADDR}`));
    try
    {
    	https.createServer(options, web_app).listen(443);// => console.log(`Web server running on ${WEB_PORT_HTTPS}, IP ${IP_ADDR}`));
    }catch(error){
    	console.log("https web server create error, check keys created properly");
    	console.log(error);
    }
}

module.exports = { runWebServer, apiSetResponse, apiTimeoutResponse };
