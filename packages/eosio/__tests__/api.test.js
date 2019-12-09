'use strict';
const {assert} = require('chai');

require('isomorphic-fetch');
const LightAPI = require('../lib/api').default;
const Account = require('../../core/lib/models/Account').default;
const Network = require('../../core/lib/models/Network').default;

const network = Network.fromJson({
	blockchain:'eos',
	name:'EOS Mainnet',
	host:'nodes.get-scatter.com',
	port:443,
	protocol:'https',
	chainId:'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
});

const account = Account.fromJson({
	name:'ramdeathtest',
	authority:'active',
	publicKey:'',
	keypairUnique:'abcd',
	networkUnique:network.unique(),
});

describe('eosio', () => {

    it('should be able to fetch balances', done => {
        new Promise(async () => {
	        console.log(await LightAPI.balancesFor(account, network))
            done();
        })
    });
});
