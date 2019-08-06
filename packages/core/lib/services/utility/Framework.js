let framework;
export default class Framework {

	static init(_framework){
		framework = _framework;
	}

	static getVersion(){
		return framework.getVersion();
	}

	static pushNotification(title, description){
		return framework.pushNotification(title, description);
	}

	static triggerDeepLink(deepLink){

	}

}