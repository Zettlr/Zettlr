import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import YAML from 'yaml'
import { info } from '../console-colour.mjs'

const __dirname = dirname(import.meta.url.substring(7))

/**
 * Parses the test config and returns it as a JSON object
 *
 * @return  {Object}  The config object
 */
export default async () => {
  const examplePath = join(__dirname, 'test-config.example.yml')
  const realPath = join(__dirname, '../../', 'test-config.yml')

  try {
    await fs.lstat(realPath)
  } catch (e) {
    // Real config did not exist -> copy over example
    info(`Copied test-config.yml to the root directory.`)
    await fs.copyFile(examplePath, realPath)
  }

  const contents = await fs.readFile(realPath, { encoding: 'utf-8' })
  return YAML.parse(contents)
}
