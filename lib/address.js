'use strict';

var randomBytes = require('randombytes'),
    logger = require('./logger'),
    secp256k1 = require('secp256k1'),
    crypto = require('./crypto'),
    bs58 = require('bs58'),
    xor = require('buffer-xor'),
    compare = require('buffer-compare');

var _generatePrivateKey, _createPublicKey, _generateAddress, _extendWithVersion, _generateChecksum, _extractVersion;

var addressFactory = {};

addressFactory.generateNew = function(pubKeyHashVersion, checksumValue) {
    return _generateAddress(_generatePrivateKey(), pubKeyHashVersion, checksumValue);
};

addressFactory.fromWIF = function(wif, publicKeyHashVersion, privateKeyVersion, checksumValue) {
    privateKeyVersion = Buffer.isBuffer(privateKeyVersion) ? privateKeyVersion : Buffer.from(privateKeyVersion, 'hex');
    checksumValue = Buffer.isBuffer(checksumValue) ? checksumValue : Buffer.from(checksumValue, 'hex');

    var decodedWIF = new Buffer(bs58.decode(wif));
    logger.log('[from WIF]', 'decoded WIF', decodedWIF.toString('hex'));

    var extractedChecksum = decodedWIF.slice(decodedWIF.length - checksumValue.length),
        extendedPrivateKey = decodedWIF.slice(0, decodedWIF.length - checksumValue.length),
        generatedChecksum = _generateChecksum(extendedPrivateKey, checksumValue.length),
        xorChecksum = xor(generatedChecksum, checksumValue);

    logger.log('[from WIF]', 'extracted checksum', extractedChecksum.toString('hex'));
    logger.log('[from WIF]', 'extended private key', extendedPrivateKey.toString('hex'));

    logger.log('[from WIF]', 'generated checksum', generatedChecksum.toString('hex'));
    logger.log('[from WIF]', 'xor checksum', xorChecksum.toString('hex'));

    if (compare(extractedChecksum, xorChecksum) !== 0) {
        throw new Error('Extracted checksum and generated checksum do not match (' + extractedChecksum.toString('hex') + ', ' + xorChecksum.toString('hex') + ')');
    }

    var extractedData = _extractVersion(extendedPrivateKey, privateKeyVersion.length, 8);

    if (compare(extractedData['version'], privateKeyVersion) !== 0) {
        throw new Error('Extracted private key does not match the given private key (' + extractedData['version'].toString('hex') + ', ' + privateKeyVersion.toString('hex') + ')');
    }

    logger.log('[from WIF]', 'extracted private key', extractedData['hash'].toString('hex'));

    return _generateAddress(extractedData['hash'], publicKeyHashVersion, checksumValue);
};

module.exports = addressFactory;

function Address(encodedAddress, pubKey, privKey) {
    this.address = encodedAddress;
    this.publicKey = pubKey;
    this.privateKey = privKey;
}

Address.prototype.toWIF = function(privateKeyVersion, checksumValue) {
    privateKeyVersion = Buffer.isBuffer(privateKeyVersion) ? privateKeyVersion : Buffer.from(privateKeyVersion, 'hex');
    checksumValue = Buffer.isBuffer(checksumValue) ? checksumValue : Buffer.from(checksumValue, 'hex');

    logger.log('[to WIF]', 'private key', this.privateKey.toString('hex'));

    var extendedPrivateKey = _extendWithVersion(this.privateKey, privateKeyVersion, 8);

    logger.log('[to WIF]', 'extended private key', extendedPrivateKey.toString('hex'));

    var checksum = _generateChecksum(extendedPrivateKey, checksumValue.length),
        xorChecksum = xor(checksum, checksumValue);

    logger.log('[to WIF]', 'checksum', checksum.toString('hex'));
    logger.log('[to WIF]', 'xor checksum', xorChecksum.toString('hex'));

    var decodedWIF = Buffer.concat([extendedPrivateKey, xorChecksum]);
    logger.log('[to WIF]', 'decoded WIF', decodedWIF.toString('hex'));

    var encodedWIF = bs58.encode(decodedWIF);

    logger.log('[to WIF]', 'encoded WIF', encodedWIF);

    return encodedWIF;
};

Address.prototype.toString = function() {
    return this.address + ' (' + this.privateKey.toString('hex') + ')';
};

_generatePrivateKey = function() {
    var privKey;

    do {
        privKey = randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privKey));

    return privKey;
};

_generateAddress = function(privKey, pubKeyHashVersion, checksumValue) {
    pubKeyHashVersion = Buffer.isBuffer(pubKeyHashVersion) ? pubKeyHashVersion : Buffer.from(pubKeyHashVersion, 'hex');
    checksumValue = Buffer.isBuffer(checksumValue) ? checksumValue : Buffer.from(checksumValue, 'hex');

    logger.log('[Generate address]', 'private key', privKey.toString('hex'));

    var pubKey = _createPublicKey(privKey, false);

    logger.log('[Generate address]', 'public key', pubKey.toString('hex'));

    var ripemd160 = crypto.ripemd160(crypto.sha256(pubKey)),
        extendedRipemd160 = _extendWithVersion(ripemd160, pubKeyHashVersion, 5);

    logger.log('[Generate address]', 'ripemd160', ripemd160.toString('hex'));
    logger.log('[Generate address]', 'public key hash value', pubKeyHashVersion.toString('hex'));
    logger.log('[Generate address]', 'extended ripemd160', extendedRipemd160.toString('hex'));

    var checksum = _generateChecksum(extendedRipemd160, checksumValue.length),
        xorChecksum = xor(checksum, checksumValue);
    logger.log('[Generate address]', 'checksum', checksum.toString('hex'));
    logger.log('[Generate address]', 'xor checksum', xorChecksum.toString('hex'));

    var decodedAddress = Buffer.concat([extendedRipemd160, xorChecksum]);
    logger.log('[Generate address]', 'decoded address', decodedAddress.toString('hex'));

    var encodedAddress = bs58.encode(decodedAddress);

    logger.log('[Generate address]', 'encoded address', encodedAddress);

    return new Address(encodedAddress, pubKey, privKey);
};

_createPublicKey = function(privKey, combined) {
    combined = combined || false;

    return secp256k1.publicKeyCreate(privKey, combined);
};

_extendWithVersion = function(hash, versionHash, nbSpacerBytes) {
    var extendedParts = [], index = 0, fromIndex, toIndex;

    for (; index < versionHash.length; index++) {
        extendedParts.push(versionHash.slice(index, index + 1));

        fromIndex = index * nbSpacerBytes;
        toIndex = (index + 1) * nbSpacerBytes;

        extendedParts.push(hash.slice(fromIndex, toIndex));
    }

    if ((index * nbSpacerBytes) < hash.length) {
        extendedParts.push(hash.slice(index * nbSpacerBytes));
    }

    return Buffer.concat(extendedParts);
};

_extractVersion = function(extendedHash, versionLength, nbSpacerBytes) {
    var versionParts = [],
        hashParts = [], index = 0, fromIndex, toIndex;

    for (; index < versionLength; index++) {
        versionParts.push(extendedHash.slice(index * nbSpacerBytes + index, index * nbSpacerBytes + index + 1));

        fromIndex = index * nbSpacerBytes + index + 1;
        toIndex = (index + 1) * nbSpacerBytes + index + 1;

        hashParts.push(extendedHash.slice(fromIndex, toIndex));
    }

    if ((index * nbSpacerBytes + index) < extendedHash.length) {
        hashParts.push(extendedHash.slice(index * nbSpacerBytes + index));
    }

    return {
        'version': Buffer.concat(versionParts),
        'hash': Buffer.concat(hashParts)
    };
};

_generateChecksum = function(extendedHash, checksumLength) {
    return crypto.hash256(extendedHash).slice(0, checksumLength);
};