import AES from 'aes-oop';
import IdGenerator from '../util/IdGenerator';
import Crypto from '../util/Crypto';
import Keychain from "./Keychain";

export class CreditCardSecureProperties {

    constructor(){
        this.number = '';
        this.authTokens = {};
	    this.expiration = '';
	    this.cardHash = '';

        this.personalInformation = {};
    }

	static placeholder(){ return new CreditCardSecureProperties(); }
	static fromJson(json){ return Object.assign(this.placeholder(), json); }
	clone(){ return CreditCardSecureProperties.fromJson(JSON.parse(JSON.stringify(this))) }

}

export default class CreditCard {

    constructor(){
        this.id = IdGenerator.text(24);
        this.name = '';
	    this.lastFour = '';
        this.secure = CreditCardSecureProperties.placeholder();
        this.createdAt = +new Date();
    }

    static placeholder(){ return new CreditCard(); }
    static fromJson(json){
	    let p = Object.assign(this.placeholder(), json);
	    if(json.hasOwnProperty('secure'))
		    p.secure = (typeof json.secure === 'string')
			    ? json.secure : CreditCardSecureProperties.fromJson(json.secure);
	    return p;
    }
	unique(){ return this.id; }
	clone(){ return CreditCard.fromJson(JSON.parse(JSON.stringify(this))) }
    hash(){ this.cardHash = Crypto.bufferToHash(this.secure.number); }

    isEncrypted(){
        return typeof this.secure === 'string';
    }

    encrypt(seed){
        if(!this.isEncrypted()) this.secure = AES.encrypt(this.secure, seed);
    }

    decrypt(seed){
        if(this.isEncrypted()) this.secure = AES.decrypt(this.secure, seed);
    }
}