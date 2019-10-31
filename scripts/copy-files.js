const fs = require('fs');
const path = require('path');

const packages = fs.readdirSync(`./packages`);
packages.map(pack => {
	const jsons = fs.readdirSync(`./packages/${pack}/lib`).filter(x => x.indexOf('.json') > -1);
	jsons.map(json => {
		fs.copyFileSync(`./packages/${pack}/lib/${json}`, `./packages/${pack}/dist/${json}`)
	})
})
