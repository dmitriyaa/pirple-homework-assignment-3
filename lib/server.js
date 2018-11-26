/**
 * Server related tasks
 *
 */

// Dependencies
const config = require('./config');
const helpers = require('./helpers');
const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const fs = require('fs');
const path = require('path');
const handlers = require('./handlers');

// Instatniating the server module object
const server = {};

// Instatniating HTTP server
server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

// Instatniating the HTTPS server
server.httpServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpServerOptions, (req, res) => {
    server.unifiedServer(req, res);
});

// All the server logic for both HTTP and HTTPS servers
server.unifiedServer = (req, res) => {

    // Get the url and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the path from url
    const path = parsedUrl.pathname;

    // Trimming slashes from the start and the end of the path
    // so the path format is consistent
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    //(because we used 'true' parameter on url.parse)
    const queryStringObject = parsedUrl.query;

    // Get the request method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload, if any
    const decoder = new StringDecoder('utf8');
    let buffer = '';

    // Payload comes in a a strange format, so the decoder decodes it and make
    // it readable.
    // Also payload doesn't come with the req.url. It comes by pieces and we
    // need to listenb to it.
    req.on('data', data => {
        buffer += decoder.write(data);
    });
    req.on('end', () => {
        buffer += decoder.end();

        // At this point we have all the necessary information that came
        // from the request, so we can pach it into an object
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            'payload': helpers.parseJSONtoObject(buffer)
        };

        // Choose the handler this request should go to. If one is not found,
        // use the default (not found) handler
        let chosenHandler = typeof server.router[trimmedPath] !== 'undefined'
            ? server.router[trimmedPath]
            : handlers.notFound;

        // If the reques is withing the public directory, use teh public handler instead
        chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

        // Rout the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload, contentType) => {
            // Determine the typo of response (fallback to JSON)
            contentType = typeof(contentType) == 'string' ? contentType : 'json';

            // Use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Return the response parts that are content specific
            var payloadString = '';
            if(contentType == 'json'){
              res.setHeader('Content-Type', 'application/json');
              payload = typeof(payload) == 'object'? payload : {};
              payloadString = JSON.stringify(payload);
            }

            if(contentType == 'html'){
              res.setHeader('Content-Type', 'text/html');
              payloadString = typeof(payload) == 'string'? payload : '';
            }

            if(contentType == 'favicon'){
              res.setHeader('Content-Type', 'image/x-icon');
              payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if(contentType == 'plain'){
              res.setHeader('Content-Type', 'text/plain');
              payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if(contentType == 'css'){
              res.setHeader('Content-Type', 'text/css');
              payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if(contentType == 'png'){
              res.setHeader('Content-Type', 'image/png');
              payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if(contentType == 'jpg'){
              res.setHeader('Content-Type', 'image/jpeg');
              payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            // Return the response parts that are common to all content types
            res.writeHead(statusCode);
            res.end(payloadString);

            // If the response is 200, print green otherwise pring red
            const outputColor = statusCode == 200 ? '\x1b[32m%s\x1b[0m' : '\x1b[31m%s\x1b[0m';
            if (contentType == 'plain' || contentType == 'json') {
              console.log(outputColor, `${method.toUpperCase()}/${trimmedPath} ${statusCode} ${payloadString}`);
            } else {
              console.log(outputColor, `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
            }
        });

    });
};

// Define a request router
server.router = {
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/deleted': handlers.accountDeleted,
    'session/create': handlers.sessionCreate,
    'session/deleted': handlers.sessionDeleted,
    // Add order + menu + cart to frontend
    'menu': handlers.foodMenu,
    'ping': handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/menu': handlers.menu,
    'api/shopping-cart': handlers.shoppingCart,
    'api/orders': handlers.orders,
    'favicon.ico': handlers.favicon,
    'public': handlers.public
};

// Init function
server.init = () => {
    // Start the HTTP server
    server.httpServer.listen(config.httpPort, () => {
        console.log(
            '\x1b[36m%s\x1b[0m',
            `HTTP server is listening on port ${config.httpPort}`
        );
    });

    // Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, () => {
        console.log(
            '\x1b[35m%s\x1b[0m',
            `HTTPS server is listening on port ${config.httpsPort}`
        );
    });
};

// Exporting the module
module.exports = server;
