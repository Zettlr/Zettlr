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

import { app } from 'electron'
import path from 'path'

export default class CliProvider {
  static DATA_DIR: string = 'data-dir'
  static DISABLE_HARDWARE_ACCELERATION: string = 'disable-hardware-acceleration'
  static CLEAR_CACHE: string = 'clear-cache'

  /**
   * Create a new CliProvider object
   */
  constructor () {
    this.handleGeneralArguments()
  }

  getArg (key: string): any {
    switch (key) {
      case CliProvider.DATA_DIR: {
        let dataDir = this.getArgumentValue('--data-dir')
        if (dataDir !== undefined && !path.isAbsolute(dataDir)) {
          if (app.isPackaged) {
            // Attempt to use the executable file's path as the basis
            dataDir = path.join(path.dirname(app.getPath('exe')), dataDir)
          } else {
            // Attempt to use the repository's root directory as the basis
            dataDir = path.join(__dirname, '../../', dataDir)
          }
          return dataDir
        }
        return undefined
      }
      case CliProvider.CLEAR_CACHE: {
        return process.argv.includes('--clear-cache')
      }
      case CliProvider.DISABLE_HARDWARE_ACCELERATION: {
        return process.argv.includes('--disable-hardware-acceleration')
      }
    }
    return undefined
  }

  handleGeneralArguments (): void {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      this.showHelp()
      process.exit()
    }

    if (process.argv.includes('--version') || process.argv.includes('-v')) {
      console.log(app.getName() + ' ' + app.getVersion())
      process.exit()
    }
  }

  showHelp (): void {
    console.log('This is the Zettlr Help!')
    console.log('')
    console.log('Usage:')
    console.log('-h | --help                            Show this help')
    console.log('-v | --version                         Show the Version of Zettlr')
    console.log('   | --clear-cache                     Removes all cached files')
    console.log('   | --disable-hardware-acceleration   Disables Hardware Accelleration for systems that do not support it.')
    console.log('   | --data-dir=FILEPATH               Set a custom directory for Zettlr\'s configuration files')
  }

  getArgumentValue (key: string): string | undefined {
    const dataDirFlag = process.argv.find(elem => elem.indexOf(key + '=') === 0)
    if (dataDirFlag === undefined) {
      return undefined
    }
    const regex = new RegExp('^' + key + '="?([^"]+)"?$')
    const match = regex.exec(dataDirFlag)
    if (match !== null) {
      return match[1]
    }
  }
}
