import IdGenerator from '../util/IdGenerator'
import {Blockchains} from './Blockchains';

export default class Contact {

    constructor(_name = '', _recipient = '', _blockchain = null, _chainId = null){
        this.id = IdGenerator.text(24);
        this.name = _name;
        this.recipient = _recipient;
        this.blockchain = _blockchain;
        this.chainId = _chainId;
    }

    static placeholder(){ return new Contact(); }
    static fromJson(json){ return Object.assign(this.placeholder(), json); }

    unique(){ return `${this.blockchain}::${this.recipient}::${this.name}${/* LEGACY SUPPORT */ this.chainId ? `::${this.chainId}` : ''}`.toLowerCase().trim(); }
	clone(){ return Contact.fromJson(JSON.parse(JSON.stringify(this))) }

}
