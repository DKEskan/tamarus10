//server for handling local display page via HTTP and using localhost. Not accessible externally.

//requires websocket to hold connection open rather than close after every webpage request.
//this alllows button pressed to trigger changes on webpage without webpage having to request at very quick intervals.
const WebSocket = require('ws');
const displayAPIv1 = require('../routes/displayAPIv1.js');

const LOCAL_IP_ADDR = '127.0.0.1';    //local host
const LOCAL_PORT = 8080;    //local display web port

const OK = 0;
const ERROR = null;

const wss = new WebSocket.Server({ port: LOCAL_PORT });

function isOpen(ws) { return ws.readyState === ws.OPEN }

var receivedLocalIpAddress;

function heartbeat() {
    this.isAlive = true;
  }

runDisplaySocket = function() {
    wss.isAlive = true;
    const interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
            ws.isAlive = false;
            ws.ping();
        });
    }, 300);

    wss.on('close', function close() {
        clearInterval(interval);
    });

    wss.on('error', console.error);

    wss.on('pong', heartbeat);

    wss.on ('connection', function connection(ws, req) {
        receivedLocalIpAddress = req.socket.remoteAddress;
        ws.on('message', function incoming(message) {   
            let response=displayAPIv1.route(JSON.parse(message));   
            if(!isOpen(ws)) return;
            ws.send(JSON.stringify(response));
        })

    })
}

const sendButtonUpdate = (buttonInput) => {
    /*button options:
    8 = up
    2 = down 
    4 = left
    6 = right
    5 = centre
    D = Destroy
    U = Update, UI to do a getConfig
    P = Dead pixel check
    */

    if(buttonInput === null)
    {
        return ERROR; //not a button digit
    }

    wss.clients.forEach(function each(ws) {
        if(!isOpen(ws)) return;
        //console.log(buttonInput)
        ws.send(`${buttonInput}`);
        ws.isAlive = false;
    });
    return OK;
}

module.exports = { runDisplaySocket, sendButtonUpdate};