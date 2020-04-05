import Plugin from                  '@walletpack/core/plugins/Plugin';
import * as PluginTypes from        '@walletpack/core/plugins/PluginTypes';
import {Blockchains} from           '@walletpack/core/models/Blockchains'
import Network from                 '@walletpack/core/models/Network'
import Account from                 '@walletpack/core/models/Account'
import KeyPairService from          '@walletpack/core/services/secure/KeyPairService'
import ObjectHelpers from           '@walletpack/core/util/ObjectHelpers'
import * as Actions from            '@walletpack/core/models/api/ApiActions';
import Token from                   "@walletpack/core/models/Token";
import StoreService from            "@walletpack/core/services/utility/StoreService";
import EventService from            "@walletpack/core/services/utility/EventService";
import SigningService from          "@walletpack/core/services/secure/SigningService";

import {Ecc as ecc, Api, Fio, RpcError, Numeric} from '@fioprotocol/fiojs';
const {base64ToBinary, arrayToHex} = Numeric;



export const TextEncoder = require('util') ? require('util').TextEncoder : require('text-encoding') ? require('text-encoding').TextEncoder : global.TextEncoder;
export const TextDecoder = require('util') ? require('util').TextDecoder : require('text-encoding') ? require('text-encoding').TextDecoder : global.TextDecoder;
export const encoderOptions = TextEncoder ? {textEncoder:new TextEncoder(), textDecoder:new TextDecoder()} : {};

const getApiInstance = rpc => {
	let params = rpc ? {rpc} : {};
	if(TextEncoder) params = Object.assign(params, encoderOptions)

	return new Api(params)
}

export const eosjsUtil = getApiInstance();

const MAINNET_CHAIN_ID = '21dcae42c0182200e93f954a074011f9048a7624c6fe81d3c9541a614a88bd1c';

const fetchPostParams = (params) => ({ method:"POST", body:JSON.stringify(params) });
const getChainData = (network, route, params = {}) => fetch(`${network.fullhost()}/v1/chain/${route}`, fetchPostParams(params)).then(x => x.json())

const SCATTER_WALLET = 'scatter@fiomembers';


const EXPLORER = {
	"name":"FIO Explorer",
	"account":"https://explorer.fioprotocol.io/account/{x}",
	"transaction":"https://explorer.fioprotocol.io/transaction/{x}",
	"block":"https://explorer.fioprotocol.io/block/{x}"
};

export default class FIO extends Plugin {

	constructor(){ super(Blockchains.FIO, PluginTypes.BLOCKCHAIN_SUPPORT) }

	bip(){ return `44'/235'/0'/0/` }
	bustCache(){}
	defaultExplorer(){ return EXPLORER; }
	accountFormatter(account){ return `${account.name}@${account.authority}` }
	returnableAccount(account){ return { name:account.name, authority:account.authority, publicKey:account.publicKey, blockchain:Blockchains.FIO } }
	contractPlaceholder(){ return '...'; }

	checkNetwork(network){
		return Promise.race([
			new Promise(resolve => setTimeout(() => resolve(null), 2000)),
			fetch(`${network.fullhost()}/v1/chain/get_info`).then(() => true).catch(() => false),
		])
	}

	getEndorsedNetwork(){
		return new Network('FIO Mainnet', 'https', 'fio.greymass.com', 443, Blockchains.FIO, MAINNET_CHAIN_ID)
	}

	isEndorsedNetwork(network){
		return network.blockchain === Blockchains.FIO && network.chainId === MAINNET_CHAIN_ID;
	}

	async getChainId(network){
		return getChainData(network, 'get_info', {}).then(x => x.chain_id || '').catch(() => '');
	}

	hasAccountActions(){ return false; }
	usesResources(){ return false; }
	accountsAreImported(){ return true; }
	async getImportableAccounts(keypair, network){
		let publicKey = keypair.publicKeys.find(x => x.blockchain === 'fio');
		if(publicKey){
			const fio_address = await this.getNames(network, publicKey.key).then(x => {
				if(!x.fio_addresses || !x.fio_addresses.length) return null;
				return x.fio_addresses[0].fio_address;
			}).catch(() => {
				return null;
			});
			return [
				Account.fromJson({
					keypairUnique: keypair.unique(),
					networkUnique: network.unique(),
					publicKey:publicKey.key,
					name:this.accountHash(publicKey.key),
					authority:'active',
					fio_address
				})
			]
		} else return [];
	}

	isValidRecipient(name){ return /(^(?:(?=.{3,64}$)[a-zA-Z0-9]{1}(?:(?!-{2,}))[a-zA-Z0-9-]*(?:(?<!-))@[a-zA-Z0-9]{1}(?:(?!-{2,}))[a-zA-Z0-9-]*(?:(?<!-))$))/g.test(name); }

	privateToPublic(privateKey){ try {
		return ecc.PrivateKey(privateKey).toPublic().toString('FIO');
	} catch(e){ return console.error(e); } }

	validPrivateKey(privateKey){ try {
		return privateKey.length >= 50 && ecc.isValidPrivate(privateKey);
	} catch(e){ return console.error(e); } }

	validPublicKey(publicKey, prefix = null){
		try {
			return ecc.PublicKey.fromStringOrThrow(publicKey, prefix ? prefix : 'FIO');
		} catch(e){
			return false;
		}
	}

	bufferToHexPrivate(buffer){
		return ecc.PrivateKey.fromBuffer(Buffer.from(buffer)).toString()
	}
	hexPrivateToBuffer(privateKey){
		return new ecc.PrivateKey(privateKey).toBuffer();
	}

	actionParticipants(payload){
		return ObjectHelpers.flatten(
			payload.messages
				.map(message => message.authorization
					.map(auth => `${auth.actor}@${auth.permission}`))
		);
	}

	hasUntouchableTokens(){ return false; }

	accountHash(publicKey){
		return Fio.accountHash(publicKey);
	}

	async balanceFor(account){
		return getChainData(account.network(), 'get_fio_balance', {
			fio_public_key:account.publicKey
		}).then(x => {
			if(!x.balance) return 0;
			return parseFloat(x.balance / (10**this.defaultDecimals())).toFixed(this.defaultDecimals())
		}).catch(() => 0);
	}

	async balancesFor(account){
		const tokens = [this.defaultToken()];
		return (await Promise.all(tokens.map(async token => {
			const t = token.clone();
			t.amount = await this.balanceFor(account, token);
			t.chainId = account.network().chainId;
			return t;
		})));
	}

	defaultDecimals(){ return 10; }
	defaultToken(){ return new Token(Blockchains.FIO, 'fio.token', 'FIO', 'FIO', this.defaultDecimals(), MAINNET_CHAIN_ID) }

	async signerWithPopup(payload, accounts, rejector){
		return new Promise(async resolve => {

			if(accounts instanceof Account){
				accounts = [accounts];
			}


			payload.messages = await this.requestParser(payload, Network.fromJson(accounts[0].network()));
			if(!payload.messages) return rejector({error:'Error re-parsing transaction buffer'});
			payload.identityKey = StoreService.get().state.scatter.keychain.identities[0].publicKey;
			payload.participants = accounts;
			payload.network = accounts[0].network();
			payload.origin = 'Scatter';
			const request = {
				payload,
				origin:payload.origin,
				blockchain:'eos',
				requiredFields:{},
				type:Actions.SIGN,
				id:1,
			}

			EventService.emit('popout', request).then( async ({result}) => {
				if(!result || (!result.accepted || false)) return rejector({error:'Could not get signature'});

				let signatures = [];
				for(let i = 0; i < accounts.length; i++){
					let account = accounts[i];
					signatures.push(await SigningService.sign(payload.network, KeyPairService.isHardware(account.publicKey) ? payload : {data:payload.buf}, account.publicKey, true, false));

					if(signatures.length !== i+1) return rejector({error:'Could not get signature'});
				}

				signatures = signatures.reduce((acc,x) => {
					if(!acc.includes(x)) acc.push(x);
					return acc;
				}, []);

				resolve(signatures);
			}, true);
		})
	}

	async signer(payload, publicKey, arbitrary = false, isHash = false, privateKey = null){
		if(!privateKey) privateKey = await KeyPairService.publicToPrivate(publicKey);
		if (!privateKey) return;

		if(typeof privateKey !== 'string') privateKey = this.bufferToHexPrivate(privateKey);

		if (arbitrary && isHash) return ecc.Signature.signHash(payload.data, privateKey).toString();
		return ecc.sign(Buffer.from(arbitrary ? payload.data : payload.buf, 'utf8'), privateKey);
	}








	signatureProvider(accounts, reject){
		const isSingleAccount = accounts instanceof Account;
		return {
			getAvailableKeys:async () => isSingleAccount ? [accounts.publicKey] : accounts.map(x => x.publicKey),
			sign:async (transaction) => this.signerWithPopup({ transaction }, accounts, reject).then(signatures => {
				return {signatures, serializedTransaction:transaction.serializedTransaction, serializedContextFreeData:transaction.serializedContextFreeData}
			})
		}
	}

	authorityProvider(accounts, reject){
		const isSingleAccount = accounts instanceof Account;
		return {
			getRequiredKeys:async () => isSingleAccount ? [accounts.publicKey] : accounts.map(x => x.publicKey),
		}
	}

	getSignableApi(accounts, reject, prompt = true, signatureProvider = null){
		const isSingleAccount = accounts instanceof Account;
		const network = isSingleAccount ? accounts.network() : accounts[0].network();

		const abiProvider = {
			getRawAbi: async (accountName) => {
				const {abi} = (await this.fetchAbis(network, [accountName]))[0];
				return { accountName, abi };
			},
		};

		let params = {
			abiProvider,
			authorityProvider:this.authorityProvider(accounts, reject),
			signatureProvider:signatureProvider ? signatureProvider : this.signatureProvider(accounts, reject),
			chainId:network.chainId
		};

		if(TextEncoder) {
			params.textEncoder = new TextEncoder();
			params.textDecoder = new TextDecoder();
		}

		const api = new Api(params);
		api.getCachedAbi = async accountName => (await this.fetchAbis(network, [accountName]))[0];

		return api;
	}


	async getNames(network, publicKey){
		return getChainData(network, 'get_fio_names', {
			fio_public_key:publicKey,
		})
	}


	async getPendingRequests(account, offset = 0){
		return getChainData(account.network(), 'get_pending_fio_requests', {
			fio_public_key: account.publicKey,
			limit:100,
			offset
		}).then(x => {
			if(x.hasOwnProperty('requests')) return x.requests;
			return [];
		})
	}

	async getFee(account, route){
		return getChainData(account.network(), 'get_fee', {
			"end_point": route,
			fio_address: account.fio_address
		}).then(x => x.fee).catch(() => null);
	}


	async recipientToSendable(network, recipient, blockchain = Blockchains.FIO, symbol = Blockchains.FIO, formatter = x => x){
		return getChainData(network, 'get_pub_address', {
			fio_address: recipient,
			"chain_code": blockchain.toUpperCase(),
			"token_code": symbol.toUpperCase()
		}).then(x => {
			if(!x.public_address) return null;
			return formatter(x.public_address);
		})
	}

	async transfer({account, to, amount, token}){

		amount = parseInt(amount * (10**token.decimals));

		const fee = await this.getFee(account, 'transfer_tokens_pub_key');
		if(fee === null) throw 'Could not get fee';

		return this.buildAndSign(account, [{
			account:token.contract,
			name: 'trnsfiopubky',
			authorization: [{
				actor: Fio.accountHash(account.publicKey),
				permission: 'active',
			}],
			data: {
				payee_public_key: to,
				amount,
				max_fee: fee,
				tpid:SCATTER_WALLET,
				actor: Fio.accountHash(account.publicKey)
			},
		}]);
	}

	async linkAddress(account, public_addresses){

		// Addresses array example
		/*
		[
			{
				"token_code": "BTC",
				"public_address": "1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs"
			},
			{
				"token_code": "ETH",
				"public_address": "0xab5801a7d398351b8be11c439e05c5b3259aec9b"
			}
		]
		 */
		const fee = await this.getFee(account, 'add_pub_address');
		if(fee === null) throw 'Could not get fee';

		return this.buildAndSign(account, [{
			account:'fio.address',
			name: 'addaddress',
			authorization: [{
				actor: Fio.accountHash(account.publicKey),
				permission: 'active',
			}],
			data: {
				fio_address: account.fio_address,
				public_addresses,
				max_fee: fee,
				tpid: SCATTER_WALLET,
				actor:Fio.accountHash(account.publicKey)
			},
		}])


	}

	async registerAddress(account, address){
		const fee = await this.getFee(account, 'register_fio_address');
		if(fee === null) throw 'Could not get fee';

		return this.buildAndSign(account, [{
			account:'fio.address',
			name: 'regaddress',
			authorization: [{
				actor: Fio.accountHash(account.publicKey),
				permission: 'active',
			}],
			data: {
				fio_address: address,
				owner_fio_public_key:account.publicKey,
				max_fee: fee,
				tpid: SCATTER_WALLET,
				actor:Fio.accountHash(account.publicKey)
			},
		}])


	}

	async requestFunds(account, to){
		const fee = await this.getFee(account, 'new_funds_request');
		if(fee === null) throw 'Could not get fee';

		return this.buildAndSign(account, [{
			account:'fio.reqobt',
			name: 'newfundsreq',
			authorization: [{
				actor: Fio.accountHash(account.publicKey),
				permission: 'active',
			}],
			data:{
				payer_fio_address: account.fio_address,
				payee_fio_address: to,
				content: "",
				max_fee: fee,
				tpid: SCATTER_WALLET,
				actor:Fio.accountHash(account.publicKey)
			},
		}])
	}

	async rejectFundsRequest(account, id){
		const fee = await this.getFee(account, 'reject_funds_request');
		if(fee === null) throw 'Could not get fee';

		return this.buildAndSign(account, [{
			account:'fio.reqobt',
			name: 'rejectfndreq',
			authorization: [{
				actor: Fio.accountHash(account.publicKey),
				permission: 'active',
			}],
			data:{
				fio_request_id: id,
				max_fee: fee,
				tpid: SCATTER_WALLET,
				actor:Fio.accountHash(account.publicKey)
			},
		}])
	}

	async renewAddress(account, id){
		const fee = await this.getFee(account, 'renew_fio_address');
		if(fee === null) throw 'Could not get fee';

		return this.buildAndSign(account, [{
			account:'fio.address',
			name: 'renewaddress',
			authorization: [{
				actor: Fio.accountHash(account.publicKey),
				permission: 'active',
			}],
			data:{
				fio_address: account.fio_address,
				max_fee: fee,
				tpid: SCATTER_WALLET,
				actor:Fio.accountHash(account.publicKey)
			},
		}])
	}






	async buildAndSign(account, actions){
		return new Promise(async (resolve, reject) => {
			const api = this.getSignableApi(account, reject, true);

			const network = account.network();

			const info = await getChainData(network, 'get_info');
			const blockInfo = await getChainData(network, 'get_block', {
				block_num_or_id:info.last_irreversible_block_num
			});
			const currentDate = new Date();
			const timePlusTen = currentDate.getTime() + 10000;
			const timeInISOString = (new Date(timePlusTen)).toISOString();
			const expiration = timeInISOString.substr(0, timeInISOString.length - 1);

			let transaction = {
				expiration,
				ref_block_num: blockInfo.block_num & 0xffff,
				ref_block_prefix: blockInfo.ref_block_prefix,
				actions
			};

			const result = await api.transact(transaction);
			if(!result || !result.signatures.length) return reject({error:'No signature'});

			const {signatures, serializedTransaction, serializedContextFreeData} = result;

			const tx = {
				signatures,
				compression: 0,
				packed_context_free_data: arrayToHex(serializedContextFreeData || new Uint8Array(0)),
				packed_trx: arrayToHex(serializedTransaction)
			};

			const json = await getChainData(network, 'push_transaction', tx);
			console.log('json', json);
			if (json.message) {
				reject({error:json.fields[0].error});
			}

			return resolve({transaction_id:json.transaction_id});
		})
	}






















	transactionContracts(transaction){
		return transaction.hasOwnProperty('actions')
			? ObjectHelpers.distinct(transaction.actions.map(action => action.account))
			: ObjectHelpers.distinct(transaction.abis.map(x => {
				if(x.hasOwnProperty('account_name')) return x.account_name;
				return x.accountName;
			}));
	}

	async fetchAbis(network, contracts){
		try {
			return await Promise.all(contracts.map(async account => {
				const chainAbi = await getChainData(network, `get_raw_abi`, {account_name:account}).catch(err => console.error(err)).then(x => x.abi);
				if(!chainAbi) return console.error(`Could not fetch ABIs for ${account}`);
				const rawAbi = base64ToBinary(chainAbi);
				const abi = eosjsUtil.rawAbiToJson(rawAbi);
				return { account, rawAbi, abi};
			}));
		} catch(e){
			console.error(e);
			return null;
		}
	}


	async requestParser(payload, network){
		const {transaction} = payload;

		const api = getApiInstance();

		const contracts = this.transactionContracts(transaction);
		const abis = await this.fetchAbis(network, contracts);
		abis.map(({account, rawAbi, abi}) => api.cachedAbis.set(account, { rawAbi, abi }));

		const buffer = Buffer.from(transaction.serializedTransaction, 'hex');
		const parsed = await api.deserializeTransactionWithActions(buffer);
		parsed.actions.map(x => {
			x.code = x.account;
			x.type = x.name;
		});

		const hexToUint8Array = (hex) => {
			if (typeof hex !== 'string') throw new Error('Expected string containing hex digits');
			if (hex.length % 2) throw new Error('Odd number of hex digits');
			const l = hex.length / 2;
			const result = new Uint8Array(l);
			for (let i = 0; i < l; ++i) {
				const x = parseInt(hex.substr(i * 2, 2), 16);
				if (Number.isNaN(x)) {
					throw new Error('Expected hex string');
				}
				result[i] = x;
			}
			return result;
		};

		payload.buf = Buffer.concat([
			Buffer.from(network.chainId, 'hex'),
			buffer,
			Buffer.from(
				transaction.serializedContextFreeData ?
					hexToUint8Array(ecc.sha256(transaction.serializedContextFreeData)) :
					new Uint8Array(32)
			),
		]);

		payload.transaction.parsed = Object.assign({}, parsed);
		payload.transaction.parsed.actions = await api.serializeActions(parsed.actions);
		delete payload.transaction.abis;

		const fiotransfer = parsed.actions.find(x => x.code === 'fio.token' && x.type === 'trnsfiopubky');
		if(fiotransfer){
			fiotransfer.type = 'transfer';
			fiotransfer.name = 'transfer';
			fiotransfer.data.amount = parseFloat(parseFloat(fiotransfer.data.amount / 10000000000).toFixed(this.defaultDecimals())) + ' FIO';
			fiotransfer.data.max_fee = parseFloat(parseFloat(fiotransfer.data.max_fee / 10000000000).toFixed(this.defaultDecimals())) + ' FIO';
			fiotransfer.data.to = await this.getNames(network, fiotransfer.data.payee_public_key).then(x => {
				if(!x.fio_addresses || !x.fio_addresses.length) return fiotransfer.data.payee_public_key;
				return x.fio_addresses[0].fio_address;
			}).catch(() => {
				return fiotransfer.data.payee_public_key;
			});
			delete fiotransfer.data.payee_public_key;
		}

		parsed.actions = parsed.actions.map(x => {
			if(x.data && x.data.tpid) delete x.data.tpid;
			return x;
		});

		return parsed.actions;
	}
}
