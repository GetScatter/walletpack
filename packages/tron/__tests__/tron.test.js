'use strict';

import Account from "@walletpack/core/lib/models/Account";
import Network from "@walletpack/core/lib/models/Network";
import Keypair from "@walletpack/core/lib/models/Keypair";
import {Blockchains} from "@walletpack/core/lib/models/Blockchains";
import Token from "@walletpack/core/lib/models/Token";

const tron = new (require('../lib/tron').default)();

const keypair = Keypair.fromJson({
	name:'Testing key',
	// Just a known address with ANTE tokens.
	// publicKeys:[{blockchain:Blockchains.TRX, key:'TFKSq1F1RBhqmLjqktcRk74YpMDGCDQAeX'}],
	publicKeys:[{blockchain:Blockchains.TRX, key:'TF2quv1hTipcZ8FJ8FRsXXLSiJ1C15dqkW'}],
	privateKey:'...'
})

const network = Network.fromJson({
	"name":"Tron Mainnet",
	"host":"api.trongrid.io",
	"port":443,
	"protocol":"https",
	"chainId":"1"
})

const account = Account.fromJson({
	keypairUnique:keypair.unique(),
	networkUnique:network.unique(),
	publicKey:keypair.publicKeys[0].key,
});

// Testing with TRONbet's ANTE token:
// https://www.trontokens.org/token/trc20/TRONbet/TCN77KWWyUyi2A4Cu7vrh5dnmRyvUuME1E
const token = Token.fromJson({
	contract:'TCN77KWWyUyi2A4Cu7vrh5dnmRyvUuME1E',
	blockchain:Blockchains.TRX,
	symbol:'ANTE',
	decimals:6,
	chainId:network.chainId
})

// Removing need for StoreService's state
account.network = () => network;
account.sendable = () => account.publicKey;

describe('tron', () => {
    it('should be able to init', done => {
    	new Promise(async() => {
		    tron.init();
    		done();
	    })
    });

    it('should be able to get trc20 balances', done => {
    	new Promise(async() => {
			const balances = await tron.balancesFor(account, [token]);
			console.log('balances', balances);
    		done();
	    })
    });

    // it('should be able to parse trc20 transactions', done => {
    // 	new Promise(async() => {
	//
    // 		const json = `transaction {"transaction":{"transaction":{},"participants":["TF2quv1hTipcZ8FJ8FRsXXLSiJ1C15dqkW"]},"blockchain":"trx","network":{"id":"216730975559","name":"Tron Mainnet","protocol":"https","host":"api.trongrid.io","port":443,"path":"","blockchain":"trx","chainId":"1","fromOrigin":null,"createdAt":1571601826773,"token":null},"requiredFields":{}}`;
	//
	// 		const transfer = await tron.transfer({
	// 			account,
	// 			// Random address
	// 			to:'TU9Rpk8YqTea5oYx1h26a2P6vsGn8faRBt',
	// 			amount:'100',
	// 			token,
	// 			promptForSignature:false
	// 		});
	// 		console.log('transfer', transfer);
    // 		done();
	//     })
    // });

    // it('should be able to send trc20 tokens', done => {
    // 	new Promise(async() => {
	// 		const transfer = await tron.transfer({
	// 			account,
	// 			// Random address
	// 			to:'TU9Rpk8YqTea5oYx1h26a2P6vsGn8faRBt',
	// 			amount:'1',
	// 			token,
	// 			promptForSignature:false
	// 		});
	// 		console.log('transfer', transfer);
    // 		done();
	//     })
    // });
});
