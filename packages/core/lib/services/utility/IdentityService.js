import StoreService from "./StoreService";
import * as Actions from '../../store/constants';

export default class IdentityService {

	static async addIdentity(identity){
		const clone = StoreService.get().state.scatter.clone();
		clone.keychain.updateOrPushIdentity(identity);
		return StoreService.get().dispatch(Actions.SET_SCATTER, clone);
	}

	static async updateIdentity(identity){
		return this.addIdentity(identity);
	}

	static async removeIdentity(identity){
		const clone = StoreService.get().state.scatter.clone();
		clone.keychain.removeIdentity(identity);
		return StoreService.get().dispatch(Actions.SET_SCATTER, clone);
	}

	static async addLocation(location){
		const clone = StoreService.get().state.scatter.clone();
		clone.keychain.updateOrPushLocation(location);
		return StoreService.get().dispatch(Actions.SET_SCATTER, clone);
	}

	static async updateLocation(location){
		return this.addLocation(location);
	}

	static async removeLocation(location){
		const clone = StoreService.get().state.scatter.clone();
		clone.keychain.removeLocation(location);
		return StoreService.get().dispatch(Actions.SET_SCATTER, clone);
	}

}