const fs = require('fs').promises
const path = require('path')
const YAML = require('yaml')
const log = require('../console-colour')

/**
 * Parses the test config and returns it as a JSON object
 *
 * @return  {Object}  The config object
 */
module.exports = async () => {
  const examplePath = path.join(__dirname, 'test-config.example.yml')
  const realPath = path.join(__dirname, '../../', 'test-config.yml')

  try {
    await fs.lstat(realPath)
  } catch (e) {
    // Real config did not exist -> copy over example
    log.info(`Copied test-config.yml to the root directory.`)
    await fs.copyFile(examplePath, realPath)
  }

  const contents = await fs.readFile(realPath, { encoding: 'utf-8' })
  return YAML.parse(contents)
}
