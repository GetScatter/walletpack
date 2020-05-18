const fs = require('fs');
const path = require('path');
const rimraf = require("rimraf");

const paths = __dirname.split(path.sep);
const parent = paths[paths.length-2];

if(parent === 'packages') return;

try {
	rimraf.sync("./__tests__");
	const files = fs.readdirSync(`./dist`);
	files.map(file => {
		if(fs.existsSync(`./${file}`)) rimraf.sync(`./${file}`);
		fs.renameSync(`./dist/${file}`, `./${file}`);
	})
	rimraf.sync("./dist");
	rimraf.sync("./lib");
} catch(e){
	console.error('Walletpack prepare.js error', e);
}
