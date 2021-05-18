// This script file simply outputs the version in the package.json.
// It is used as a helper by the continuous integration
const path = require('path')
console.log(require(path.join(__dirname, '../package.json')).version)
