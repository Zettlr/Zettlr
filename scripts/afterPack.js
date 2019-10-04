// This file will be run by electron-builder after packaging the app so that we
// can run the chmod-fix for the sanboxed chromium binary as suggested in
// https://github.com/Zettlr/Zettlr/issues/134.

const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const log = require('./console-colour')

const execAsync = promisify(exec)

exports.default = async function (context) {
  if (context.electronPlatformName !== 'linux') return

  log.info('Applying CHMOD patch to Linux packaging ...')

  // Get the full path to the linux unpacked chrome-sandbox
  let chromeSandboxBinary = path.resolve('./release/linux-unpacked/chrome-sandbox')

  log.info(`Running chmod 4755 ${chromeSandboxBinary}`)

  await execAsync(`chmod 4755 ${chromeSandboxBinary}`)
}
