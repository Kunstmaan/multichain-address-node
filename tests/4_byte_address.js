'use strict';

var path = require('path'),
    chai = require('chai'),
    bs58 = require('bs58'),
    compare = require('buffer-compare');

var expect = chai.expect;

var addressFactory = require(path.resolve(__dirname, '../lib/address.js'));

var pubKeyHashVersion = '00112233',
    privateKeyVersion = '44556677',
    checksumValue = '11111111';

describe('When i have a 4 byte configuration for multichain (address-pubkeyhash-version=' + pubKeyHashVersion + ', private-key-version=' + privateKeyVersion + ', address-checksum-value=' + checksumValue + ')', function() {

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

            it('should have a length of 28 bytes (4 version byte + 20 byte ripemd160 hash + 4 checksum byte)', function() {
                expect(decodedAddress).to.have.length(28);
            });

            it('should have the public hash version embedded', function() {
                expect(decodedAddress.toString('hex').slice(0, 2)).to.equal('00');
                expect(decodedAddress.toString('hex').slice(12, 14)).to.equal('11');
                expect(decodedAddress.toString('hex').slice(24, 26)).to.equal('22');
                expect(decodedAddress.toString('hex').slice(36, 38)).to.equal('33');
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

                it('should have the private key version embedded', function() {
                    expect(decodedWIF.toString('hex').slice(0, 2)).to.equal('44');
                    expect(decodedWIF.toString('hex').slice(18, 20)).to.equal('55');
                    expect(decodedWIF.toString('hex').slice(36, 38)).to.equal('66');
                    expect(decodedWIF.toString('hex').slice(54, 56)).to.equal('77');
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