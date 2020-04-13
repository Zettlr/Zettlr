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

const genStructure = require('./assets/generate-directory-structure')

const TEMPLATES = require('./assets/gui-test-configs.js')
const CONFIG_TEMPLATE = TEMPLATES.config
const TEST_DIRECTORY = path.join(__dirname, '../resources/test')
const CONFIG_FILE = path.join(__dirname, '../resources/config.json')

async function prepareEnvironment () {
  // First, clean out the resources/test folder
  try {
    fs.lstat(TEST_DIRECTORY)
    await new Promise((resolve, reject) => {
      rimraf(TEST_DIRECTORY, (err) => {
        if (err) reject(err)
        resolve()
      })
    })
  } catch (e) {
    // Nothing to do
    console.log('Test directory does not exist.')
  }

  // Now, re-create the directory
  await fs.mkdir(TEST_DIRECTORY, { 'recursive': true })

  // Fill in the file structure
  let roots = await genStructure()
  console.log(roots)

  // Now it's time to create the new config file
  let cfg = JSON.parse(JSON.stringify(CONFIG_TEMPLATE))
  cfg.openPaths = roots
  cfg.debug = true // Make sure to enable debug mode
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg))
}

// Finally, run the function
prepareEnvironment().then(() => {
  console.log('Successfully prepared environment! Starting Zettlr ...')
  let proc = spawn('electron', [ '.', '--config', CONFIG_FILE ], {
    'cwd': path.join(__dirname, '..')
  })
  proc.stdout.on('data', (data) => { console.log(data.toString('utf8')) })
  proc.stderr.on('data', (data) => { console.error(data.toString('utf8')) })
  proc.on('close', (code) => { console.log(`Child process exited with code ${code}`) })
}).catch(err => {
  console.error(err)
})
