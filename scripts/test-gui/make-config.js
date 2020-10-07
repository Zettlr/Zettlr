const fs = require('fs').promises
const path = require('path')
const YAML = require('yaml')

/**
 * Parses the test config and returns it as a JSON object
 *
 * @return  {Object}  The config object
 */
module.exports = async () => {
  const examplePath = path.join(__dirname, 'test-config.example.yml')
  const realPath = path.join(__dirname, 'test-config.yml')

  await ensureConfigFileExists()

  const contents = await fs.readFile(realPath, { encoding: 'utf-8' })
  return YAML.parse(contents)
}

async function ensureConfigFileExists () {
  const examplePath = path.join(__dirname, 'test-config.example.yml')
  const realPath = path.join(__dirname, 'test-config.yml')

  try {
    await fs.lstat(realPath)
  } catch (e) {
    // Real config did not exist -> copy over example
    await fs.copyFile(examplePath, realPath)
  }
}
