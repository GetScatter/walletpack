# WalletPack

This is a wallet building SDK which takes care of all of the heavy lifting for creating blockchain wallets.

Currently being used in Scatter Desktop, Scatter Mobile, and Scatter Bridge.



## Setup

Install the core plus any blockchains you want to support
```
npm i -S @walletpack/core @walletpack/eosio @walletpack/ethereum @walletpack/bitcoin @walletpack/tron
```

### Call initialize first.

```js

import WalletPack from '@walletpack/core';

const eventListener = (type, data) => {
    console.log('event', type, data);
    switch(type){
        case 'popout': break;
        case 'firewalled': break;
        case 'no_certs': break;
    }
	console.log('event', type, data);
};
WalletPack.initialize(
    // --------------------------------------------
    // blockchains & blockchain plugins
	{
		blockchains:{
			EOSIO:'eos',
			ETH:'eth',
			// TRX:'trx',
			BTC:'btc',
		},
		plugins:[
			require('@walletpack/eosio').default,
			require('@walletpack/ethereum').default,
			// require('@walletpack/tron').default,
			require('@walletpack/bitcoin').default,
		]
	},
    // --------------------------------------------
    // store
	{
        state:{},
        commit:(key, val) => {},
        dispatch:(key, val) => {}
    },
    // --------------------------------------------
    // security
	{
		getSalt:() => '',
		get:() => () => '',
		set:(_seed) => () => '',
		clear:() => () => '',
	},
    // --------------------------------------------
    // framework
	{
		getVersion:WebHelpers.getVersion,
		pushNotification:WebHelpers.pushNotificationMethod(),
	},
    // --------------------------------------------
    // events
	eventListener,
    // --------------------------------------------
    // optionals
	{
	    // Enables websocket based 3rd party app support
		socketService:SocketService,

		// Allows you to override private key provision with
		// external services
		publicToPrivate:async publicKey => {
			return false;
		},
		// Allows you to have custom signers instead of key provision, 
		// which means you can sign on completely separate processes instead
		// of giving the private key to the renderer process
		signer:async (network, publicKey, payload, arbitrary = false, isHash = false) => {
		  return sign(...);
		}
	}
);
```




## Store/state requirements
These properties and methods must be available on the injected store manager.


```js
store:{
    state:{
        dappLogos:{},
        dappData:{},
        resources:{},
        scatter:null,
        balances:{},
        prices:{},
        history:[],
        priceData:{},
    },
    commit:(key, val) => {},
    dispatch:(key, value){},
}
```


#### dispatch
This is an action handler that pre-processing commits to the state.
[An example of these are here](https://github.com/GetScatter/ScatterDesktop/blob/core-extrapolation/src/store/actions.js)
(_Some of these could possibly be put into the core library_)

#### commit
**must be synchronous**
This is the actual commiter to the state which changes state values.
[An example of these are here](https://github.com/GetScatter/ScatterDesktop/blob/core-extrapolation/src/store/mutations.js)




----------------------------

## Reaching blockchain plugins

`/src/plugins/defaults/interface.js` has common methods between each blockchain plugin.
Instead of tapping directly into the plugin itself you can grab the singleton plugin based on the blockchain required and
then process methods on it.

```js
import PluginRepository from ...
PluginRepository.plugin(Blockchains.EOSIO).method(...);
```


----------------------------

<br>
<br>
<br>
<br>

Some constants for the docs below:
- `$API = "https://api.get-scatter.com/v1/"`

## Services breakdown
These are some of the important services in Scatter, and brief explanations of what they do and how to use them.

**Note: All ScatterCore methods are static**.


----------------------------

### ApiService

This service handles all of the incoming messages from external applications.
You should never actually have to handle this service manually in the application, as all of the methods will be called
from the messages in the SocketService you provide.

The flow is as follows.

`app -> socket -> api handler -> openPopOut -> api handler -> socket -> app`

[To see a live example of this happening see this](https://github.com/GetScatter/ScatterDesktop/blob/core-extrapolation/src/services/SocketService.js#L24)
[And check out also the low level socket service](https://github.com/GetScatter/ScatterDesktop/blob/core-extrapolation/electron.js#L339)




----------------------------

### PriceService
This service (and the price data) keeps itself up to date using a recursive timeout. You should never have to
fetch prices manually.

#### `PriceService.getCurrencies()`
This fetches the available fiat currency ticker symbols from `$API/currencies`.
- Example result: `["USD","EUR","CNY","GBP","JPY","CAD","CHF","AUD"]`

#### `PriceService.getCurrencyPrices()`
This fetches the available fiat currency prices from `$API/currencies/prices`. These are prices in relation to USD.
- Example result: `{"USD":1,"EUR":0.887901,"CNY":6.877801,"GBP":0.799055,"JPY":107.956006,"CAD":1.304397,"CHF":0.98455,"AUD":1.42273}`

#### `PriceService.loadPriceTimelineData()`
This fetches a timeline of price data from `$API/prices/timeline` for the past 24 hours.
It will automatically insert the returned data into the `state` under `priceData` in the form of `{prices, yesterday, today}`

#### `PriceService.getTotal(totals, displayCurrency, bypassDisplayToken, displayToken)`
Returns formatted totals based on the entire balances inside of a user's accounts.

```js
// Return format
----------------------------
return Token.fromJson({
    symbol:this.fiatSymbol(displayCurrency),
    amount:total.toFixed(2),
})

// Examples
-----------------------------
// Returns the total fiat balance
PriceService.getTotal(BalanceService.totalBalances(false).totals)

// Returns the total token balance
return PriceService.getTotal(BalanceService.totalBalances(false).totals, null, false, state.scatter.settings.displayToken);
```

#### `PriceService.fiatSymbol(currency = StoreService.get().state.scatter.settings.displayCurrency)`
Returns an ascii currency sign ($/¥/€/£) instead of a ticker (USD/CNY/EUR/etc).



----------------------------


### AppsService
This service fills itself using the SingletonService which is instantiated once when opening a Scatter wallet.
All app data is available on `state.dappData`

#### `AppsService.getAppData(origin)`
Returns formatted data based on the applink (origin/fqdn) of the apps trying to interact with Scatter.
If the app doesn't exist on the `state.dappData` then it will return a formatted result regardless.

```js
// Return structure
{
    applink:origin,
    type:'',
    name:origin,
    description:'',
    logo:'',
    url:'',
}
```

#### `AppsService.categories(selectedCategory = null)`
Returns a list of categories available based on the `state.dappData`.
This is a simple helper method that loops over the dapps and aggregates the `.type` param.

#### `AppsService.appsByCategory(selectedCategory = null)`
Returns all the apps available with a given category.

#### `AppsService.appsByTerm(terms)`
Returns all the apps available with a given search terms.

#### `AppsService.linkedApps(terms = '', categoryFilter = null)`
Returns all of the apps that are **linked** in the user's Scatter.
These are apps that the user already has permissions for (My Apps).


----------------------------


### PermissionService
This service handles everything to do with application permissions, including whitelists.
A lot of the handling is internal for the library but below are some methods that will need to be
integrated into components.

#### `PermissionService.removeAllPermissions()`
Removes every single permission that the user has. This includes all application permissions and whitelists.

#### `PermissionService.removeAllPermissionsFor(origin)`
Removes every permission for a given origin/applink

#### `PermissionService.removePermission(permission)`
Removes a given permission





