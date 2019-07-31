import * as Actions from '../../store/constants'
import StoreService from "./StoreService";
import {BlockchainsArray} from "../../models/Blockchains";
import PluginRepository from "../../plugins/PluginRepository";

export default class ContactService {

    constructor(){}

    static async addOrUpdate(contact){
	    contact.recipient = contact.recipient.trim();
	    contact.name = contact.name.trim();
	    const scatter = StoreService.get().state.scatter.clone();

	    if(!contact.name.length) return {error:'Invalid contact name'};
	    if(!contact.recipient.length) return {error:'Invalid contact account / address'};

	    if(scatter.contacts.find(x => x.id !== contact.id && x.recipient.toLowerCase() === contact.recipient.toLowerCase()))
		    return {error:"Contact Exists"};

	    if(scatter.contacts.find(x => x.id !== contact.id && x.name.toLowerCase() === contact.name.toLowerCase()))
		    return {error:"Contact Name Exists"};


	    const c = scatter.contacts.find(x => x.id === contact.id);
	    if(c){
		    c.recipient = contact.recipient;
		    c.name = contact.name;
		    c.blockchain = contact.blockchain;
	    } else {
		    scatter.contacts.push(contact);
	    }

	    return StoreService.get().dispatch(Actions.SET_SCATTER, scatter);
    }

    static async remove(contact){
	    const scatter = StoreService.get().state.scatter.clone();
	    scatter.contacts = scatter.contacts.filter(x => x.id !== contact.id);
	    return StoreService.get().dispatch(Actions.SET_SCATTER, scatter);
    }

    static validate(blockchain, contact){
    	// You can add unsupported blockchains which we have no logic for,
	    // so we will always default to true for those.
    	if(!BlockchainsArray.map(x => x.value).includes(blockchain)) return true;

    	return PluginRepository.plugin(blockchain).isValidRecipient(contact);
    }

}