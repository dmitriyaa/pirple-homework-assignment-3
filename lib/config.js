/**
 * Create and export configuration varialbes
 *
 */

// Container for all the environments
const environments = {};

// Staging (default) environment
environments.staging = {
    'envName' : 'staging',
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'hashingSecret': 'someSecretKey',
    'stripeToken': '',
    'mailgunToken': '',
    'mailgunEmailDomain': ''
};

// Production environment
environments.production = {
    'envName' : 'production',
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'hashingSecret': 'someSecretKey',
    'stripeToken': '',
    'mailgunToken': '',
    'mailgunEmailDomain': ''
};

// Determine which environment was passed as a command line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string'
    ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above,
// if not, default to staging
const environmentToExport = typeof(environments[currentEnvironment]) == 'object'
    ? environments[currentEnvironment] : environments.staging;

// Exporting configs
module.exports = environmentToExport;
