'use strict';

var path = require('path'),
    addressFactory = require(path.resolve(__dirname, '../lib/address'));

var pubKeyHashVersion = '00794986',
    checksumValue = 'd4c0cb87',
    privateKeyVersion = '806aeaeb';

console.log('public key hash version', pubKeyHashVersion);
console.log('checksum', checksumValue);
console.log('private key version', privateKeyVersion);

console.log('----');
var address = addressFactory.generateNew(pubKeyHashVersion, checksumValue);
console.log('address', address.toString());

console.log('----');
var wif = address.toWIF(privateKeyVersion, checksumValue);
console.log('WIF', wif);

console.log('----');
console.log('address', addressFactory.fromWIF(wif, pubKeyHashVersion, privateKeyVersion, checksumValue).toString());