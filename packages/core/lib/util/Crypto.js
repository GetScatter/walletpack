import ecc from 'eosjs-ecc';
const randomBytes = require('randombytes')
const ecurve = require('ecurve');
const Point = ecurve.Point;
const secp256k1 = ecurve.getCurveByName('secp256k1');
const {PrivateKey} = ecc;
const BigInteger = require('bigi');
const ByteBuffer = require('bytebuffer')
const createHash = require('create-hash');

import PluginRepository from '../plugins/PluginRepository';

const sha512 = s => createHash('sha512').update(s).digest('hex');
let unique_nonce_entropy = null

export default class Crypto {

    static async generatePrivateKey(){
        return (await PrivateKey.randomKey()).toBuffer();
    }

    static bufferToPrivateKey(buffer, blockchain){
        return PluginRepository.plugin(blockchain).bufferToHexPrivate(buffer);
    }

    static privateKeyToBuffer(privateKey, blockchain){
        return PluginRepository.plugin(blockchain).hexPrivateToBuffer(privateKey);
    }

    static bufferToHash(buffer){
        return ecc.sha256(buffer);
    }

    static getEncryptionKey(privateKeyBuffer, publicKeyBuffer, nonce) {
        const sharedKey = Crypto.sharedSecret(privateKeyBuffer, publicKeyBuffer);
        let ebuf = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        ebuf.writeUint64(nonce);
        ebuf.append(sharedKey.toString('binary'), 'binary');
        ebuf = new Buffer(ebuf.copy(0, ebuf.offset).toBinary(), 'binary');
        return sha512(ebuf);
    }

    static sharedSecret(privateKeyBuffer, publicKeyBuffer){
        let keyBufferPoint = Point.fromAffine(
            secp256k1,
            BigInteger.fromBuffer( publicKeyBuffer.slice( 1,33 )), // x
            BigInteger.fromBuffer( publicKeyBuffer.slice( 33,65 )) // y
        );
        let P = keyBufferPoint.multiply(BigInteger.fromBuffer(privateKeyBuffer));
        let S = P.affineX.toBuffer({size: 32});
        return sha512(S);
    }

    /** @return {string} unique 64 bit unsigned number string.  
     * Being time based, this is careful to never choose the same nonce twice.  
     * This value could be recorded in the blockchain for a long time.
    */
    static uniqueNonce() {
        if(unique_nonce_entropy === null) {
            const b = new Uint8Array(randomBytes(2))
            unique_nonce_entropy = parseInt(b[0] << 8 | b[1], 10)
        }
        let long = Long.fromNumber(Date.now())
        const entropy = ++unique_nonce_entropy % 0xFFFF
        long = long.shiftLeft(16).or(Long.fromNumber(entropy));
        return long.toString()
    }
}

