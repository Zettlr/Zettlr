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

export const DATA_DIR: string = 'data-dir'
export const DISABLE_HARDWARE_ACCELERATION: string = 'disable-hardware-acceleration'
export const CLEAR_CACHE: string = 'clear-cache'
export const LAUNCH_MINIMIZED: string = 'launch-minimized'

export function getCLIArgument (key: string): any {
  switch (key) {
    case DATA_DIR: {
      let dataDir = getArgumentValue('--data-dir')
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
    case CLEAR_CACHE: {
      return process.argv.includes('--clear-cache')
    }
    case DISABLE_HARDWARE_ACCELERATION: {
      return process.argv.includes('--disable-hardware-acceleration')
    }
    case LAUNCH_MINIMIZED: {
      return process.argv.includes('--launch-minimized') || process.argv.includes('-m')
    }
  }
  return undefined
}

export function handleGeneralArguments (): void {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp()
    process.exit()
  }

  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log(app.getName() + ' ' + app.getVersion())
    process.exit()
  }
}

function showHelp (): void {
  console.log('This is the Zettlr Help!')
  console.log('')
  console.log('Usage:')
  console.log('-h | --help                            Show this help')
  console.log('-v | --version                         Show the Version of Zettlr')
  console.log('   | --clear-cache                     Removes all cached files')
  console.log('   | --disable-hardware-acceleration   Disables Hardware Accelleration for systems that do not support it.')
  console.log('   | --data-dir=FILEPATH               Set a custom directory for Zettlr\'s configuration files')
  console.log('-m | --launch-minimized                Start Zettlr mimimized in the Systemtray')
}

export function getArgumentValue (key: string): string | undefined {
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
