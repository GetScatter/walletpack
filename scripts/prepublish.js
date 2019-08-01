const fs = require('fs');
const packages = fs.readdirSync('./packages');
packages.map(pdir => fs.copyFileSync('./scripts/prepare.js', `./packages/${pdir}/prepare.js`));