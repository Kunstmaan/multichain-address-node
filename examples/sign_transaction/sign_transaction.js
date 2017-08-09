
var path = require('path'),
    addressFactory = require(path.resolve(__dirname, '../../lib/address')),
    Promise = require('bluebird');

var multichain = require('multichain-node')({
    port: 80,
    host: 'master.mcbitcoin.docker', // using https://github.com/codekitchen/dinghy-http-proxy
    user: 'multichainrpc',
    pass: 'this-is-insecure-change-it'
});

var amountToIssue = 100,
    amountToSend = 1,
    assetPrefix = 'coinfoo';

// get the params
var blockchainParamsPromise = new Promise(function(fulfill, reject) {

    multichain.getBlockchainParams(function(err, params) {
        if (err) {
            reject(err);
            return;
        }

        fulfill(params);
    });
});

// find a new asset name
var assetPromise = function findFreeAssetName(index) {

    return new Promise(function(fulfill, reject) {
        multichain.listAssets({
            'asset': assetPrefix + '_' + index
        }, function(err, asset) {
            if (err) {
                if (err.code === -8 || err.code === -708) {
                    fulfill(assetPrefix + '_' + index);
                } else {
                    reject(err);
                }

                return;
            }

            findFreeAssetName(index + 1).then(fulfill, reject);
        });
    });
}(1);

// Transaction
Promise.join(blockchainParamsPromise, assetPromise, function(params, assetName) {
    var addressPubKeyHashVersion = params['address-pubkeyhash-version'];
    var addressScriptKeyHashVersion = params['address-scripthash-version'];
    var addressChecksumValue = params['address-checksum-value'];
    var addressPrivateKeyVersion = params['private-key-version'];

    console.log('Params:');
    console.log('address-pubkeyhash-version: ' + addressPubKeyHashVersion);
    console.log('address-scripthash-version: ' + addressScriptKeyHashVersion);
    console.log('address-checksum-value: ' + addressChecksumValue);
    console.log('private-key-version: ' + addressPrivateKeyVersion);
    console.log('----');

    console.log('Asset:');
    console.log('name: ' + assetName);
    console.log('----');

    var issuer = addressFactory.generateNew(addressPubKeyHashVersion, addressChecksumValue)

    console.log('Issuer:');
    console.log('address: ' + issuer.address);
    console.log('public key: ' + issuer.publicKey);
    console.log('private key: ' + issuer.privateKey);
    console.log('compressed: ' + issuer.compressed);
    console.log('----');

    return new Promise(function(fulfill, reject) {
        // Import address as watch only address, keep the private key of the node
        multichain.importAddress({ 'address': issuer.address }, function(err, result) {
            if (err) {
                reject(err);
                return;
            }

            // Issue new asset
            multichain.issue({
                'address': issuer.address,
                'asset': {
                    'name': assetName
                },
                'qty': amountToIssue
            }, function (err, txid) {
                if (err) {
                    reject(err);
                    return;
                }

                console.log('Issue transaction:');
                console.log('txid: ', txid);
                console.log('----');

                // Follow this asset
                multichain.subscribe({ 'stream': txid }, function(err, result) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Collect unspent assets
                    var unspentPromise = function collectUnspent() {

                        return new Promise(function(fulfill, reject) {
                            multichain.listUnspent({'receivers': [issuer.address]}, function (err, unspent) {
                                if (err) {
                                    reject(err);
                                    return;
                                }

                                var inputs = [],
                                    amountCollected = 0,
                                    utxo;

                                while (amountCollected < amountToSend && unspent.length > 0) {
                                    utxo = unspent.shift();

                                    if (utxo.assets[0].name === assetName) {
                                        inputs.push({
                                            'txid': utxo.txid,
                                            'vout': utxo.vout,
                                            'redeemScript': utxo.scriptPubKey,
                                            'qty': utxo.assets[0].qty
                                        });

                                        amountCollected += utxo.assets[0].qty;
                                    }
                                }

                                if (amountCollected < amountToSend) {
                                    console.error('Not enough assets available ' + amountCollected + ', ' + amountToSend + ' needed');

                                    setTimeout(function() {
                                        collectUnspent().then(fulfill, reject);
                                    }, 1000);

                                    return;
                                }

                                fulfill(inputs);
                            });
                        });
                    }();

                    unspentPromise.then(function(inputs) {
                        console.log('Inputs:');
                        inputs.forEach(function(input) {
                            console.log(input.qty + ' - ' + input.txid + ' - ' + input.redeemScript);
                        })
                        console.log('----');

                        var amounts = {},
                        recipient = addressFactory.generateNew(addressPubKeyHashVersion, addressChecksumValue);

                        console.log('Recipient:');
                        console.log('address: ' + recipient.address);
                        console.log('public key: ' + recipient.publicKey);
                        console.log('private key: ' + recipient.privateKey);
                        console.log('compressed: ' + recipient.compressed);
                        console.log('----');

                        amounts[recipient.address] = {};
                        amounts[recipient.address][assetName] = amountToSend;

                        var rawTransactionRequest = {
                            'inputs': inputs,
                            'amounts': amounts
                        };

                        // Create the transaction
                        multichain.createRawTransaction(rawTransactionRequest, function (err, hexString) {
                            if (err) {
                                reject(err);
                                return;
                            }

                            console.log('Raw transaction hex string:');
                            console.log(hexString);
                            console.log('----');

                            var rawChangeRequest = {
                                'hexstring': hexString,
                                'address': issuer.address
                            };

                            // Add change output to transaction
                            multichain.appendRawChange(rawChangeRequest, function (err, hexString) {
                                if (err) {
                                    reject(err);
                                    return;
                                }

                                console.log('Raw transaction hex string after appending raw change:');
                                console.log(hexString);
                                console.log('----');

                                // Decode the transaction
                                multichain.decodeRawTransaction({
                                    'hexstring': hexString
                                }, function (err, decodedTransaction) {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }

                                    console.log('Decoded transaction:');
                                    console.log(JSON.stringify(decodedTransaction));
                                    console.log('----');

                                    var redeemScript = inputs[0].redeemScript; // can't generate this

                                    // Sign the transaction
                                    issuer.sign(decodedTransaction, 0, redeemScript).then(function (signedTransaction) {
                                        console.log('Library signed hex string:');
                                        console.log(signedTransaction.toString('hex'));
                                        console.log('----');

                                        // Send the transaction to the network
                                        multichain.sendRawTransaction({
                                            'hexstring': signedTransaction.toString('hex')
                                        }, function (err, txid) {
                                            if (err) {
                                                reject(err);
                                                return;
                                            }

                                            console.log('Broadcasted txid', txid);
                                            console.log('----');

                                            // Check for confirmations
                                            var confirmedPromise = function isConfirmed() {

                                                return new Promise(function(fulfill, reject) {
                                                    multichain.getAsseTtransaction({'asset': assetName, 'txid': txid}, function(err, info) {
                                                        if (err) {
                                                            reject(err);
                                                            return;
                                                        }

                                                        if (info.confirmations < 1) {
                                                            console.error('number of confirmations: ' + info.confirmations);

                                                            setTimeout(function() {
                                                                isConfirmed().then(fulfill, reject);
                                                            }, 1000);

                                                            return;
                                                        }

                                                        fulfill(info)
                                                    });
                                                });
                                            }();

                                            confirmedPromise.then(fulfill, reject);
                                        });
                                    });
                                });
                            });
                        });
                    }).catch(reject);

                });
            });
        });
    });
}).then(function(info) {
    console.log(info);
}, function(error) {
    console.error(error);
});