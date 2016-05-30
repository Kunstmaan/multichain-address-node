'use strict';

var env = require('./env');

var logger = {};

if (env === 'debug') {
    logger.log = function() {
        var args = Array.prototype.slice.call(arguments);
        console.log.apply(console, args);
    };
} else {
    logger.log = function() { /* Do nothing */  };
}

module.exports = logger;