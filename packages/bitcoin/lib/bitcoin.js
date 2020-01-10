import Plugin from                      '@walletpack/core/plugins/Plugin';
import * as PluginTypes from            '@walletpack/core/plugins/PluginTypes';
import {Blockchains} from               '@walletpack/core/models/Blockchains'
import Network from                     "@walletpack/core/models/Network";
import Token from                       "@walletpack/core/models/Token";
import ObjectHelpers from               "@walletpack/core/util/ObjectHelpers";
import KeyPairService from              "@walletpack/core/services/secure/KeyPairService";
import StoreService from                "@walletpack/core/services/utility/StoreService";
import * as Actions from                "@walletpack/core/models/api/ApiActions";
import {GET, POST} from                 "@walletpack/core/services/apis/BackendApiService";
import EventService from                "@walletpack/core/services/utility/EventService";
import SigningService from              "@walletpack/core/services/secure/SigningService";

const bitcoin = require('bitcoinjs-lib');


const SELECTED_CHAIN = 0;
const SELECTED_NETWORK = SELECTED_CHAIN === 0 ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;


const EXPLORER = {
	"name":"Blockcypher",
	"account":"https://live.blockcypher.com/btc/address/{x}",
	"transaction":"https://live.blockcypher.com/btc/tx/{x}",
	"block":"https://live.blockcypher.com/btc/block/{x}"
};

export default class BTC extends Plugin {

	constructor(){ super(Blockchains.BTC, PluginTypes.BLOCKCHAIN_SUPPORT) }

	bip(){ return `44'/0'/0'/0/`}
	bustCache(){ }
	defaultExplorer(){ return EXPLORER; }
	accountFormatter(account){ return `${account.publicKey}` }
	returnableAccount(account){ return { address:account.publicKey, blockchain:Blockchains.BTC }}

	contractPlaceholder(){ return '...'; }

	checkNetwork(network){
		return Promise.race([
			new Promise(resolve => setTimeout(() => resolve(null), 2000)),
			//TODO:
			new Promise(resolve => setTimeout(() => resolve(true), 10)),
		])
	}

	getEndorsedNetwork(){
		return new Network('Bitcoin Mainnet', 'https', 'btcnodes.get-scatter.com', 443, Blockchains.BTC, '1')
	}

	isEndorsedNetwork(network){
		const endorsedNetwork = this.getEndorsedNetwork();
		return network.blockchain === Blockchains.BTC && network.chainId === endorsedNetwork.chainId;
	}

	async getChainId(network){
		return 1;
	}

	usesResources(){ return false; }
	hasAccountActions(){ return false; }

	accountsAreImported(){ return false; }
	isValidRecipient(address){ return this.validPublicKey(address); }
	privateToPublic(privateKey){
		const pubkey = (() => {
			if(typeof privateKey === 'string') return bitcoin.ECPair.fromWIF(privateKey, SELECTED_NETWORK);
			else return bitcoin.ECPair.fromPrivateKey(privateKey, {network:SELECTED_NETWORK});
		})().publicKey;

		const { address } = bitcoin.payments.p2pkh({ pubkey, network:SELECTED_NETWORK })
		return address;
	}

	validPrivateKey(privateKey){
		return (typeof privateKey === 'string' ? privateKey : this.bufferToHexPrivate(privateKey)).length === 52;
	}

	validPublicKey(publicKey){
		return publicKey.length === 34;
	}

	bufferToHexPrivate(buffer){
		return bitcoin.ECPair.fromPrivateKey(Buffer.from(buffer), {network:SELECTED_NETWORK}).toWIF()
	}

	hexPrivateToBuffer(privateKey){
		return bitcoin.ECPair.fromWIF(privateKey, SELECTED_NETWORK).privateKey;
	}

	hasUntouchableTokens(){ return false; }

	async balanceFor(account){
		return GET(`btc/balance/${account.publicKey}`).then(res => {
			const token = this.defaultToken().clone();
			token.amount = parseInt(res[account.publicKey].final_balance) / 100000000;
			return token;
		});
	}

	async balancesFor(account){
		const balance = await this.balanceFor(account);
		return balance ? [balance] : [];
	}

	defaultDecimals(){ return 8; }
	defaultToken(){ return new Token(Blockchains.BTC, 'btc', 'BTC', 'BTC', this.defaultDecimals(), '1') }

	actionParticipants(payload){
		return ObjectHelpers.flatten(
			payload.messages
				.map(message => message.authorization)
		);
	}

	async transfer({account, to, amount, promptForSignature = true}){
		amount = amount * 100000000;

		try {
			return new Promise(async (resolve, reject) => {
				const txb = new bitcoin.TransactionBuilder(SELECTED_NETWORK);
				txb.setVersion(1);

				// The amount you are sending to the recipient.
				txb.addOutput(to, amount);

				// Calculating unspent inputs
				const utxos = await GET(`btc/unspent/${account.publicKey}`).then(x => x.unspent_outputs).catch(() => null);
				if(!utxos) return resolve({error:`There was a problem loading UTXOs for ${account.publicKey}`});

				let inputs = 0;
				for (let utx of utxos) {
					txb.addInput(utx.tx_hash_big_endian, utx.tx_output_n);
					inputs += utx.value;
					if (inputs >= amount) break;
				}


				// Calculating the fee
				let bestFee = await GET(`fees`).then(x => x.btc).catch(() => null);
				if(!bestFee) return resolve({error:`Couldn't get fee`});
				// Sats * bytes
				const fee = (txb.buildIncomplete().toHex().length * bestFee);

				// Returning unspent to sender.
				const change = inputs - (amount + fee);
				if(change < 0) return resolve({error:`Insufficient BTC: ${inputs}. (Most likely due to fees, you need to leave ${fee} worth)`});
				if (change) txb.addOutput(account.publicKey, change);

				const payload = { transaction:{from:account.publicKey, to, amount:amount / 100000000, fee:fee / 100000000}, unsigned:txb.buildIncomplete().toHex(),
					blockchain:Blockchains.BTC, network:account.network(), requiredFields:{}, abi:null };
				const signed = promptForSignature
					? await this.signerWithPopup(payload, account, x => resolve(x), null)
					: await SigningService.sign(account.network(), payload.unsigned, account.publicKey, false, false);

				if(!signed) return;

				await POST(`btc/pushtx`, {signed}).then(res => {
					if(res.indexOf('Transaction Submitted') > -1){
						resolve({txid:bitcoin.Transaction.fromHex(signed).getId()});
					} else {
						resolve({error:res});
					}
				}).catch(error => {
					console.error(error);
					resolve({error})
				});
			})
		} catch(e){
			console.error(e);
			resolve({error:e});
		}


	}

	async signer(transaction, publicKey, arbitrary = false, isHash = false, privateKey = null){
		try {
			// TODO: No hardware support yet.
			// if(account && KeyPairService.isHardware(publicKey))
			// 	return await HardwareService.sign(account, transaction);

			if(!privateKey) privateKey = await KeyPairService.publicToPrivate(publicKey);
			if(!privateKey) return;

			const key = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey), {network:SELECTED_NETWORK});
			const txb = bitcoin.TransactionBuilder.fromTransaction(bitcoin.Transaction.fromHex(transaction), SELECTED_NETWORK)

			if(Object.keys(txb.__PREV_TX_SET).length > 1){
				Object.keys(txb.__PREV_TX_SET).map((x,i) => {
					txb.sign(i, key);
				})
			} else txb.sign(0, key);
			return txb.build().toHex();
		} catch(e){
			console.error(e);
			return null;
		}
	}

	async signerWithPopup(payload, account, rejector, token = null){
		return new Promise(async resolve => {
			payload.messages = [{
				data:payload.transaction,
				code:payload.transaction.to,
				type:'transfer',
				authorization:payload.transaction.from
			}];
			payload.identityKey = StoreService.get().state.scatter.keychain.identities[0].publicKey;
			payload.participants = [account];
			payload.network = account.network();
			payload.origin = 'Scatter';
			const request = {
				payload,
				origin:payload.origin,
				blockchain:Blockchains.BTC,
				requiredFields:{},
				type:Actions.SIGN,
				id:1,
			};

			EventService.emit('popout', request).then( async ({result}) => {
				if(!result || (!result.accepted || false)) return rejector({error:'Could not get signature'});

				// TODO: No hardware
				// let signature = null;
				// if(KeyPairService.isHardware(account.publicKey)){
				// 	signature = await HardwareService.sign(account, payload);
				// } else signature = await this.signer(payload.transaction, account.publicKey, true);

				const signature = await SigningService.sign(payload.network, payload.unsigned, account.publicKey, true);
				if(!signature) return rejector({error:'Could not get signature'});
				resolve(signature);
			})
		})
	}

	async requestParser(transaction, network){
		throw new Error("Bitcoin not yet supported externally")
	}
}
