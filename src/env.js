'use strict';

var env = 'production';

if (typeof process !== 'undefined' && process != null && process.env != null && process.env.NODE_ENV != null) {
    env = process.env.NODE_ENV;
} else if (typeof window !== 'undefined' && window != null && window.env != null) {
    env = window.env;
}

module.exports = env;