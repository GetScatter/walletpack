import Framework from "../services/utility/Framework";

export default class Meta {

    constructor(){
        this.version = Framework.getVersion();
        this.lastVersion = Framework.getVersion();
        this.acceptedTerms = false;
        this.lastSuggestedVersion = null;
    }

    getVersion(){
        return Framework.getVersion()
    }

    regenerateVersion(){
        this.version = Framework.getVersion();
    }

    needsUpdating(){
        return this.version !== this.lastVersion;
    }

    static placeholder(){ return new Meta(); }
    static fromJson(json){ return Object.assign(this.placeholder(), json); }
}