import * as Actions from '../../store/constants';
import AccountService from "../blockchain/AccountService";
import PriceService from "../apis/PriceService";
import PermissionService from "../apps/PermissionService";
import StoreService from "./StoreService";
import SocketService from "./SocketService";
import AppsService from "../apps/AppsService";
import PluginRepository from "../../plugins/PluginRepository";
import {Blockchains} from "../../models/Blockchains";

let initialized = false;

export default class SingletonService {

	static async init(){
		if(initialized) return true;
		initialized = true;
		PluginRepository.plugin(Blockchains.TRX).init();
		SocketService.initialize();
		AppsService.getApps();
		PriceService.watchPrices();

		PermissionService.removeDanglingPermissions();
		AccountService.fixOrphanedAccounts();
		return true;
	}

}