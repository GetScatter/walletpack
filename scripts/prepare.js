const fs = require('fs');
const path = require('path');
const rimraf = require("rimraf");

const paths = __dirname.split(path.sep);
const parent = paths[paths.length-2];

let usingDist = false;
if(parent === 'node_modules') {
	rimraf.sync("./__tests__");
	const files = fs.readdirSync(`./${usingDist ? 'dist' : 'lib'}`);
	files.map(file => {
		if(fs.existsSync(`./${file}`)) rimraf.sync(`./${file}`);
		fs.renameSync(`./${usingDist ? 'dist' : 'lib'}/${file}`, `./${file}`);
	})
	// rimraf.sync(`./${!usingDist ? 'dist' : 'lib'}`);
}