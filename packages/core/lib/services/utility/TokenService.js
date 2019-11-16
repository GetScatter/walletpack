import * as Actions from '../../store/constants';
import BigNumber from "bignumber.js";
import Token from "../../models/Token";
import StoreService from "./StoreService";
import BalanceService from "../blockchain/BalanceService";

const filterOutToken = (scatter, token) => {
	scatter.settings.tokens = scatter.settings.tokens.filter(x => x.unique() !== token.unique());
	scatter.settings.blacklistTokens = scatter.settings.blacklistTokens.filter(x => x.unique() !== token.unique());
	if(scatter.settings.displayToken === token.unique()) scatter.settings.displayToken = null;
}

export default class TokenService {

    static async addToken(token, blacklist = false){
	    const scatter = StoreService.get().state.scatter.clone();

	    // Never adding system tokens.
	    if(StoreService.get().state.scatter.networkTokens().find(x => x.unique() === token.unique())) return true;

        if(!token.symbol.length) return {error:"Symbol Missing"};
        if(!token.contract.length) return {error:"Contract missing"};

        if(!blacklist && scatter.settings.tokens.find(x => x.unique() === token.unique()))
            return {error:"Token exists already (whitelist)"};

        if(blacklist && scatter.settings.blacklistTokens.find(x => x.unique() === token.unique()))
            return {error:"Token exists already (blacklist)"};

        if(!token.name.trim().length) token.name = token.symbol;

	    filterOutToken(scatter, token);

        if(!blacklist) scatter.settings.tokens.unshift(token);
        else scatter.settings.blacklistTokens.unshift(token);

        return StoreService.get().dispatch(Actions.SET_SCATTER, scatter);
    }

    static removeToken(token){
	    const scatter = StoreService.get().state.scatter.clone();

	    // Never removing system tokens.
	    if(StoreService.get().state.scatter.networkTokens().find(x => x.unique() === token.unique())) return true;

	    filterOutToken(scatter, token);
	    StoreService.get().dispatch(Actions.SET_SCATTER, scatter);
    }

    static hasToken(token){
    	const scatter = StoreService.get().state.scatter.clone();

    	return !!BalanceService.totalBalances().totals[token.unique()] ||
		    !!scatter.settings.tokens.find(x => x.unique() === token.unique()) ||
		    !!scatter.settings.blacklistTokens.find(x => x.unique() === token.unique());
    }

    static async setDisplayCurrency(ticker){
	    const scatter = StoreService.get().state.scatter.clone();
	    scatter.settings.displayCurrency = ticker;
	    return StoreService.get().dispatch(Actions.SET_SCATTER, scatter);
    }

	static async setDisplayToken(token){
		const scatter = StoreService.get().state.scatter.clone();
		scatter.settings.displayToken = token instanceof Token ? token.uniqueWithChain() : token;
		return StoreService.get().dispatch(Actions.SET_SCATTER, scatter);
	}


	static formatAmount(amount, token, div = false){
    	const operator = div ? 'div' : 'times';
		let decimalString = '';
		for(let i = 0; i < token.decimals; i++){ decimalString += '0'; }
		return new BigNumber(amount.toString(10), 10)[operator](`1${decimalString}`).toString(10);
	}

}
