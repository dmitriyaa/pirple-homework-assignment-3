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
const path = require('path');
const fs = require('fs');

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

// Get the string content of a template
helpers.getTemplate = (templateName, data, callback) => {
  templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
  data = typeof(data) == 'object' & data !== null ? data : {};

  if (templateName) {
    const templatesDir = path.join(__dirname, '/../templates/');
    fs.readFile(templatesDir + templateName + '.html', 'utf8', (err, str) => {
      if (!err && str && str.length > 0) {
        // Do interpolation on the string
        const finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback('no template could be fond');
      }
    });
  } else {
      callback('A valid template name was not specified.');
  }
};

// Add the universal header and footer to a string and pass provided data object to the header and footer to interploation
helpers.addUniversalTemplates = (str, data, callback) => {
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' & data !== null ? data : {};

  // Get the header
  helpers.getTemplate('_header', data, (err, headerString) => {
    if (!err && headerString) {
      // Get the footer
      helpers.getTemplate('_footer', data, (err, footerString) => {
        if (!err && footerString) {
          // Add them all together
          const fullString = headerString + str + footerString;
          callback(false, fullString);
        } else {
          callback('Could not fint the footer template');
        }
      });
    } else {
      callback('Could not fing the header template');
    }
  });
}

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' & data !== null ? data : {};

  // Add the template globals to the data object, prepending their key name with global
  for (let keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data['global.' + keyName] = config.templateGlobals[keyName];
    }
  }

  // For each key in teh data object, insert its value into the sting at the corresponding placeholder
  for (let key in data) {
    if (data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
      const find = '{' + key + '}'
      const replace = data[key];
      str = str.replace(find, replace);
    }
  }
  return str;
};

// Get the content of a static (public) asset
helpers.getStaticAsset = (fileName, callback) => {
  fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
  if (fileName) {
    const publicDir = path.join(__dirname, '/../public/');
    fs.readFile(publicDir + fileName, (err, data) => {
        if (!err && data) {
          callback(false, data);
        } else {
          callback('No file could be fing');
        }
    });
  } else {
    callback('A valid file name was not specified');
  }
};


// Exporting helpers
module.exports = helpers;
