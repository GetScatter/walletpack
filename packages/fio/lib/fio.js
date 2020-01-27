import Plugin from                  '@walletpack/core/plugins/Plugin';
import * as PluginTypes from        '@walletpack/core/plugins/PluginTypes';
import {Blockchains} from           '@walletpack/core/models/Blockchains'
import Network from                 '@walletpack/core/models/Network'
import Account from                 '@walletpack/core/models/Account'
import KeyPairService from          '@walletpack/core/services/secure/KeyPairService'
import ObjectHelpers from           '@walletpack/core/util/ObjectHelpers'
import * as Actions from            '@walletpack/core/models/api/ApiActions';
import * as StoreActions from       '@walletpack/core/store/constants'
import Token from                   "@walletpack/core/models/Token";
import AccountAction from           "@walletpack/core/models/AccountAction";
import AccountService from          "@walletpack/core/services/blockchain/AccountService";
import HistoricAction from          "@walletpack/core/models/histories/HistoricAction";
import StoreService from            "@walletpack/core/services/utility/StoreService";
import EventService from            "@walletpack/core/services/utility/EventService";
import SigningService from          "@walletpack/core/services/secure/SigningService";
import {POST} from                  "@walletpack/core/services/apis/BackendApiService";

import {Ecc as ecc, Api, Fio, RpcError} from '@fioprotocol/fiojs';
import {JsonRpc} from '@fioprotocol/fiojs/dist/tests/chain-jsonrpc';
import LightAPI from "../../eosio/lib/api";
import {base64ToBinary} from "@fioprotocol/fiojs/dist/chain-numeric";



export const TextEncoder = require('util') ? require('util').TextEncoder : require('text-encoding') ? require('text-encoding').TextEncoder : global.TextEncoder;
export const TextDecoder = require('util') ? require('util').TextDecoder : require('text-encoding') ? require('text-encoding').TextDecoder : global.TextDecoder;
export const encoderOptions = TextEncoder ? {textEncoder:new TextEncoder(), textDecoder:new TextDecoder()} : {};

const getApiInstance = rpc => {
	let params = rpc ? {rpc} : {};
	if(TextEncoder) params = Object.assign(params, encoderOptions)

	return new Api(params)
}

export const eosjsUtil = getApiInstance();

// TODO: TESTNET!
const MAINNET_CHAIN_ID = '4e46572250454b796d7296eec9e8896327ea82dd40f2cd74cf1b1d8ba90bcd77';

const fetchPostParams = (params) => ({ method:"POST", body:JSON.stringify(params) })
const getTableRows = (network, params) => fetch(`${network.fullhost()}/v1/chain/get_table_rows`, fetchPostParams(params)).then(x => x.json())
const getChainData = (network, route, params = {}) => fetch(`${network.fullhost()}/v1/chain/${route}`, fetchPostParams(params)).then(x => x.json())

const SCATTER_WALLET = 'scattertest@fiotestnet';


const EXPLORER = {
	"name":"Bloks",
	"account":"https://bloks.io/account/{x}",
	"transaction":"https://bloks.io/transaction/{x}",
	"block":"https://bloks.io/block/{x}"
};

export default class FIO extends Plugin {

	constructor(){ super('blockchain_type', PluginTypes.BLOCKCHAIN_SUPPORT) }

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

	/***
	 * An endorsed network is simply a "default" network hardcoded into the plugin, providing an absolute fallback
	 * for a node connection.
	 * THIS MUST RETURN A NETWORK CLASS
	 * EXAMPLE:
	 return new Network('EOS Mainnet', 'https', 'nodes.get-scatter.com', 443, Blockchains.EOSIO, MAINNET_CHAIN_ID)
	 */
	getEndorsedNetwork(){
		// TODO: TESTNET!
		return new Network('FIO Mainnet', 'https', 'fiotestnet.greymass.com', 443, Blockchains.FIO, MAINNET_CHAIN_ID)
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

	// TODO: Need to check FIO requirements
	isValidRecipient(name){ return /(^[a-z1-5.]{1}([a-z1-5.]{0,10}[a-z1-5])?$)/g.test(name); }

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

	async balanceFor(account){
		return getChainData(account.network(), 'get_fio_balance', {
			fio_public_key:account.publicKey
		}).then(x => parseFloat(x.balance / (10**this.defaultDecimals())).toFixed(this.defaultDecimals()));
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
				return {signatures, serializedTransaction:transaction.serializedTransaction}
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
			}
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
		api.getCachedAbi = async accountName => (await this.fetchAbis(network, [accountName]))[0]

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
			"fio_address": this.accountFormatter(account)
		}).then(x => x.fee).catch(() => null);
	}



	async transfer({account, to, amount, token}){

		amount = parseInt(amount * (10**token.decimals));

		const fee = await this.getFee(account, 'transfer_tokens_pub_key');
		if(!fee) throw 'Could not get fee';

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
		if(!fee) throw 'Could not get fee';

		return this.buildAndSign(account, [{
			account:'fio.address',
			name: 'addaddress',
			authorization: [{
				actor: Fio.accountHash(account.publicKey),
				permission: 'active',
			}],
			data: {
				fio_address: this.accountFormatter(account),
				public_addresses,
				max_fee: fee,
				tpid: SCATTER_WALLET,
				actor:Fio.accountHash(account.publicKey)
			},
		}])


	}

	async requestFunds(account, to){
		const fee = await this.getFee(account, 'new_funds_request');
		if(!fee) throw 'Could not get fee';

		return this.buildAndSign(account, [{
			account:'fio.reqobt',
			name: 'newfundsreq',
			authorization: [{
				actor: Fio.accountHash(account.publicKey),
				permission: 'active',
			}],
			data:{
				payer_fio_address: this.accountFormatter(account),
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
		if(!fee) throw 'Could not get fee';

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
		if(!fee) throw 'Could not get fee';

		return this.buildAndSign(account, [{
			account:'fio.address',
			name: 'renewaddress',
			authorization: [{
				actor: Fio.accountHash(account.publicKey),
				permission: 'active',
			}],
			data:{
				"fio_address": this.accountFormatter(account),
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

			////////////////////////////////////////////////////////////////////////////////
			// https://github.com/fioprotocol/fiojs/blob/master/src/chain-api.ts#L220
			////////////////////////////////////////////////////////////////////////////////
			const abis = await api.getTransactionAbis(transaction);
			transaction = {
				...transaction,
				context_free_actions: await api.serializeActions(transaction.context_free_actions || []),
				actions: await api.serializeActions(transaction.actions)
			};
			const serializedTransaction = api.serializeTransaction(transaction);
			const serializedContextFreeData = api.serializeContextFreeData(transaction.context_free_data);

			const requiredKeys = [account.publicKey];
			const signatures = await api.signatureProvider.sign({
				chainId: network.chainId,
				requiredKeys:[account.publicKey],
				serializedTransaction,
				serializedContextFreeData,
				abis,
			});

			if(!signatures) reject('No signatures provided');

			const arrayToHex = (data) => {
				let result = '';
				for (const x of data) result += ('00' + x.toString(16)).slice(-2);
				return result.toUpperCase();
			}

			const tx = {
				signatures:signatures.signatures,
				compression: 0,
				packed_context_free_data: arrayToHex(serializedContextFreeData || new Uint8Array(0)),
				packed_trx: arrayToHex(serializedTransaction),
			}

			const json = await getChainData(network, 'push_transaction', tx);
			if (json.processed && json.processed.except) {
				reject(RpcError(json));
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

		return parsed.actions;
	}
}
