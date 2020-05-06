/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        autoloader
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function loads all commands from this directory and
 *                  returns them.
 *
 * END HEADER
 */

const fs = require('fs').promises
const path = require('path')

module.exports = async function (app) {
  // First list the directory
  let dirs = await fs.readdir(__dirname)

  // Sanitise the directory -> throw out everything that's not javascript or
  // one of the system files.
  dirs = dirs.filter(elem => /\.jsx?$/.test(elem))
  dirs = dirs.filter(elem => ![ '_autoload.js', 'zettlr-command.js' ].includes(elem))

  let cmd = []

  for (let file of dirs) {
    try {
      // Instantiate the command
      let Command = require(path.join(__dirname, file))
      cmd.push(new Command(app))
    } catch (e) {
      // Simply log the error so that a faulty command doesn't impede loading
      // the rest of the commands.
      global.log.error(`Could not load command ${file}: ${e.message}`)
    }
  }

  // After all commands have been set up return the array.
  return cmd
}
