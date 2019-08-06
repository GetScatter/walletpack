let hardwareService;

const NO_INIT = "You must initialize the hardware service first.";

export default class HardwareService {

	static init(_service){
		hardwareService = _service;
	}

	static async openConnections(onlyIfDisconnected = false){
		if(!hardwareService) return console.error(NO_INIT);
		return this.openConnections(onlyIfDisconnected);
	}

	static async checkHardware(account){
		if(!hardwareService) return console.error(NO_INIT);
		return hardwareService.checkHardware(account);
	}

	static async sign(account, payload){
		if(!hardwareService) return console.error(NO_INIT);
		return hardwareService.sign(account, payload);
	}

}