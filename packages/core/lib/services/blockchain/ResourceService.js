import PluginRepository from '../../plugins/PluginRepository';
import {Blockchains} from '../../models/Blockchains';
import Account from '../../models/Account';
import * as Actions from '../../store/constants';
import StoreService from "../utility/StoreService";

export default class ResourceService {

    static usesResources(account){
        account = Account.fromJson(account);
        const plugin = PluginRepository.plugin(account.blockchain());
        return plugin.usesResources();
    }

    static async needsResources(account){
        account = Account.fromJson(account);
        const plugin = PluginRepository.plugin(account.blockchain());
        if(!plugin.usesResources()) return false;
        return plugin.needsResources(account);
    }

    static async addResources(account){
        account = Account.fromJson(account);
        const plugin = PluginRepository.plugin(account.blockchain());
        if(!plugin.usesResources()) return false;
        return plugin.addResources(account);
    }

    static async getResourcesFor(account){
        account = Account.fromJson(account);
        const plugin = PluginRepository.plugin(account.blockchain());
        if(!plugin.usesResources()) return [];
        return plugin.getResourcesFor(account);
    }

    static async cacheResourceFor(account){
	    if(!account) return;
	    const resources = await ResourceService.getResourcesFor(account);
	    StoreService.get().dispatch(Actions.ADD_RESOURCES, {acc:account.identifiable(), res:resources});
    }

}