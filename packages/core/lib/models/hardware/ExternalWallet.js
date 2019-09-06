import IdGenerator from '../../util/IdGenerator';

export let EXT_WALLET_TYPES = {};

// Format [ {type,name,wallet}, {type,name,wallet} ]
let WALLETS = [];

export default class ExternalWallet {

    static loadWallets(_wallets){
	    EXT_WALLET_TYPES = _wallets.map(x => ({[x.type]:x.name}));
        WALLETS = _wallets;
    }

    constructor(_type = null, _blockchain = null){
        this.id = IdGenerator.text(64);
        this.type = _type;
        this.blockchain = _blockchain;
        this.addressIndex = 0;
    }

    static placeholder(){ return new ExternalWallet(); }
    static fromJson(json){
        return Object.assign(this.placeholder(), json);
    }

    setup(){
        this.interface = getInterface(this.type, this.blockchain);
    }
}

const getInterface = (type, blockchain) => {
    if(EXT_WALLET_TYPES.hasOwnProperty(type)) return WALLETS[type].wallet.typeToInterface(blockchain);
    return console.error('Type not defined in hardware wallets');
}

export class ExternalWalletInterface {

    constructor(handler){
        this.handler = handler;
    }

    async open(){
        return await this.handler.open();
    }

    async close(){
	    return await this.handler.close();
    }

    async canConnect(){
	    return await this.handler.canConnect();
    }

    async sign(publicKey, transaction, abi, network){
        return await this.handler.sign(publicKey, transaction, abi, network);
    }

    async getPublicKey(){
        return await this.handler.getPublicKey();
    }

    setAddressIndex(path){
        return this.handler.setAddressIndex(path);
    }

    availableBlockchains(){
        return this.handler.availableBlockchains();
    }

}

