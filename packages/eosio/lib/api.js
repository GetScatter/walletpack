import Token from "@walletpack/core/models/Token";
import {Blockchains} from "@walletpack/core/models/Blockchains";


let networks, hosts;
let cache = {};

export default class LightAPI {

	static async cacheEndpointsAndNetworks(){
		return fetch(`https://endpoints.light.xeos.me/endpoints.json`).catch(() => null).then(x => x.json()).then(x => {
			hosts = Object.keys(x['api-endpoints']).reduce((acc, host) => {
				x['api-endpoints'][host].networks.map(network => {
					if(!acc[network]) acc[network] = host;
				});
				return acc;
			}, {});
			networks = Object.keys(x['networks']).reduce((acc, network) => {
				acc[x['networks'][network].chainid] = network;
				return acc;
			}, {});
			return true;
		});
	}

	static async getNetworks(){
		if(!networks) await LightAPI.cacheEndpointsAndNetworks();
		return networks;
	}

	static async networkString(network){
		const networks = await this.getNetworks();
		if(!networks) return null;
		return networks[network.chainId];
	}

	static async fetchBalances(account, network, parseResults){
		const networkString = await this.networkString(network);
		if(!networkString) return null;
		if(!hosts[networkString]) return null;

		if(cache[account.unique()]) return parseResults(cache[account.unique()]);

		return await Promise.race([
			// Maximum timeout for this request
			new Promise(resolve => setTimeout(() => resolve(null), 8000)),

			fetch(`${hosts[networkString]}/api/balances/${networkString}/${account.name}`).then(r => r.json()).then(res => {

				// Caching this response, and then removing it after 5 seconds.
				// cache[account.unique()] = res;
				// setTimeout(() => delete cache[account.unique()], 5000);

				return parseResults(res);
			}).catch(err => {
				console.log('err', err);
				return null;
			})
		])
	}

	static async balancesFor(account, network){
		const parseResults = res => {
			return res.balances.map(balance => {
				return Token.fromJson({
					blockchain:Blockchains.EOSIO,
					contract:balance.contract,
					symbol:balance.currency,
					name:balance.currency,
					amount:balance.amount,
					decimals:balance.decimals,
					chainId:network.chainId
				})
			});
		};

		return this.fetchBalances(account, network, parseResults);
	}

	static async getAccountsFromPublicKey(publicKey, network){
		const networkString = await this.networkString(network);
		if(!networkString) return null;
		if(!hosts[networkString]) return null;

		return await Promise.race([
			// Maximum timeout for this request
			new Promise(resolve => setTimeout(() => resolve(null), 5000)),

			fetch(`${hosts[networkString]}/api/key/${publicKey}`).then(r => r.json()).then(res => {
				if(!res[networkString]) return null;
				const rawAccounts = res[networkString].accounts;
				let accounts = [];
				Object.keys(rawAccounts).map(name => {
					rawAccounts[name]
						.filter(acc => acc.auth.keys.some(({pubkey}) => pubkey === publicKey))
						.map(acc => accounts.push({name, authority: acc.perm}))
				});

				return accounts;
			}).catch(err => {
				console.error('err', err);
				return null;
			})
		])
	}

}
