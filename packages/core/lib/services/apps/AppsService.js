import {BlockchainsArray, blockchainName} from "../../models/Blockchains";
import * as Actions from '../../store/constants';
import BackendApiService from "../apis/BackendApiService";
import StoreService from "../utility/StoreService";
import ObjectHelpers from "../../util/ObjectHelpers";

const storeApps = res => {
	const allApps = res.reduce((acc,x) => {
		if(x.hasOwnProperty('hasimage'))
			x.img = `https://rawgit.com/GetScatter/ScatterApps/master/logos/${x.applink}.svg`

		acc[x.applink] = x;
		return acc;
	}, {});

	if(StoreService.get()) {
		StoreService.get().dispatch(Actions.SET_DAPP_DATA, allApps);
	}

	return allApps;
}

const getAppsFromAPI = () => {
	return new Promise(resolve => {
		BackendApiService.apps().then(async res => {
			resolve(await storeApps(res));
		}).catch(() => resolve(false));
	})
};

export default class AppsService {

	/***
	 * Gets apps and binds them to state,
	 * falls back to github if API is failing.
	 * @returns {Promise<boolean>}
	 */
	static async getApps(){
		const apps = await BackendApiService.apps();
		return await storeApps(apps);
	}

	static getAppData(origin){
		const emptyResult = {
			applink:origin,
			type:'',
			name:origin,
			description:'',
			logo:'',
			url:'',
		};

		const dappData = StoreService.get().state.dappData;
		let found = dappData[origin];

		if(!found){
			(() => {
				// Checking subdomains
				if(origin.split('.').length < 2) return;
				const [subdomain, domain, suffix] = origin.split('.');
				Object.keys(dappData).map(applink => {
					if(origin.indexOf(applink) === -1) return;
					const dapp = dappData[applink];
					if(!dapp.hasOwnProperty('subdomains') || !dapp.subdomains.length) return;
					// Checking wildcards
					if(dapp.subdomains.find(x => x === '*')){
						if(`*.${applink}` === `*.${domain}.${suffix}`) return found = dapp;
					}
					// Checking hardcoded domains
					else {
						dapp.subdomains.map(sub => {
							if(`${sub}.${applink}` === origin) return found = dapp;
						})
					}
				})
			})();
		}

		if(!found) return emptyResult;

		const maxDescriptionLength = 70;
		if(found.description.length > maxDescriptionLength){
			found.description = `${found.description.substr(0,70)}${found.description.length > 70 ? '...':''}`
		}

		return found;
	}


	static categories(selectedCategory = null){
		return AppsService.appsByCategory(selectedCategory).map(x => x.type)
	}

	static appsByCategory(selectedCategory = null){
		const dappData = StoreService.get().state.dappData;
		if(!dappData) return {};
		return Object.keys(dappData).reduce((acc, key) => {
			const item = dappData[key];
			if(!acc.find(x => x.type === item.type)) acc.push({type:item.type, apps:[]});
			acc.find(x => x.type === item.type).apps.push(item);
			return acc;
		}, []).map(cat => {
			ObjectHelpers.shuffle(cat.apps);
			if(selectedCategory) return cat;
			cat.apps = cat.apps.filter(({applink}) => AppsService.getAppData(applink).hasOwnProperty('img'));
			return cat;
		}).sort((a,b) => {
			return b.apps.length - a.apps.length
		});
	}

	static appsByTerm(searchTerm){
		const dappData = StoreService.get().state.dappData;
		if(!dappData) return {};
		return Object.keys(dappData).reduce((acc, key) => {
			const item = dappData[key];
			const found = prop => prop.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) > -1;
			if(found(item.applink) || found(item.name) || found(item.description)) acc.push(item);
			return acc;
		}, []);
	}

	static linkedApps(terms = '', typeFilter = null){
		return StoreService.get().state.scatter.keychain.permissions.filter(x => x.isIdentity).map(({origin:applink}) => {
			return AppsService.getAppData(applink);
		}).filter(app => {
			return app.type === typeFilter || !typeFilter
		}).filter(app => {
			return app.name.toLowerCase().indexOf(terms) > -1
		});
	}

}