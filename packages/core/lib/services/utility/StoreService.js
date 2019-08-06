import * as Actions from '../../store/constants'

let store;

/***
 * This is a helper service which returns the store
 * but allows for testing suites to be run without vuex
 */
export default class StoreService {

	static init(_store){
		store = _store;
	}

	static get(){
		return store;
	}

}