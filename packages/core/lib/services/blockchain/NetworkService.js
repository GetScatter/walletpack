import * as Actions from '../../store/constants';

import AccountService from './AccountService';
import BalanceService from "./BalanceService";
import PluginRepository from "../../plugins/PluginRepository";
import StoreService from "../utility/StoreService";


export default class NetworkService {

    static async addNetwork(network){
        // Can't modify existing networks.
        const scatter = StoreService.get().state.scatter.clone();
        const networks = scatter.settings.networks;
        if(networks.find(x => x.id === network.id)) return;
        
        if(!network.name.length) return {error:"Missing Name"};
        if(!network.host.length) return {error:"Missing Host"};
        if(!network.port)        return {error:"Missing Port"};
        if(!network.chainId)     return {error:"Missing Chain"};

        network.setPort();

        if(networks.find(x => x.blockchain === network.blockchain && x.chainId === network.chainId))
            return {error:"Chain Exists"}

        if(networks.find(x => x.name.toLowerCase() === network.name.toLowerCase()))
	        return {error:"Name Exists"};

        scatter.settings.updateOrPushNetwork(network);
        await StoreService.get().dispatch(Actions.SET_SCATTER, scatter);
        await AccountService.importAllAccountsForNetwork(network);
        setTimeout(() => {
	        BalanceService.loadAllBalances(true);
        }, 100);
	    PluginRepository.bustCaches();
        return true;
    }

    static async removeNetwork(network){
	    PluginRepository.bustCaches();
	    const scatter = StoreService.get().state.scatter.clone();

	    // Removing accounts and permissions for this network
	    const accounts = scatter.keychain.accounts.filter(x => x.networkUnique === network.unique());
	    accounts.map(account => scatter.keychain.removeAccount(account));
	    scatter.settings.removeNetwork(network);
	    StoreService.get().dispatch(Actions.SET_SCATTER, scatter);
	    BalanceService.removeStaleBalances();
	    return true;
    }

    static async updateNetwork(network){
	    const scatter = StoreService.get().state.scatter.clone();
	    scatter.settings.updateOrPushNetwork(network);
	    await StoreService.get().dispatch(Actions.SET_SCATTER, scatter);
	    PluginRepository.bustCaches();
	    return true;
    }

}