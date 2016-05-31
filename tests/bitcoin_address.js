'use strict';

var path = require('path'),
    chai = require('chai'),
    bs58 = require('bs58'),
    compare = require('buffer-compare');

var expect = chai.expect;

var addressFactory = require(path.resolve(__dirname, '../lib/address.js'));

var pubKeyHashVersion = '00',
    privateKeyVersion = '80',
    checksumValue = '00000000';

describe('When i have a Bitcoin configuration for multichain (address-pubkeyhash-version=' + pubKeyHashVersion + ', private-key-version=' + privateKeyVersion + ', address-checksum-value=' + checksumValue + ')', function() {

    describe('And i generate an address', function() {

        var address;

        before(function() {
            address = addressFactory.generateNew(pubKeyHashVersion, checksumValue);
        });

        it('should have a 32-byte private key', function() {
            expect(Buffer.isBuffer(address.privateKey)).to.be.true;
            expect(address.privateKey).to.have.length(32);
        });

        it('should have a public key', function() {
            expect(Buffer.isBuffer(address.publicKey)).to.be.true;
        });

        it('should have a base58 encoded address', function() {
            expect(address.address).to.be.a('string');
        });

        describe('When i decode the base58 encoded address', function() {

            var decodedAddress;

            before(function() {
                decodedAddress = new Buffer(bs58.decode(address.address));
            });

            it('should have a length of 25 bytes (1 version byte + 20 byte ripemd160 hash + 4 checksum byte)', function() {
                expect(decodedAddress).to.have.length(25);
            });

            it('should start with the public key hash version 00', function() {
                expect(decodedAddress.toString('hex').slice(0, 2)).to.equal('00');
            });

        });

        describe('When i generate the WIF format of this address', function() {

            var addressWIF;

            before(function() {
                addressWIF = address.toWIF(privateKeyVersion, checksumValue);
            });

            it('should return a base58 encoded WIF', function() {
                expect(addressWIF).to.be.a('string');
            });

            describe('When i decode the base58 encoded address', function() {

                var decodedWIF;

                before(function() {
                    decodedWIF = new Buffer(bs58.decode(addressWIF));
                });

                it('should start with the private key version 80', function() {
                    expect(decodedWIF.toString('hex').slice(0, 2)).to.equal('80');
                });

                it('should include the private key and a 4 bytes checksum', function() {
                    var hexValue = decodedWIF.toString('hex');
                    expect(hexValue.slice(2, hexValue.length - 8)).to.equal(address.privateKey.toString('hex'));
                });

                describe('When i create the address from the generated WIF', function() {

                    var addressByWIF;

                    before(function() {
                        addressByWIF = addressFactory.fromWIF(addressWIF, pubKeyHashVersion, privateKeyVersion, checksumValue);
                    });

                    it('should match the original address', function() {
                        expect(addressByWIF.address).to.equal(address.address);
                        expect(compare(addressByWIF.privateKey, address.privateKey)).to.equal(0);
                        expect(compare(addressByWIF.publicKey, address.publicKey)).to.equal(0);
                    });

                });

            });

        });

    });

});