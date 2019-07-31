let storage;

export default class StorageService {

    constructor(){}

    static init(_storage){
    	storage = _storage;
    }

    static getDefaultPath(){
	    return storage.getDefaultPath();
    }

    static async setScatter(scatter){
	    return storage.setScatter(scatter);
    };

    static getScatter() {
	    return storage.getScatter();
    }

    static removeScatter(){
	    return storage.removeScatter();
    }

    static cacheABI(contractName, chainId, abi){
	    return storage.cacheABI(contractName, chainId, abi);
    }

    static getCachedABI(contractName, chainId){
	    return storage.getCachedABI(contractName, chainId);
    }

    static getSalt(){
	    return storage.getSalt() || 'SALT_ME';
    }

    static setSalt(salt){
	    return storage.setSalt(salt);
    }

    static async getTranslation(){
	    return storage.getTranslation();
    }

    static async setTranslation(translation){
	    return storage.setTranslation(translation);
    }

    static async getHistory(){
	    return storage.getHistory();
    }

    static async updateHistory(x){
	    return storage.updateHistory(x);
    }

    static async deltaHistory(x){
	    return storage.deltaHistory(x);
    }

    static async swapHistory(history){
	    return storage.swapHistory(history);
    }


    static async setLocalScatter(scatter){
	    return storage.setLocalScatter(scatter);
    }

    static getLocalScatter(){
	    return storage.getLocalScatter();
    }

    static getFolderLocation(){
	    return storage.getFolderLocation();
    }

    static saveFile(filepath, name, file){
	    return storage.saveFile(filepath, name, file);
    }
}