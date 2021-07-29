// This script file simply outputs the version in the package.json.
// It is used as a helper by the continuous integration
const path = require('path')

const ver = require(path.join(__dirname, '../package.json')).version

// We need the version from package.json solely for identifying the builds.
// Electron builder, however, which is building them, simply decides to snip
// the "+"-part for our nightlies. So we have to do the same so the workflow
// doesn't fail and, by the way, electron-builder: WHY THE F***?
console.log(ver.indexOf('+') > -1 ? ver.split('+')[0] : ver)
