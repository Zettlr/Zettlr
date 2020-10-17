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

const fs = require('fs').promises
const path = require('path')
const rimraf = require('rimraf')
const { spawn } = require('child_process')

const makeConfig = require('./make-config')
const copyFolder = require('./copy-folder')

const log = require('../console-colour')

const hash = require('../../source/common/util/hash')

const TEST_DIRECTORY = path.join(__dirname, '../../resources/test')
const CONFIG_FILE = path.join(__dirname, '../../resources/test-config.json')

// Test if we should nuke the old test environment, or simply start
// with the old one (useful for testing persistence of settings)
if (process.argv.includes('--clean')) {
  log.info('☢️ Nuking test environment ...')
  prepareEnvironment().then(() => {
    console.log('') // Empty line
    let argv = process.argv.slice(2)
    argv.splice(argv.indexOf('--clean'), 1)
    startApp(argv)
  }).catch(err => {
    log.error(err.message)
    // Add a console.error with the full error for stack trace, etc.
    console.error(err)
  })
} else {
  // Start the app retaining the directory structure.
  log.info('Starting app with old test environment ...')
  startApp(process.argv.slice(2))
}

async function prepareEnvironment () {
  // First, remove the ./resources/test folder
  try {
    await fs.lstat(TEST_DIRECTORY)
    await new Promise((resolve, reject) => {
      rimraf(TEST_DIRECTORY, (err) => {
        if (err) reject(err)
        resolve()
      })
    })
    log.success('Removed the old testing directory.')
  } catch (e) {
    // Nothing to do
    log.verbose('No old testing directory found.')
  }

  // Second, remove the configuration file
  try {
    await fs.lstat(CONFIG_FILE)
    await fs.unlink(CONFIG_FILE)
    log.success('Removed old config file.')
  } catch (e) {
    // Nothing to do
    log.verbose('No old configuration file found.')
  }

  // Fill in the file structure
  log.info('Copying over testing directory into the resources folder ...')
  let roots = await copyFolder(TEST_DIRECTORY)
  log.success('Done copying the testing files!')

  let readmeFile = roots.find(root => path.basename(root) === 'README.md')

  // Now it's time to create the new config file
  log.info('Creating new configuration file from test-config.yml ...')
  let cfg = await makeConfig()
  cfg.openPaths = roots
  // Set the README.md file as open
  cfg.openFiles = [ hash(readmeFile) ]

  // We also want the dialogs to start at the test directory for easier navigation
  cfg.dialogPaths = {
    askFileDialog: TEST_DIRECTORY,
    askDirDialog: TEST_DIRECTORY,
    askLangFileDialog: TEST_DIRECTORY
  }

  // Finally, write the config file
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg))
  log.success(`Written file ${CONFIG_FILE}.`)
}

function startApp(argv = []) {
  log.info('Starting Zettlr with custom configuration ...')

  if (argv.length > 0) {
    log.warn('Supplying additional arguments to process: [' + argv.join(', ') + ']')
  }

  let proc = spawn('electron-forge', [ 'start', '--', `--config="${CONFIG_FILE}"`, ...argv ], {
    // Use the root directory as working dir
    'cwd': path.join(__dirname, '../../'),
    // Directly pipe stdio from the child process to the main process
    'stdio': [ process.stdin, process.stdout, process.stderr ]
  })
  proc.on('close', (code) => {
    log.info(`Child process exited with code ${code}`)
  })
}
