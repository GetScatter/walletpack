const EXPORTS = {
	"presets": ["@babel/preset-env"],
	"plugins": []
};

if(process.env.WALLETPACK_TESTING){
	EXPORTS.plugins.push(["@babel/transform-async-to-generator"]);
	// This is used for tests, since the import path structures
	// are different for the packages internally.
	EXPORTS.plugins.push(["module-resolver", {
		"alias": {
			"^@walletpack/core/(.+)": ([, name]) => {
				// Catching absolute lib imports
				if(name.indexOf('lib') > -1) name = name.replace('lib/', '');
				// Prefixing includes
				return `./packages/core/lib/${name}`
			}
		}
	}])
} else {
	EXPORTS.plugins.push(["@babel/transform-runtime"]);
}

module.exports = EXPORTS;
