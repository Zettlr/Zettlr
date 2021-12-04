/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        <none>
 * Maintainer:      Felix Nüsse
 * License:         GNU GPL v3
 *
 * Description:     This handles all cli switches. If you need to implement custom switches, do it here.
 *
 * END HEADER
 */

import path from 'path'
import { app } from 'electron'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class Commandlineswitches {
  map = new Map<string, any>()

  handleCLI (): void {
    if (process.argv.includes('--help')) {
      process.stdout.write('This is the Zettlr Help.')
      console.log('This is the Zettlr Help.')
    }

    if (process.argv.includes('--tray')) {
      this.map.set('system.leaveAppRunningOverride', true)
    }

    const settingsmap = this.map
    process.argv.forEach(function (value) {
      if (value.startsWith('--d.')) {
        const pair = value.replace('--d.', '').split('=')
        settingsmap.set(pair[0], pair[1])
      }
    })
    // Setting custom data dir for user configuration files.
    // Full path or relative path is OK. '~' does not work as expected.
    const dataDirFlag = process.argv.find(elem => elem.indexOf('--data-dir=') === 0)

    if (dataDirFlag !== undefined) {
      // a path to a custom config dir is provided
      const match = /^--data-dir="?([^"]+)"?$/.exec(dataDirFlag)
      if (match !== null) {
        let dataDir = match[1]

        if (!path.isAbsolute(dataDir)) {
          if (app.isPackaged) {
            // Attempt to use the executable file's path as the basis
            dataDir = path.join(path.dirname(app.getPath('exe')), dataDir)
          } else {
            // Attempt to use the repository's root directory as the basis
            dataDir = path.join(__dirname, '../../', dataDir)
          }
        }
        global.log.info('[Application] Using custom data dir: ' + dataDir)
        app.setPath('userData', dataDir)
        app.setAppLogsPath(path.join(dataDir, 'logs'))
      }
    }

    // On systems with virtual GPUs (i.e. VMs), it might be necessary to disable
    // hardware acceleration. If the corresponding flag is set, we do so.
    // See for more info https://github.com/Zettlr/Zettlr/issues/2127
    if (process.argv.includes('--disable-hardware-acceleration')) {
      app.disableHardwareAcceleration()
    }
  }

  getSwitches (): Map<string, any> {
    return this.map
  }
}
