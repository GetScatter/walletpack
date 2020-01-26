'use strict';
import EventService from "../../core/lib/services/utility/EventService";

const {Ecc, Fio} = require('@fioprotocol/fiojs');
import Account from "../../core/lib/models/Account";
import {Blockchains} from "../../core/lib/models/Blockchains";
import SigningService from "../../core/lib/services/secure/SigningService";
import Keypair from "../../core/lib/models/Keypair";
import PluginRepository from "../../core/lib/plugins/PluginRepository";
import StoreService from "../../core/lib/services/utility/StoreService";
import KeyPairService from "../../core/lib/services/secure/KeyPairService";

const {assert} = require('chai');
require('isomorphic-fetch');
const fio = new (require('../lib/fio').default)();

const network = fio.getEndorsedNetwork();

const TEST_KEY = '5KAztr7sB1JHG2UUEgqk9pPnRZivXVBxkxdAtaybsAAQcEJEgVW';
const TEST_PUBLIC_KEY = 'FIO5cz5Jcyx6xugRuYxxcy2CLFwjU7SpyuYPQnNrewbYS9zaVtt5s';
let bufKey;

const KEYPAIR = Keypair.fromJson({
	privateKey:TEST_KEY,
	blockchains:[Blockchains.FIO],
	publicKeys:[{key:TEST_PUBLIC_KEY, blockchain:Blockchains.FIO}]
})

KEYPAIR.network = fio.getEndorsedNetwork;

// Overriding signer to include private key getter.
SigningService.init(async (network, publicKey, payload, arbitrary = false, isHash = false) => {
	return fio.signer(payload, TEST_PUBLIC_KEY, arbitrary, isHash, TEST_KEY);
});

// Catching popout events
EventService.init(async (type, data) => {
	// console.log('event', type, data);
	console.log('messages', data.payload.messages)
	return {result:{accepted:true}};
});

// Overriding plugin repo
PluginRepository.plugin = () => fio;

// Loading fake identity (for signerWithPopup)
// StoreService.get().state.scatter.keychain.identities[0].publicKey
StoreService.init({
	state:{
		scatter:{
			keychain:{
				identities:[
					{
						publicKey:TEST_PUBLIC_KEY,
					}
				]
			}
		}
	}
});

// Turning off hardware checking (relies on StoreService)
KeyPairService.isHardware = () => false;

describe('fio', () => {

    it('should check bip', done => {
        new Promise(async () => {
			assert(fio.bip() === `44'/235'/0'/0/`, 'Bip was not correct');
            done();
        })
    });

    it('should check return a default explorer', done => {
        new Promise(async () => {
        	const explorer = fio.defaultExplorer();
			assert(explorer, 'Bad explorer');
			assert(explorer.hasOwnProperty('name'), 'Bad explorer name');
            done();
        })
    });

    it('should check return a properly formatted account', done => {
        new Promise(async () => {
        	const account = Account.fromJson({
		        name:'test',
		        authority:'active'
	        })
			assert(fio.accountFormatter(account) === `test@active`, 'Bad account formatter');
            done();
        })
    });

    it('should get the endorsed network', done => {
        new Promise(async () => {
        	const network = fio.getEndorsedNetwork();
			assert(network && network.blockchain === Blockchains.FIO, 'Bad endorsed network');
			assert(fio.isEndorsedNetwork(network), 'Bad endorsed network check');
            done();
        })
    });

    it('should check a network connection', done => {
        new Promise(async () => {
        	const network = fio.getEndorsedNetwork();
			assert(await fio.checkNetwork(network), 'Bad network connection');
            done();
        })
    });

    it('should get a chain ID', done => {
        new Promise(async () => {
        	const network = fio.getEndorsedNetwork();
        	const chainId = await fio.getChainId(network);
			assert(network.chainId === chainId, 'Bad chain id getter');
            done();
        })
    });

    it('should convert a private key to a public key', done => {
        new Promise(async () => {
			assert(fio.privateToPublic(TEST_KEY) === TEST_PUBLIC_KEY, 'Bad public key');
			assert(fio.privateToPublic('5KAstr7sB1JHG2UUEgqk9pPnRZivXVBxkxdAtaybsAAQcEJEgVW') !== TEST_PUBLIC_KEY, 'Mismatched public key');
            done();
        })
    });

    it('should check if a private key is valid', done => {
        new Promise(async () => {
			assert(fio.validPrivateKey(TEST_KEY), 'Bad private key checker');
			assert(!fio.validPrivateKey('5KAstr7sB1JHG2UUEgqk9pPnRZivXVBxkxdAtaybsAAQcEJEg'), 'Bad private key checker');
            done();
        })
    });

    it('should check if a public key is valid', done => {
        new Promise(async () => {
			assert(fio.validPublicKey(TEST_PUBLIC_KEY), 'Bad public key checker [1]');
			assert(!fio.validPublicKey('FIO5cz5Jcyx6xugRuYxxcy2CLFwjU7SpyuYPQnNrewbYS9z'), 'Bad public key checker');
            done();
        })
    });

    it('should convert a private key to a buffer', done => {
        new Promise(async () => {
        	bufKey = fio.hexPrivateToBuffer(TEST_KEY);
			assert(Buffer.isBuffer(bufKey), 'Bad buffer key');
            done();
        })
    });

    it('should convert a buffer to a private key', done => {
        new Promise(async () => {
			assert(fio.bufferToHexPrivate(bufKey) === TEST_KEY, 'Bad buffer key conversion');
            done();
        })
    });

    it('should be able to sign', done => {
        new Promise(async () => {
        	const network = fio.getEndorsedNetwork();
	        const data = Ecc.sha256('1234');
        	const signature = await fio.signer({data}, TEST_PUBLIC_KEY, true, true, TEST_KEY);
			assert(signature && Ecc.recover(signature, data), 'Bad signature');
            done();
        })
    });

    it('should be able to transfer tokens', done => {
        new Promise(async () => {
        	const token = fio.defaultToken();
        	token.amount = 1;

        	const account = Account.fromJson({
		        name:Fio.accountHash(TEST_PUBLIC_KEY),
		        authority:'active',
	        });

	        // OVERRIDING NETWORK GETTER
	        account.blockchain = () => Blockchains.FIO;
	        account.network = () => network;
	        account.keypair = () => KEYPAIR;

        	const transferred = await fio.transfer({
				account,
		        to:Fio.accountHash('FIO6smr7ThQMWYBHzEvkzTZdxNNmUwxqh2VXdXZdDdzYHgakgqCeb'),
		        amount:1,
		        token,
		        memo:'walletpack testing',
		        promptForSignature:false,
	        });

        	console.log('transferred', JSON.stringify(transferred, null, 4));

        	// const network = fio.getEndorsedNetwork();
	        // const data = Ecc.sha256('1234');
        	// const signature = await fio.signer({data}, TEST_PUBLIC_KEY, true, true, TEST_KEY);
			// assert(signature && Ecc.recover(signature, data), 'Bad signature');
            done();
        })
    });

});
