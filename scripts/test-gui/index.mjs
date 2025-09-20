/**
 * This file is used to prepare a testing environment, that is: Creating
 * a brand new config that is solely used for testing purposes, and prepare
 * a simple directory structure that demonstrates all capabilities of Zettlr.
 *
 * IMPORTANT: What we need to take care of is to keep all the configuration
 * examples intact! So whenever we change something in the directory loader or
 * config, we need to adapt here as well. It will always work easily, but we
 * might miss out some features/potential bugs.
 */

// SUPPORTED COMMAND LINE ARGUMENTS
// * --clean: Remove and recreate the test files. Adds a custom config.
// * --no-config: Must be used in conjunction with --clean, does not create a
//   config file.

import { promises as fs } from 'fs'
import path from 'path'
import { rimraf } from 'rimraf'
import { spawn } from 'child_process'

import makeConfig from './make-config.mjs'
import copyFolder from './copy-folder.mjs'

import { info, error, success, verbose, warn } from '../console-colour.mjs'

const __dirname = process.platform === 'win32'
  ? path.dirname(decodeURI(import.meta.url.substring(8))) // file:///C:/...
  : path.dirname(decodeURI(import.meta.url.substring(7))) // file:///root/...

const TEST_DIRECTORY = path.join(__dirname, '../../resources/test')
const CONF_DIRECTORY = path.join(__dirname, '../../resources/test-cfg')
const CONFIG_FILE = path.join(__dirname, '../../resources/test-cfg/config.json')

// Test if we should nuke the old test environment, or simply start
// with the old one (useful for testing persistence of settings)
if (process.argv.includes('--clean')) {
  let argv = process.argv.slice(2)
  argv.splice(argv.indexOf('--clean'), 1)
  info('☢️ Nuking test environment ...')
  prepareEnvironment(argv).then(() => {
    console.log('') // Empty line
    startApp(argv)
  }).catch(err => {
    error(err.message)
    // Add a console.error with the full error for stack trace, etc.
    console.error(err)
  })
} else {
  // Start the app retaining the directory structure.
  info('Starting app with old test environment ...')
  startApp(process.argv.slice(2))
}

/**
 * Prepares the environment for a fresh start
 *
 * @param   {string[]}  argv  The arguments provided
 */
async function prepareEnvironment (argv) {
  // First, remove the ./resources/test folder
  try {
    await fs.lstat(TEST_DIRECTORY)
    await rimraf(TEST_DIRECTORY)
    success('Removed the old testing directory.')
  } catch (e) {
    // Nothing to do
    verbose('No old testing directory found.')
  }

  // Second, same but for the data directory
  try {
    await fs.lstat(CONF_DIRECTORY)
    await rimraf(CONF_DIRECTORY)
    success('Removed the old data directory.')
  } catch (e) {
    // Nothing to do
    verbose('No data directory found.')
  }

  // Fill in the file structure
  info('Copying over testing directory into the resources folder ...')
  const roots = await copyFolder(TEST_DIRECTORY)
  success('Done copying the testing files!')
  await fs.mkdir(CONF_DIRECTORY, { recursive: true })
  success('Created app data directory!')

  // Now it's time to create the new config file. But only if the flag
  // `--no-config` is not given
  if (argv.includes('--no-config')) {
    info('Not creating config file.')
    argv.splice(argv.indexOf('--no-config'), 1)
    return
  }

  info('Creating new configuration file from test-config.yml ...')
  let cfg = await makeConfig()
  cfg.openPaths = roots

  // We also want the dialogs to start at the test directory for easier navigation
  cfg.dialogPaths = {
    askFileDialog: TEST_DIRECTORY,
    askDirDialog: TEST_DIRECTORY,
    askLangFileDialog: TEST_DIRECTORY
  }

  // Finally, write the config file
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg))
  success(`Written file ${CONFIG_FILE}.`)
}

/**
 * Starts the application in develop mode
 *
 * @param   {string[]}  argv  The arguments provided (sans arguments required for this script itself)
 */
function startApp (argv = []) {
  info('Starting Zettlr with custom configuration ...')

  if (argv.length > 0) {
    warn('Supplying additional arguments to process: [' + argv.join(', ') + ']')
  }

  // Make sure the correct command is run
  const command = (process.platform === 'win32') ? '.\\node_modules\\.bin\\electron-forge.cmd' : 'electron-forge'
  // Arguments for electron-forge
  const forgeArgs = [ 'start', '--', `--data-dir="${CONF_DIRECTORY}"`, ...argv ]
  // Spawn's options: Use the root as CWD and pipe the process's stdio to the parent process.
  const spawnOptions = {
    shell: process.platform === "win32",
    cwd: path.join(__dirname, '../../'),
    stdio: [ process.stdin, process.stdout, process.stderr ]
  }

  // Finally spawn the process
  const proc = spawn(command, forgeArgs, spawnOptions)

  proc.on('close', (code) => {
    info(`Child process exited with code ${code}`)
  })
}
