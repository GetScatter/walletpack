'use strict';
const {assert} = require('chai');

require('isomorphic-fetch');
const LightAPI = require('../lib/api').default;
const Account = require('../../core/lib/models/Account').default;
const Network = require('../../core/lib/models/Network').default;

const network = Network.fromJson({
	blockchain:'cyber',
	name:'CyberWay Mainnet',
	host:'scatter.cyberway.io',
	port:443,
	protocol:'https',
	chainId:'591c8aa5cade588b1ce045d26e5f2a162c52486262bd2d7abcb7fa18247e17ec',
});

// const account = Account.fromJson({
// 	name:'ramdeathtest',
// 	authority:'active',
// 	publicKey:'',
// 	keypairUnique:'abcd',
// 	networkUnique:network.unique(),
// });

describe('cyber', () => {

    it('should be able to fetch balances', done => {
        new Promise(async () => {

            done();
        })
    });
});
