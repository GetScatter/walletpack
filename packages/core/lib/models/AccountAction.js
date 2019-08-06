export default class AccountAction {
    constructor(type, onclick = () => {}, danger = false){
        this.type = type;
        this.onclick = onclick;
        this.isDangerous = danger;
    }

	static placeholder(){ return new AccountAction(); }
	static fromJson(json){ return Object.assign(this.placeholder(), json); }
}
