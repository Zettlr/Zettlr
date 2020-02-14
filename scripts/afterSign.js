// This script will be run by electron builder after
// the application has been signed. Here, we will
// notarize the app with the Apple API server. Then,
// gatekeeper will keep quiet when someone installs
// the app.

const { notarize } = require('electron-notarize')

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASS) {
    console.log('Skipping notarization: Either APPLE_ID or APPLE_ID_PASS is not in process.env.')
    return
  }

  // Retrieve the final application filename
  const appName = context.packager.appInfo.productFilename

  return notarize({
    appBundleId: 'com.zettlr.app',
    appPath: `${context.appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASS
  })
}
