
let eventListener;

export default class EventService {

	static init(_service){
		eventListener = _service;
	}

	static emit(type, data){
		return eventListener(type, data);
	}

}