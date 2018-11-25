/*jshint esversion: 6*/
/**
 * Helpers for various tasks
 *
 */

// Dependencies
const config = require('./config');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// Container for all the helpers
const helpers = {};

// Converting JSON into an object without throwing error
helpers.parseJSONtoObject = str => {
    try {
        return JSON.parse(str);
    } catch(e) {
        return {};
    }
};

// Create a SHA256 hash
helpers.hash = str => {
    if (typeof str == 'string' && str.length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Generating a random string
helpers.createRandomString = strLength => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let str = '';
    for (let i = 0; i < strLength; i++) {
        const charIndex = Math.floor(Math.random() * chars.length);
        str += chars[charIndex];
    }
    return str;
};

// Create a stripe charge to user
// @TODO: add input validation
// @TODO: beautify, and put auth key in config
helpers.payWithStripe = (amount, currency, source, description, callback) => {
    amount = typeof amount == 'number' && amount > 0 ? amount : false;
    currency = typeof currency == 'string' && currency.length > 0 ? currency : false;
    source = typeof source == 'string' && source.length > 0 ? source : false;
    description = typeof description == 'string' && description.length > 0 ? description : false;

    if (amount, currency, source, description) {
        const payload = {
            amount,
            currency,
            source,
            description
        };

        // Stringify the payload
        const stringPayload = querystring.stringify(payload);

        // Configure the request details
        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.stripe.com',
            'method': 'POST',
            'path': '/v1/charges',
            'auth': config.stripeToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate the request object
        const req = https.request(requestDetails, res => {
            // Grab the status of the sent request
            const status = res.statusCode;

            // Callback successfully if the request went throught
            if (status === 200 || status == 201) {
                callback(false);
            } else {
                callback(status);
            }
        });

        // Bind to the error event so it doesn't get thrown
        req.on('error', err => {
            callback(err);
        });

        // Add the payload
        req.write(stringPayload);

        // End the request
        req.end();
    } else {
        callback('Missing or invalid parameters.');
    }
};

// Send email via Mailgun
helpers.sendMailgunEmail = (toEmail, subject, text, callback) => {
    // Validating parameters
    toEmail = typeof toEmail == 'string' && toEmail.length > 0 ? toEmail : false;
    subject = typeof subject == 'string' && subject.length > 0 ? subject : false;
    text = typeof text == 'string' && text.length > 0 ? text : false;
    if (toEmail && subject && text) {
        // Configure the request
        const payload = {
            'from': `Mailgun Sandbox <postmaster@${config.mailgunEmailDomain}>`,
            'to': toEmail,
            'subject': subject,
            'text': text
        };
        const stringPayload = querystring.stringify(payload);

        // Configure the request details
        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.mailgun.net',
            'method': 'POST',
            'path': `/v3/${config.mailgunEmailDomain}/messages`,
            'auth': `api:${config.mailgunToken}`,
            'headers': {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate the request object
        const req = https.request(requestDetails, res => {
            // Grab the status of the response
            const status = res.statusCode;

            // Callback if request went through
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback(status);
            }
        });

        // Bind the error event so it doesn't get thrown
        req.on('error', err => {
            callback(err);
        });

        // Add the payload
        req.write(stringPayload);

        // End the request
        req.end();

    } else {
        callback('Missing or invalid parametes.');
    }
};

// Exporting helpers
module.exports = helpers;
