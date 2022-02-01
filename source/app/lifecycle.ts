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
import extractFilesFromArgv from './util/extract-files-from-argv'
import registerCustomProtocols from './util/custom-protocols'
import environmentCheck from './util/environment-check'
import addToPath from './util/add-to-PATH'
import resolveTimespanMs from './util/resolve-timespan-ms'
import path from 'path'

// Developer tools
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import AppServiceContainer from './app-service-container'

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

  global.log.info(`こんにちは！ Booting Zettlr at ${(new Date()).toString()}.`)

  // Before we begin, let's load the Vue.js DevTools for debugging
  try {
    // Load Vue developer extension
    installExtension(VUEJS3_DEVTOOLS)
      .then((name: string) => global.log.info(`Added DevTools extension:  ${name}`))
      .catch((err: any) => global.log.error(`Could not install DevTools extensions: ${String(err.message)}`, err))
  } catch (err) {
    global.log.verbose('Electron DevTools Installer not found - proceeding without loading developer tools.')
  }

  await environmentCheck()

  registerCustomProtocols()

  // Then we need to extract possible files that should be opened from the argv
  extractFilesFromArgv()

  // Now boot up the service container
  appServiceContainer = new AppServiceContainer()
  await appServiceContainer.boot()

  // If we have a bundled pandoc, unshift its path to env.PATH in order to have
  // the system search there first for the binary, and not use the internal
  // one.
  const useBundledPandoc = Boolean(global.config.get('export.useBundledPandoc'))
  if (process.env.PANDOC_PATH !== undefined && useBundledPandoc) {
    addToPath(path.dirname(process.env.PANDOC_PATH), 'unshift')
    global.log.info('[Application] The bundled pandoc executable is now in PATH. If you do not want to use the bundled pandoc, uncheck the corresponding setting and reboot the app.')
  }
}

/**
 * Shuts the application down and performs cleanup operations
 *
 * @return  {Promise<void>}  Resolves always
 */
export async function shutdownApplication (): Promise<void> {
  global.log.info(`さようなら！ Shutting down at ${(new Date()).toString()}`)

  const downTimestamp = Date.now()

  // Get a nice resolved timespan with right properties
  const span = resolveTimespanMs(downTimestamp - upTimestamp)

  // Now construct the message. Always include minutes, seconds, and milliseconds
  let uptimeMessage: string = `${span.minutes} minutes, and ${span.seconds}.${span.ms} seconds`
  if (span.hours > 0) uptimeMessage = `${span.hours} hours, ${uptimeMessage}`
  if (span.days > 0) uptimeMessage = `${span.days} days, ${uptimeMessage}`
  if (span.weeks > 0) uptimeMessage = `${span.weeks} weeks, ${uptimeMessage}`

  global.log.info(`Application uptime was: ${uptimeMessage}.`)

  if (span.days > 0 || span.weeks > 0) {
    global.log.warning('Zettlr has run for more than one day. Please make sure to regularly reboot your computer.')
  }

  await appServiceContainer.shutdown()
}

export function getServiceContainer (): AppServiceContainer {
  return appServiceContainer
}
