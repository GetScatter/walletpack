const fs = require('fs');
const path = require('path');
const rimraf = require("rimraf");


const packages = fs.readdirSync('./packages');
console.log(packages);

packages.map(pdir => {
	fs.copyFileSync('./prepare.js', `./packages/${pdir}/prepare.js`);
});