import migrations from './migrations'
import models from './models'
import plugins from './plugins'
import services from './services'
import store from './store'
import util from './util'

const ScatterCore = {

	initialize(
		{
			blockchains,
			plugins:_plugins,
			nameParser = null
		},
		store,
		security,
		framework,
		eventListener,
		{
			socketService = null,
			hardwareService = null,
			publicToPrivate = null,
			signer = null,
		},
	){
		models.Blockchains.setBlockchains(blockchains, nameParser);
		plugins.PluginRepository.loadPlugins(_plugins);

		services.utility.StoreService.init(store);
		services.secure.Seeder.init(security);
		services.utility.Framework.init(framework);
		services.utility.EventService.init(eventListener);

		// Some wallets don't require dapp integration.
		if(socketService) services.utility.SocketService.init(socketService);

		// Some wallets aren't targeting hardware wallets.
		if(hardwareService) services.secure.HardwareService.init(hardwareService);

		// Optional method for providing extra ways to create private keys
		// from public keys. If only used for certain keys, return `false` on normal keys.
		// If it returns `null` or `PRIV_KEY` it will resolve that instead of falling back to internals.
		if(publicToPrivate) services.secure.KeyPairService.init(publicToPrivate);
		if(signer) services.secure.SigningService.init(signer);

		return true;
	},

	migrations,
	models,
	plugins,
	services,
	store,
	util,
}

export default ScatterCore;