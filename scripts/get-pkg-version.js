// This script file simply outputs the version in the package.json.
// It is used as a helper by the make.sh-script to retrieve the version.
const path = require('path')
console.log(require(path.join(__dirname, '../source/package.json')).version)
