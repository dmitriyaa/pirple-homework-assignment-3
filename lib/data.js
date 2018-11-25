/**
 * Library for storing and editing data
 *
 */

 // Dependencies
 const fs = require('fs');
 const path = require('path');
 const helpers = require('./helpers');

 // Container for the library
 const lib = {};

// Bse directory of the data folder
const baseDir = path.join(__dirname, '../.data');

// Write data to a file
lib.create = (dir, filename, data, callback) => {
    // Open file fro writing
    fs.open(path.join(baseDir, dir, filename + '.json'), 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, err => {
                if (!err) {
                    fs.close(fileDescriptor, err => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file');
                        }
                    });
                } else {
                    callback('Error writing to new file');
                }
            });
        }
    });
};

// Read data from a file
lib.read = (dir, filename, callback) => {
    fs.readFile(path.join(baseDir, dir, filename + '.json'), 'utf8', (err, data) => {
        if (!err && data) {
            const parseData = helpers.parseJSONtoObject(data);
            callback(false, parseData);
        } else {
            callback(err, data);
        }
    });
}

// Update data of a file
lib.update = (dir, filename, data, callback) => {
    fs.open(path.join(baseDir, dir, filename + '.json'), 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data);

            // Truncate the file
            fs.ftruncate(fileDescriptor, err => {
                if (!err) {
                    // Write new data to the file
                    fs.writeFile(fileDescriptor, stringData, err => {
                        if (!err) {
                            fs.close(fileDescriptor, err => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing the file');
                                }
                            });
                        } else {
                            callback('Error writing to file');
                        }
                    });
                } else {
                    callback('Error truncating the file');
                }
            });
        }
    });
};

// Delete file
lib.delete = (dir, filename, callback) => {
    // Unlink the file
    fs.unlink(path.join(baseDir, dir, filename + '.json'), err => {
        if (!err) {
            callback(false);
        } else {
            callback('Error deleting the file');
        }
    })
}

// Exporting library
module.exports = lib;
