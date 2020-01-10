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

	/***
	 * BIP is the path on a device such as a ledger (HD wallet).
	 * EXAMPLE: return `44'/0'/0'/0/`
	 */
	bip(){}

	/***
	 * If there is an internal cache, this method being called should clear it.
	 */
	bustCache(){}

	/***
	 * Explorer is an object that points to a web-interface block explorer.
	 * {x} is used as a placeholder for an account/txid/block_id.
	 * EXAMPLE:
	 {
		"name":"EXPLORER NAME",
		"account":"https://explorer.com/account/{x}",
		"transaction":"https://explorer.com/transaction/{x}",
		"block":"https://explorer.com/block/{x}"
	}
	 */
	defaultExplorer(){}

	/***
	 * Account formatter turns an `Account` model into a string which is used as the recipient of transactions.
	 * For instance in EOSIO blockchains the formatter would return `account.name`, but in Ethereum blockchains it would return
	 * `account.publicKey` which denotes the address instead of a name.
	 */
	accountFormatter(account){}

	/***
	 * Returnable account is a POJO that is returned to interacting applications.
	 * For instance, in EOSIO blockchains a name is required, however in Ethereum blockchains only a publicKey/address is required.
	 */
	returnableAccount(account){}

	/***
	 * This is a UI helper which defines what a placeholder value for a contract might be.
	 * For instance in Ethereum blockchains it might be `0x...`, while in EOSIO blockchains it might be `eosio.token`
	 */
	contractPlaceholder(){}

	/***
	 * Check network simply checks the availability/connectivity of a `Network`.
	 * This should either resolve or timeout after 2-4 seconds.
	 */
	checkNetwork(network){}

	/***
	 * An endorsed network is simply a "default" network hardcoded into the plugin, providing an absolute fallback
	 * for a node connection.
	 * THIS MUST RETURN A NETWORK CLASS
	 * EXAMPLE:
	 return new Network('EOS Mainnet', 'https', 'nodes.get-scatter.com', 443, Blockchains.EOSIO, MAINNET_CHAIN_ID)
	 */
	getEndorsedNetwork(){}

	/***
	 * Checks if a given network is the endorsed network (or a network matching the chainID)
	 * EXAMPLE:
	 return network.blockchain === Blockchains.EOSIO && network.chainId === MAINNET_CHAIN_ID;
	 */
	isEndorsedNetwork(network){}

	/***
	 * Fetches the chainID from the network (live) if available.
	 */
	async getChainId(network){}

	/***
	 * If specialized actions are required by the blockchain (like key management) this
	 * should return true, otherwise false.
	 * In the case of `true`, the plugin must also include an `accountActions` method
	 */
	hasAccountActions(){}

	// OPTIONAL, this is only required if `hasAccountActions` is `true`.
	// accountActions(account, callback){
	// 	return [
	// 		new AccountAction("unlink_account", () => callback(account)),
	// 		new AccountAction("change_permissions", () => callback(account), true),
	// 	];
	// }

	/***
	 * This might need to be re-designed to be dynamic, however this designates a
	 * blockchain as using resources like CPU/NET/RAM on EOSIO blockchains.
	 * If this is true, then `getResourcesFor(account)`, `needsResources(account)` and `addResources(account)` must also be included.
	 * For examples check the EOSIO plugin.
	 */
	usesResources(){ return false; }

	/***
	 * Accounts are sometimes required to be created or imported before being available (such is the case in EOSIO blockchains).
	 * If this is set to false, a dummy account will always be created using the publicKey/address. If not, then an account creation
	 * process will need to be created on the front-end which will require UI work.
	 */
	accountsAreImported(){ return false; }

	/***
	 * Should check whether a string account_name/address is a valid recipient.
	 */
	isValidRecipient(name){}

	/***
	 * Converts a private key to a public key
	 */
	privateToPublic(privateKey){}

	/***
	 * Checks whether a private key is valid
	 */
	validPrivateKey(privateKey){}

	/***
	 * Checks whether a public key is valid
	 */
	validPublicKey(publicKey){}

	/***
	 * Generates a random private key
	 * NOTE: This isn't used in Scatter, as we use buffer keys generated elsewhere.
	 */
	randomPrivateKey(){}

	/***
	 * Converts a byte buffer into a hex private key.
	 */
	bufferToHexPrivate(buffer){}

	/***
	 * Converts a hex private key into a byte buffer.
	 */
	hexPrivateToBuffer(privateKey){}

	/***
	 * Takes a transaction payload and returns a flat array of participants.
	 * EXAMPLES:
	 * EOSIO: ['testaccount@active']
	 * ETHEREUM: ['0x....']
	 */
	actionParticipants(payload){}

	/***
	 * Untouchable tokens are things like staked tokens on the system level.
	 * If a blockchain has untouchable (un-usable/un-transferable) tokens, then a `async untouchableBalance(account)` method
	 * must also be provided which returns an array of `Token` class.
	 */
	hasUntouchableTokens(){ return false; }

	/***
	 * Gets a single token's balance.
	 * Returns a Token class where `token.amount` is the balance.
	 */
	async balanceFor(account, token){}

	/***
	 * Gets an array of token's values.
	 * The `tokens` param might also be omitted which would mean to grab "all available tokens for an account".
	 * Returns an array of Token class.
	 */
	async balancesFor(account, tokens = null){}

	/***
	 * The default decimal count for tokens on this blockchain.
	 * Returns an integer.
	 */
	defaultDecimals(){}

	/***
	 * The default token for this blockchain.
	 * Returns a Token class.
	 */
	defaultToken(){}

	/***
	 * This is usually used internally inside of your walletpack plugin.
	 * Simply takes a payload and converts it into a request that signing popups understand.
	 * Check one of the existing plugins for the structures.
	 * EXAMPLE:
	 payload.messages = [...];
	 payload.identityKey = StoreService.get().state.scatter.keychain.identities[0].publicKey;
	 payload.participants = [account];
	 payload.network = account.network();
	 payload.origin = 'Scatter';
	 const request = {
				payload,
				origin:payload.origin,
				blockchain:'YOUR BLOCKCHAIN',
				requiredFields:{},
				type:Actions.SIGN,
				id:1,
			};
	 */
	async signerWithPopup(payload, account, rejector){}

	/***
	 * Creates a token transfer. Should use the signerWithPopup above to
	 * create a popup which the users has to sign.
	 * This might also be requested to be bypassed sometimes with the `prompForSignature = false` flag param.
	 */
	async transfer({account, to, amount, contract, symbol, memo, promptForSignature = true}){}

	/***
	 * Does the actual signing of a transaction.
	 * The `payload` will vary based on blockchain as it comes directly from their own libraries.
	 * The goal of this method is to turn a payload into a signed transaction though, so if that works in tests then
	 * it will work perfectly elsewhere.
	 * Notes:
	 * `arbitrary` and `isHash`: Sometimes blockchains change signing types based on whether a signature is signing a string (arbitrary) or a hash.
	 */
	async signer(payload, publicKey, arbitrary = false, isHash = false, privateKey = null){
		// IMPORTANT: This method should always start with these calls.
		// The `privateKey` is not ensured to be passed into this method.
		//if(!privateKey) privateKey = await KeyPairService.publicToPrivate(publicKey);
		//if (!privateKey) return;
	}

	/***
	 * The goal of this method is to parse a `payload` into something which UI's understand.
	 * Payload will differ based on blockchain, as it depends on the blockchain's actual javascript library.
	 * The `abi` parameter is needed for blockchains which don't have on-chain ABI stores (which is bad).
	 *
	 * The results of this method should be an array structured as follows:
	 [
	    // Many actions can be in the result as some blockchain support multiple actions within a transaction (batch).
		 {
		    // This is a key-value pair of the details of the transaction.
		    // These details will be displayed for the user in the signature prompt.
		    data:{
		        hello:'world',
		        value:1,
		        object:{...}
		    }
		    // The contract name, or in the case of a system token transfer then the account_name/address being sent to
			code,
			// Either the method name for a smart contract, or `transfer` for a system token transfer.
			type,
			// The authorizor of this transaction (account_name/address STRING)
			authorization
		 }
	 ]
	 */
	async requestParser(payload, network, abi = null){}
}
