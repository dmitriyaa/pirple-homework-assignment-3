/**
 * The primary file for the API
 *
 */

// Dependencies
const server = require('./lib/server');

// Declare the app
const app = {};

// Init function
app.init = () => {
    // Starting the server
    server.init();
}

// Run the app
app.init();
