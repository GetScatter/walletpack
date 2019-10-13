import {Blockchains} from "../../models/Blockchains";
import * as PluginTypes from "../PluginTypes";
import Plugin from "../Plugin";

/***
 * DO NOT INCLUDE
 * This is just an interface for quickly raising
 * new Scatter blockchain plugins
 */
export default class PluginInterface extends Plugin {
	constructor(){ super('blockchain_type', PluginTypes.BLOCKCHAIN_SUPPORT) }

	bip(){}

	defaultExplorer(){}

	accountFormatter(account){}

	returnableAccount(account){}

	contractPlaceholder(){}

	checkNetwork(network){}

	getEndorsedNetwork(){}

	isEndorsedNetwork(network){}

	async getChainId(network){}

	hasAccountActions(){}

	usesResources(){ return false; }

	accountsAreImported(){ return false; }

	hasFees(){ return false; }
	getFees(){ return null; }

	isValidRecipient(name){}

	privateToPublic(privateKey, prefix = null){}

	validPrivateKey(privateKey){}

	validPublicKey(publicKey, prefix = null){}

	randomPrivateKey(){}

	bufferToHexPrivate(buffer){}

	hexPrivateToBuffer(privateKey){}

	actionParticipants(payload){}

	hasUntouchableTokens(){ return false; }

	async balanceFor(account, tokenAccount, symbol){}

	async balancesFor(account, tokens){}

	defaultDecimals(){}

	defaultToken(){}

	async signerWithPopup(payload, account, rejector){}

	async transfer({account, to, amount, contract, symbol, memo, promptForSignature = true}){}

	async signer(payload, publicKey, arbitrary = false, isHash = false){}

	async requestParser(payload, network){}
}