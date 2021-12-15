/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        cli-provider class
 * CVM-Role:        Service Provider
 * Authorr:         Felix Nüsse
 * License:         GNU GPL v3
 *
 * Description:     This class handles the cli-arguments.
 *                  It can be used to query arguments, as
 *                  long as they are defined in the options object.
 *
 * END HEADER
 */

import yargs from 'yargs/yargs'
import { Arguments, exit } from 'yargs'
import { app } from 'electron'

export default class CliProvider {
  yargs = yargs(process.argv.slice(2))
  values: Arguments
  /**
   * Create a new application object
   * @param {electron.app} parentApp The app object.
   */
  constructor () {
    // custom version implementation used, so disable the original one
    this.yargs.version(false)
    this.yargs.options({
      c: {
        default: false,
        alias: 'clear-cache',
        describe: 'This will direct the File System Abstraction Layer to fully clear its cache on boot'
      },
      d: {
        default: undefined,
        alias: 'data-dir'
      },
      a: {
        default: false,
        alias: 'disable-hardware-acceleration'
      },
      h: {
        default: false,
        alias: 'help',
        describe: 'Print this help'
      },
      v: {
        default: false,
        alias: 'version',
        describe: 'Print the version of Zettlr'
      }
    })
    this.values = this.yargs.parseSync(process.argv)
    this.handleGeneralArguments()
  }

  getArg (key: string): any {
    let value = this.values[key]
    let t = String(value)
    console.error('Query Argv: ' + key)
    console.error('Result:     ' + t)
    console.error('Result:     ' + this.values[key])
    return value
  }

  handleGeneralArguments (): void {
    if (this.getArg('help')) {
      this.yargs.showHelp()
      exit(0, Error('Exit because help was shown!'))
    }

    if (this.getArg('version')) {
      console.log(app.getName() + ' ' + app.getVersion())
      exit(0, Error('Exit because version was shown!'))
    }
  }
}
