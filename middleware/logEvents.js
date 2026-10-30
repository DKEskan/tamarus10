const { format } = require('date-fns');
const { v4: uuid } = require('uuid');

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path'); 

const logEvents = async (message, logName) => {
    const dateTime = `${format(new Date(), 'yyyyMMdd\tHH:mm:ss')}`;
    const logItem = `${dateTime}\t${uuid()}\t${message}\n`;

    try{
        if(!fs.existsSync(path.join(__dirname, '..', 'logs'))) {
            await fsPromises.mkdir(path.join(__dirname, '..', 'logs'));
        }
        if(!fs.existsSync(path.join(__dirname, '..', 'logs', logName))) {
            await fsPromises.appendFile(path.join(__dirname, '..', 'logs', logName), "yyyyMMdd / HH:mm:ss / uuid / method / origin / recipient / url\n");
        }
        await fsPromises.appendFile(path.join(__dirname, '..', 'logs', logName), logItem); 
    }catch(err){
        console.log(err);
    }
}

const logger = (req, res, next) => {
    if(typeof req.headers.origin == "undefined")
    {
        req.headers.origin = "local";
    }
    logEvents(`${req.method}\t${req.headers.origin}\t${req.ip}\t${req.url}`, 'reqLog.txt');
    console.log(`${req.method} ${req.path} ${req.headers.origin} ${req.ip}`);
    next();
}

module.exports = { logger, logEvents };