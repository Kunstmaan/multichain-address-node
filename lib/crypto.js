'use strict';

var createHash = require('create-hash');

function hash256 (buffer) {
    return sha256(sha256(buffer))
}

function ripemd160 (buffer) {
    return createHash('rmd160').update(buffer).digest()
}

function sha256 (buffer) {
    return createHash('sha256').update(buffer).digest()
}

module.exports = {
    'hash256': hash256,
    'ripemd160': ripemd160,
    'sha256': sha256
};