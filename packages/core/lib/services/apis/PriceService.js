import * as Actions from '../../store/constants';
import Token from "../../models/Token";
import {GET} from "./BackendApiService";
import StoreService from "../utility/StoreService";
import {dateId} from "../../util/DateHelpers";


// Once every 30 minutes.
const intervalTime = 60000 * 30;
let priceInterval;


export default class PriceService {

    static async watchPrices(enable = true){
        clearInterval(priceInterval);
        if(!enable) return;
        return new Promise(async resolve => {

            const setPrices = async () => {
                await PriceService.setPrices();
                resolve(true);
            }

            await setPrices();
            priceInterval = setInterval(async () => {
                await setPrices();
            }, intervalTime);
        })
    }

    static async setPrices(){
		const prices = await PriceService.getAll();
		if(prices && Object.keys(prices).length) {
			await StoreService.get().dispatch(Actions.SET_PRICES, prices);
		}
	}

    static getAll(){
        return Promise.race([
            new Promise(resolve => setTimeout(() => resolve(false), 10000)),
	        GET(`prices?v2=true`).catch(() => {
            	return {error:"Problem connecting to Prices API"};
            })
        ])
    }

    static async getCurrencies(){
        return Promise.race([
		    new Promise(resolve => setTimeout(() => resolve(false), 10000)),
	        GET('currencies').catch(() => ['USD'])
	    ])
    }

    static async getCurrencyPrices(){
        return Promise.race([
		    new Promise(resolve => setTimeout(() => resolve(false), 10000)),
	        GET('currencies/prices').catch(() => null)
	    ])
    }

    static async loadPriceTimelineData(){
	    const prices = await PriceService.getCurrencyPrices();
	    const yesterday = await PriceService.getTimeline(dateId(1));
	    const today = await PriceService.getTimeline();
	    return StoreService.get().dispatch(Actions.SET_PRICE_DATA, {prices, yesterday, today});
    }

    static async getTimeline(date = null){
        const query = date ? `?date=${date}` : '';
        return Promise.race([
		    new Promise(resolve => setTimeout(() => resolve(false), 10000)),
	        GET('prices/timeline'+query).catch(() => {})
	    ])
    }

    static getTotal(totals, displayCurrency, bypassDisplayToken, displayToken){
	    if(!displayCurrency) displayCurrency = StoreService.get().state.scatter.settings.displayCurrency;

	    if(!bypassDisplayToken && displayToken){
		    if(totals.hasOwnProperty(displayToken)) return totals[displayToken]
		    else {
			    const token = (displayToken instanceof Token ? displayToken : Token.fromUnique(displayToken)).clone();
			    token.amount = parseFloat(0).toFixed(token.decimals);
			    return token;
		    }
	    } else {
		    let total = 0;
		    Object.keys(StoreService.get().state.prices).map(tokenUnique => {
			    const balance = totals[tokenUnique];
			    if(balance){
				    const price = StoreService.get().state.prices[tokenUnique][displayCurrency];
				    const value = parseFloat(parseFloat(balance.amount) * parseFloat(price));
				    if(isNaN(value)) return;
				    total += value;
			    }
		    });

		    return Token.fromJson({
			    symbol:this.fiatSymbol(displayCurrency),
			    amount:total.toFixed(2),
		    })
	    }
    }

    static fiatSymbol(currency) {
    	if(!currency) currency = StoreService.get().state.scatter.settings.displayCurrency;
		switch(currency){
			case 'USD':
			case 'AUD':
			case 'CAD':
				return '$';
			case 'CNY':
			case 'JPY':
				return '¥';
			case 'EUR': return '€';
			case 'GBP': return '£';


			default: return currency;
		}
	}

}