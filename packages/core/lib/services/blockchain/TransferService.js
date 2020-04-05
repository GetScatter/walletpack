import {Blockchains, BlockchainsArray} from '../../models/Blockchains'
import PluginRepository from '../../plugins/PluginRepository';
import HistoricTransfer from "../../models/histories/HistoricTransfer";
import * as Actions from '../../store/constants'
import StoreService from "../utility/StoreService";

export default class TransferService {

    static async [Blockchains.BTC](params){
        return this.baseTransfer(params);
    }

    static async [Blockchains.ETH](params){
        return this.baseTransfer(params);
    }

    static async [Blockchains.TRX](params){
        return this.baseTransfer(params);
    }

    static async [Blockchains.FIO](params){
        return this.baseTransfer(params);
    }

    static async [Blockchains.EOSIO](params){
    	params.recipient = params.recipient.toLowerCase();
        return this.baseTransfer(params);
    }

    static async baseTransfer(params){
        let {account, recipient, amount, memo, token } = params;
        const plugin = PluginRepository.plugin(account.blockchain());

        const transfer = await PluginRepository.plugin(account.blockchain())
            .transfer({
                account,
                to:recipient,
                amount,
                token,
                memo,
            }).catch(x => x);

        if(transfer !== null) {
            if (transfer.hasOwnProperty('error')) return transfer;
            else {
                if(!params.bypassHistory){
	                const history = new HistoricTransfer(account, recipient, token, amount, memo, this.getTransferId(transfer, token.blockchain));
	                StoreService.get().dispatch(Actions.DELTA_HISTORY, history);
                }

                return transfer;
            }
        }
        return null;
    }

    static getTransferId(transfer, blockchain){
	    switch(blockchain){
		    case Blockchains.EOSIO: return transfer.transaction_id;
		    case Blockchains.TRX: return transfer.txID;
		    case Blockchains.ETH: return transfer.transactionHash;
		    case Blockchains.BTC: return transfer.txid;
	    }
	    return null;
    }

}
