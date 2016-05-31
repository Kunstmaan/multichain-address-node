'use strict';

var path = require('path'),
    addressFactory = require(path.resolve(__dirname, '../lib/address'));

var multichain = require("multichain-node")({
    port: 8000,
    host: 'api.newyork.coinsensus.boleuro.be',
    user: "multichainrpc",
    pass: "thrZQvmfGFnJV8KdiQY9bL6NT94ptCpJzYegZTSn8pR"
});

multichain.getBlockchainParams(function(err, params) {
    if (err) {
        throw err;
    }

    var addressPubKeyHashVersion = params['address-pubkeyhash-version'];
    var addressChecksumValue = params['address-checksum-value'];
    var addressPrivateKeyVersion = params['private-key-version'];

    console.log('pub key hash version', addressPubKeyHashVersion);
    console.log('priv key version', addressPrivateKeyVersion);
    console.log('checksum', addressChecksumValue);

    /*
    var address = addressFactory.generateNew(addressPubKeyHashVersion, addressChecksumValue);
    console.log('address', address.toString());

    multichain.validateAddress({'address': address.address}, function(err, response) {
        if (err) {
            throw err;
        }

        console.log('validate', response);

        var wif = address.toWIF(addressPrivateKeyVersion, addressChecksumValue);
        console.log('wif', wif);

        multichain.importPrivKey({'privkey': wif}, function(err, response) {
            if (err) {
                throw err;
            }

            console.log('import', response);

            multichain.dumpPrivKey({'address': address.address}, function(err, response) {
                if (err) {
                    throw err;
                }

                console.log('dump', response);
            });
        });
    });
    */

    multichain.dumpPrivKey({'address': '1A3d1nw4eCTgaxGnZ6YFZbt4yC7u8TJPPof3dc'}, function(err, response) {
        console.log('WIF', response);

        var address = addressFactory.fromWIF(response, addressPubKeyHashVersion, addressPrivateKeyVersion, addressChecksumValue);

        console.log(address.toString());
    });
});