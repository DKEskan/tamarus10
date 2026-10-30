

//cross origin resource sharing. Possible to add functionality for whitelisting and blacklisting 
const whitelist = [
    'https://www.google.co.uk', 
    'http://localhost:3500/',
    '192.168.3.169:3500'
];

const corseOptions = {
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin){
            callback(null, true)
        } else{
            callback(new Error('Not allowed by CORS'))
        }
    },
    optionSuccessStatus: 200
}

module.exports = corseOptions;