/**
 * Request handlers
 *
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const menu = require('./menu');

// Container for all handlers
const handlers = {};

// Users router
handlers.users = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.includes(data.method)) {
        // Routing to the correct handler after method validation
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for the users sub handlers
handlers._users = {};

// Users - post (create a new user)
// Required data: name, email, passwrod, street address
// Optional data: none
handlers._users.post = (data, callback) => {
    // Check that all required fields are filled out
    const name = typeof data.payload.name == 'string'
        && data.payload.name.trim().length > 0
            ? data.payload.name : false;
    const email = typeof data.payload.email == 'string'
        && data.payload.email.trim().length > 0
            ? data.payload.email : false;
    const password = typeof data.payload.password == 'string'
        && data.payload.password.trim().length > 0
            ? data.payload.password : false;
    const streetAddress = typeof data.payload.streetAddress == 'string'
        && data.payload.streetAddress.trim().length > 0
            ? data.payload.streetAddress : false;

    if (name && email && password && streetAddress) {
        // Make sure that the user doesn't already exist
        _data.read('users', email, err => {
            if (err) {
                // Hash the password
                const hashedPassword = helpers.hash(password);

                if (hashedPassword) {
                    const userObject = {
                        name,
                        email,
                        hashedPassword,
                        streetAddress
                    };

                    // Store the user
                    _data.create('users', email, userObject, err => {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, {'Error': 'Could not create a user'});
                        }
                    });
                } else {
                    callback(500, {'Error': 'Could not create a user'});
                }
            } else {
                callback(400, {'Error': 'Could not create account because the user already exists'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Users - get
// Required data: email,
// Optional data: none
handlers._users.get = (data, callback) => {
    const email = typeof data.queryStringObject.email == 'string'
        && data.queryStringObject.email.trim().length > 0
            ? data.queryStringObject.email : false;

    if (email) {
        // Get the token from the headers
        const token = typeof data.headers.token == 'string'
            ? data.headers.token : false;

        // Verify taht the given token is valid for the email
        handlers._tokens.verifyToken(token, email, tokenIsValid => {
            if (tokenIsValid) {
                _data.read('users', email, (err, userData) => {
                    if (!err && userData) {
                        delete userData.hashedPassword;
                        callback(200, userData);
                    } else {
                        callback(400, {'Error': 'Could not find a specified user'});
                    }
                });
            } else {
                callback(403, {'Error': 'Missing required token in header, or token invalid'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Users - put (udpate a user)
// Required data: email
// Optional data: name, password, street
handlers._users.put = (data, callback) => {
    // Required data validation
    const email = typeof data.payload.email == 'string'
        && data.payload.email.trim().length > 0
            ? data.payload.email : false;

    // Optional data validation
    const name = typeof data.payload.name == 'string'
        && data.payload.name.trim().length > 0
            ? data.payload.name : false;
    const password = typeof data.payload.password == 'string'
        && data.payload.password.trim().length > 0
            ? data.payload.password : false;
    const streetAddress = typeof data.payload.streetAddress == 'string'
        && data.payload.streetAddress.trim().length > 0
            ? data.payload.streetAddress : false;

    if (email) {
        if (name || password || streetAddress) {
            const token = typeof data.headers.token == 'string'
                ? data.headers.token : false;

            handlers._tokens.verifyToken(token, email, tokenIsValid => {
                if (tokenIsValid) {
                    _data.read('users', email, (err, userData) => {
                        if (!err && userData) {
                            if (name) {
                                userData.name = name;
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }
                            if (streetAddress) {
                                userData.streetAddress = streetAddress;
                            }

                            // Update the data
                            _data.update('users', email, userData, err => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(500, {'Error': 'Could not update the specified user'});
                                }
                            });
                        } else {
                            callback(400, {'Error': 'The specified user does not exist'});
                        }
                    });
                } else {
                    callback(400, {'Error': 'Missing required token in header, or token is invalid'});
                }
            });
        } else {
            callback(400, {'Error': 'Missing fields to update'});
        }
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

// Users - delete (delete a user)
// Required data: email
// @TODO: delete associated orders
handlers._users.delete = (data, callback) => {
    // Check that email is valid
    const email = typeof data.payload.email == 'string'
        && data.payload.email.trim().length > 0
            ? data.payload.email : false;
    if (email) {
        const token = typeof data.headers.token == 'string'
            ? data.headers.token : false;

        handlers._tokens.verifyToken(token, email, tokenIsValid => {
            if (tokenIsValid) {
                _data.read('users', email, (err, userData) => {
                    if (!err && userData) {
                        _data.delete('users', email, err => {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, {'Error': 'Could not delete specified user'});
                            }
                        });
                    } else {
                        callback(400, {'Error': 'The user does not exist'});
                    }
                });
            } else {
                callback(400, {'Error': 'Missing required token in header, or token is invalid'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
}

// Tokens
handlers.tokens = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.includes(data.method)) {
        // Routing to the correct handler after method validation
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for the tokens sub handlers
handlers._tokens = {};

// Tokens - post (create a new token)
// Required data: email, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
    // Check that all required fields are filled out
    const email = typeof data.payload.email == 'string'
        && data.payload.email.trim().length > 0
            ? data.payload.email : false;
    const password = typeof data.payload.password == 'string'
        && data.payload.password.trim().length > 0
            ? data.payload.password : false;

    if (email && password) {
        // Checking if user exists
        _data.read('users', email, (err, userData) => {
            if (!err && userData) {
                // Checking if the password is correct
                if (userData.hashedPassword == helpers.hash(password)) {
                    // Generating token
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        email,
                        'id': tokenId,
                        expires
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, err => {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, {'Error': 'Could not create a new token'});
                        }
                    });
                } else {
                    callback(403, {'Error': 'Password did not match the specified user'});
                }
            } else {
                callback(400, {'Error': 'Could not find such a user'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field(s)'});
    }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
    const id = typeof data.queryStringObject.id == 'string'
        && data.queryStringObject.id.trim().length == 20
            ? data.queryStringObject.id : false;

    if (id) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(400, {'Error': 'Specified token does not exist'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

// Tokens - put
// Required fields: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
    // Check that all required fields are filled out
    const id = typeof data.payload.id == 'string'
        && data.payload.id.trim().length == 20
            ? data.payload.id : false;
    const extend = typeof data.payload.extend == 'boolean'
        && data.payload.extend == true ? true : false;

    if (id && extend) {
        _data.read('tokens', id, (err, tokenData) => {
            // Make sure that token hasn't expired yet
            if (tokenData.expires > Date.now()) {
                tokenData.expires = Date.now() + 1000 * 60 * 60;
                _data.update('tokens', id, tokenData, err => {
                    if (!err) {
                        callback(200, tokenData);
                    } else {
                        callback(500, {'Error': 'Could not update the token'});
                    }
                });
            } else {
                callback(400, {'Error': 'Token has already expired'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field(s) or invalid input'});
    }
};

// Tokens - delete
// Required fields: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
    const id = typeof data.payload.id == 'string'
        && data.payload.id.trim().length == 20
            ? data.payload.id : false;

    if (id) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                _data.delete('tokens', id, err => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, {'Error': 'Could not delete specified token'});
                    }
                });
            } else {
                callback(400, {'Error': 'Could not find a specified token'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

// Vefiry if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, email, callback) => {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            // Check that token is for the give user and has not expired
            if (tokenData.email == email && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

// Confirm that user is logged in by checking if token exists
handlers._tokens.verifyLogin = (id, callback) => {
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            if (tokenData.expires > Date.now()) {
                callback(true, tokenData);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

// Get the menu
handlers.menu = (data, callback) => {
    // Get the token from the headers
    const token = typeof data.headers.token == 'string'
        ? data.headers.token : false;
    // Verify that user is logged in
    handlers._tokens.verifyLogin(token, isLoggedIn => {
        if (isLoggedIn) {
            if (data.method == 'get') {
                callback(200, menu);
            } else {
                callback(400, {'Error': 'Only GET method is allowed'});
            }
        } else {
            callback(403, {'Error': 'You must be logged in and token should be valid to see the menu'});
        }
    });
};

// Shopping Cart
handlers.shoppingCart = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'delete'];
    if (acceptableMethods.includes(data.method)) {
        handlers._shoppingCart[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for shopping carts sub handlers
handlers._shoppingCart = {};

// Shopping Cart - post
// Create a shopping cart if not exist and append new item
// If item already exists, add amount
// Required data: Menu item, Amount of items
// Optional data: none
handlers._shoppingCart.post = (data, callback) => {
    // Generating menu list with only item names
    const menu_items = menu.map(item => item.name);

    // Validating input
    const menu_item = typeof data.payload.menu_item == 'string'
        && data.payload.menu_item.trim().length > 0
        && menu_items.includes(data.payload.menu_item)
            ? data.payload.menu_item : false;
    const amount = typeof data.payload.amount == 'number'
        && data.payload.amount > 0
            ? data.payload.amount : false;

    // Only logged in users can add items to shopping cart
    const token = typeof data.headers.token == 'string'
        ? data.headers.token : false;
    handlers._tokens.verifyLogin(token, (isLoggedIn, tokenData) => {
        if (isLoggedIn) {
            if (menu_item && amount) {
                _data.read('shopping-cart', tokenData.email, (err, cartData) => {
                    if (!err) {
                        // Check if this kind of an item is already in a cart
                        // then just update the amount
                        if (cartData.some(item => item.menu_item == menu_item)) {
                            cartData.forEach(item => {
                                if (item.menu_item == menu_item) {
                                    item.amount += amount;
                                }
                            });
                        } else {
                            cartData.push({
                                menu_item,
                                amount
                            });
                        }
                        _data.update('shopping-cart', tokenData.email, cartData, err => {
                            if (!err) {
                                callback(200, cartData);
                            } else {
                                callback(500, {'Error': 'Could not update shopping cart'});
                            }
                        });
                    } else {
                        // create new shopping cart and put new data
                        const cart = [
                            {
                                menu_item,
                                amount
                            }
                        ];
                        _data.create('shopping-cart', tokenData.email, cart, err => {
                            if (!err) {
                                callback(200, cartData);
                            } else {
                                callback(500, {'Error': 'Could not create file'});
                            }
                        });
                    }
                });
            } else {
                callback(400, {'Error': 'Missing required field(s) or input is invalid'});
            }
        } else {
            callback(403, {'Error': 'You must be logged in and token should be valid to see the menu'});
        }
    });
};

// Shopping Cart - get
// Required data: none. Needed information is retreived from token
// Optional data: none
handlers._shoppingCart.get = (data, callback) => {
    const token = typeof data.headers.token == 'string'
        ? data.headers.token : false;

    handlers._tokens.verifyLogin(token, (isLoggedIn, tokenData) => {
        if (isLoggedIn && tokenData) {
            _data.read('shopping-cart', tokenData.email, (err, cartData) => {
                if (!err && cartData) {
                    callback(200, cartData);
                } else {
                    callback(400, {'Error': 'Could not find specified cart'});
                }
            });
        } else {
            callback(403, {'Error': 'You must be logged in and token should be valid to see the menu'});
        }
    });
};

// Shopping Cart - delete
// Required data: none. Needed information is retreived from token
// Optional data: menu_item, amount. At least one should be provided
// is menu_item is provided, only this item is deleted. if amount is provided,
// this amount will be removed. If amount is provided, then menu item is required
handlers._shoppingCart.delete = (data, callback) => {
    // Validating input
    const menu_item = typeof data.payload.menu_item == 'string'
        && data.payload.menu_item.trim().length > 0
            ? data.payload.menu_item : false;
    const amount = typeof data.payload.amount == 'number'
        && data.payload.amount > 0
            ? data.payload.amount : false;

    // Validating if user is logged in
    const token = typeof data.headers.token == 'string'
        ? data.headers.token : false;

    handlers._tokens.verifyLogin(token, (isLoggedIn, tokenData) => {
        if (isLoggedIn && tokenData) {

            // Checking if cart exists
            _data.read('shopping-cart', tokenData.email, (err, cartData) => {
                if (!err && cartData) {
                    // If user provides a menu_item
                    if (menu_item) {
                        // Generating the list of menu's menu items only
                        const cartItems = cartData.map(item => item.menu_item);

                        // If menu item exists
                        if (cartItems.includes(menu_item)) {
                            // Getting index of that item
                            const index = cartItems.indexOf(menu_item);

                            // Checking amount.
                            if (amount && amount >= 0 && amount < cartData[index].amount) {
                                cartData[index].amount -= amount;
                            } else {
                                cartData.splice(index, 1);
                            }
                            _data.update('shopping-cart', tokenData.email, cartData, err => {
                                if (!err) {
                                    callback(200, cartData);
                                } else {
                                    callback(500, {'Error': 'Could not delete the item'});
                                }
                            });
                        } else {
                            callback(400, {'Error': 'There is no such a specified item in the cart'});
                        }
                    } else {
                        // Delete the whole cart
                        _data.delete('shopping-cart', tokenData.email, err => {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, {'Error': 'Could not delete the cart'});
                            }
                        });
                    }
                } else {
                    callback(400, {'Error': 'You dont have a shopping cart'});
                }
            });
        } else {
            callback(403, {'Error': 'You must be logged in and token should be valid to see the menu'});
        }
    });
};

// Orders
handlers.orders = (data, callback) => {
    const acceptableMethods = ['get', 'post'];
    if (acceptableMethods.includes(data.method)) {
        handlers._orders[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for order sub handlers
handlers._orders = {};

// Orders - get
// Getting all the information about the order
handlers._orders.get = (data, callback) => {
    // Check if user is logged in
    const token = typeof data.headers.token == 'string'
        ? data.headers.token : false;

    handlers._tokens.verifyLogin(token, (isLoggedIn, tokenData) => {
        if (isLoggedIn) {
            // Get all the order data and put in orderObject
            // email, street, cart, total price
            const orderObject = {};

            _data.read('users', tokenData.email, (err, userData) => {
                if (!err) {
                    orderObject.email = userData.email;
                    orderObject.streetAddress = userData.streetAddress;
                    _data.read('shopping-cart', userData.email, (err, cartData) => {
                        if (!err) {
                            // Generating object of prices
                            const priceList = menu.reduce((priceListObj, current) => {
                                const name = current.name;
                                const price = current.price;
                                priceListObj[name] = price;
                                return priceListObj;
                            }, {});

                            orderObject.products = cartData;
                            const totalPrice = cartData.reduce((total, current) => {
                                const menu_item = current.menu_item;
                                return total += priceList[menu_item] * current.amount;
                            }, 0);
                            orderObject.totalPrice = totalPrice;
                            orderObject.currency = 'czk';
                            callback(200, orderObject);
                        } else {
                            callback(500, 'Could not read shopping cart.');
                        }
                    });
                } else {
                    callback(500, 'Could not read specified user.');
                }
            });
        } else {
            callback(403, {'Error': 'You are not logged in or token has expired.'});
        }
    });
};

// Orders - post
// The same as get but payment is added and email send
// Required data: source for stripe
// Optional data: none
handlers._orders.post = (data, callback) => {
    // Validation input
    const source = typeof data.payload.source == 'string' && data.payload.source.length > 0
        ? data.payload.source : false;

    if (source) {
        // Check if user is logged in
        const token = typeof data.headers.token == 'string'
            ? data.headers.token : false;

        handlers._tokens.verifyLogin(token, (isLoggedIn, tokenData) => {
            if (isLoggedIn) {
                // Get all the order data and put in orderObject
                // email, street, cart, total price
                const orderObject = {};

                _data.read('users', tokenData.email, (err, userData) => {
                    if (!err) {
                        orderObject.email = userData.email;
                        orderObject.streetAddress = userData.streetAddress;
                        _data.read('shopping-cart', userData.email, (err, cartData) => {
                            if (!err) {
                                // Generating object of prices
                                const priceList = menu.reduce((priceListObj, current) => {
                                    const name = current.name;
                                    const price = current.price;
                                    priceListObj[name] = price;
                                    return priceListObj;
                                }, {});

                                orderObject.products = cartData;
                                const totalPrice = cartData.reduce((total, current) => {
                                    const menu_item = current.menu_item;
                                    return total += priceList[menu_item] * current.amount;
                                }, 0);
                                orderObject.totalPrice = totalPrice;
                                orderObject.currency = 'czk';

                                helpers.payWithStripe(orderObject.totalPrice * 100, orderObject.currency, source, JSON.stringify(orderObject), status => {
                                    if (!status) {
                                        helpers.sendMailgunEmail(orderObject.email, 'Willim Pizza Order Confirmation', 'Your payment for order was successfull. Here are the details: \n' + JSON.stringify(orderObject), status => {
                                            if (!status) {
                                                callback(200);
                                            } else {
                                                callback(status, {'Error': 'Were not able to send email.'});
                                            }
                                        })
                                    } else {
                                        callback(status, {'Error': 'Source is invalid or stripe service is down.'});
                                    }
                                });
                            } else {
                                callback(500, 'Could not read shopping cart.');
                            }
                        });
                    } else {
                        callback(500, 'Could not read specified user.');
                    }
                });
            } else {
                callback(403, {'Error': 'You are not logged in or token has expired.'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Simple ping handler, that checks if the server is up
handlers.ping = (data, callback) => {
    callback(200);
};

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404);
};

// Exporting handlers
module.exports = handlers;
