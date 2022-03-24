/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains lifecycle functions for boot and shutdown
 *                  that boot up things like the service providers, and shut
 *                  them down appropriately.
 *
 * END HEADER
 */

// Helper/Utility functions
import registerCustomProtocols from './util/custom-protocols'
import environmentCheck from './util/environment-check'
import addToPath from './util/add-to-PATH'
import resolveTimespanMs from './util/resolve-timespan-ms'
import path from 'path'

// Developer tools
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import AppServiceContainer from './app-service-container'
import { app } from 'electron'

// We need module-global variables so that garbage collect won't shut down the
// providers before the app is shut down.
let appServiceContainer: AppServiceContainer

// Statistics: Record the uptime of the application
let upTimestamp: number

/**
 * Boots the application
 *
 * @return  {void}    Nothing to return
 */
export async function bootApplication (): Promise<void> {
  upTimestamp = Date.now()

  // First of all we MUST perform the environment check, since everything else
  // depends on this.
  await environmentCheck()

  // We need to instantiate the service container right away to have access to
  // the log and config providers. Then we just need to remember to boot it
  // before we access anything important.
  appServiceContainer = new AppServiceContainer()
  const config = appServiceContainer.config
  const log = appServiceContainer.log

  log.info(`こんにちは！ Booting Zettlr at ${(new Date()).toString()}.`)

  // Before we begin, let's load the Vue.js DevTools for debugging
  if (!app.isPackaged) {
    try {
      // Load Vue developer extension
      installExtension(VUEJS3_DEVTOOLS)
        .then((name: string) => log.info(`Added DevTools extension:  ${name}`))
        .catch((err: any) => log.error(`Could not install DevTools extensions: ${String(err.message)}`, err))
    } catch (err) {
      log.verbose('Electron DevTools Installer not found - proceeding without loading developer tools.')
    }
  }

  registerCustomProtocols(log)

  // Now boot up the service container
  await appServiceContainer.boot()

  // If we have a bundled pandoc, unshift its path to env.PATH in order to have
  // the system search there first for the binary, and not use the internal
  // one.
  const useBundledPandoc = Boolean(config.get('export.useBundledPandoc'))
  if (process.env.PANDOC_PATH !== undefined && useBundledPandoc) {
    addToPath(log, path.dirname(process.env.PANDOC_PATH), 'unshift')
    log.info('[Application] The bundled pandoc executable is now in PATH. If you do not want to use the bundled pandoc, uncheck the corresponding setting and reboot the app.')
  }
}

/**
 * Shuts the application down and performs cleanup operations
 *
 * @return  {Promise<void>}  Resolves always
 */
export async function shutdownApplication (): Promise<void> {
  const log = appServiceContainer.log
  log.info(`さようなら！ Shutting down at ${(new Date()).toString()}`)

  const downTimestamp = Date.now()

  // Get a nice resolved timespan with right properties
  const span = resolveTimespanMs(downTimestamp - upTimestamp)

  // Now construct the message. Always include minutes, seconds, and milliseconds
  let uptimeMessage: string = `${span.minutes} minutes, and ${span.seconds}.${span.ms} seconds`
  if (span.hours > 0) uptimeMessage = `${span.hours} hours, ${uptimeMessage}`
  if (span.days > 0) uptimeMessage = `${span.days} days, ${uptimeMessage}`
  if (span.weeks > 0) uptimeMessage = `${span.weeks} weeks, ${uptimeMessage}`

  log.info(`Application uptime was: ${uptimeMessage}.`)

  if (span.days > 0 || span.weeks > 0) {
    log.warning('Zettlr has run for more than one day. Please make sure to regularly reboot your computer.')
  }

  await appServiceContainer.shutdown()
}

export function getServiceContainer (): AppServiceContainer|undefined {
  return appServiceContainer
}
