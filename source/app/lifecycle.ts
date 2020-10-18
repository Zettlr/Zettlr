/**
 * This file contains lifecycle functions which boot and shutdown the
 * application.
 */

// Helper function to extract files to open from process.argv
import extractFilesFromArgv from '../common/util/extract-files-from-argv'
import registerCustomProtocols from './util/custom-protocols'

// Developer tools
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'

// Providers
import AppearanceProvider from './service-providers/appearance-provider'
import CiteprocProvider from './service-providers/citeproc-provider'
import ConfigProvider from './service-providers/config-provider'
import CssProvider from './service-providers/css-provider'
import DictionaryProvider from './service-providers/dictionary-provider'
import LogProvider from './service-providers/log-provider'
import RecentDocsProvider from './service-providers/recent-docs-provider'
import TagProvider from './service-providers/tag-provider'
import TargetProvider from './service-providers/target-provider'
import TranslationProvider from './service-providers/translation-provider'
import UpdateProvider from './service-providers/update-provider'
import WatchdogProvider from './service-providers/watchdog-provider'

// We need module-global variables so that garbage collect won't shut down the
// providers before the app is shut down.
var appearanceProvider: AppearanceProvider
var citeprocProvider: CiteprocProvider
var configProvider: ConfigProvider
var cssProvider: CssProvider
var dictionaryProvider: DictionaryProvider
var logProvider: LogProvider
var recentDocsProvider: RecentDocsProvider
var tagProvider: TagProvider
var targetProvider: TargetProvider
var translationProvider: TranslationProvider
var updateProvider: UpdateProvider
var watchdogProvider: WatchdogProvider

// Statistics: Record the uptime of the application
var upTimestamp: number

/**
 * Boots the application
 *
 * @return  {void}    Nothing to return
 */
export function bootApplication (): void {
  upTimestamp = Date.now()

  global.log.info(`こんにちは！ Booting Zettlr at ${(new Date()).toString()}.`)

  // Before we begin, let's load the Vue.js DevTools for debugging
  try {
    // Load Vue developer extension
    installExtension(VUEJS_DEVTOOLS)
      .then((name: string) => global.log.info(`Added DevTools extension:  ${name}`))
      .catch((err: any) => console.log('An error occurred: ', err))
  } catch (e) {
    global.log.verbose('Electron DevTools Installer not found - proceeding without loading developer tools.')
  }

  registerCustomProtocols()

  // Then we need to extract possible files that should be opened from the argv
  global.filesToOpen = extractFilesFromArgv()

  // Second, we need all providers. The order is sometimes important.
  // For instance, the first provider should be the log provider, and the second
  // the config provider, as many providers require those to be alive.
  logProvider = new LogProvider()
  configProvider = new ConfigProvider()
  appearanceProvider = new AppearanceProvider()
  watchdogProvider = new WatchdogProvider()
  citeprocProvider = new CiteprocProvider()
  dictionaryProvider = new DictionaryProvider()
  recentDocsProvider = new RecentDocsProvider()
  tagProvider = new TagProvider()
  targetProvider = new TargetProvider()
  cssProvider = new CssProvider()
  translationProvider = new TranslationProvider()
  updateProvider = new UpdateProvider()
}

/**
 * Shuts the application down and performs cleanup operations
 *
 * @return  {Promise<void>}  Resolves always
 */
export async function shutdownApplication (): Promise<void> {
  global.log.info(`さようなら！ Shutting down at ${(new Date()).toString()}`)
  // Shutdown all providers in the reverse order
  await updateProvider.shutdown()
  await translationProvider.shutdown()
  await cssProvider.shutdown()
  await targetProvider.shutdown()
  await tagProvider.shutdown()
  await recentDocsProvider.shutdown()
  await dictionaryProvider.shutdown()
  await citeprocProvider.shutdown()
  await watchdogProvider.shutdown()
  await appearanceProvider.shutdown()
  await configProvider.shutdown()

  const downTimestamp = Date.now()

  var ms: number = (downTimestamp - upTimestamp) // Milliseconds
  let seconds: number = Math.floor(ms / 1_000) // Seconds
  let minutes: number = 0
  let hours: number = 0
  let days: number = 0
  let weeks: number = 0

  if (ms > 1000) {
    ms = ms % 1_000
  }

  if (seconds > 60) {
    minutes = Math.floor(seconds / 60)
    seconds = seconds % 60
  }

  if (minutes > 60) {
    hours = Math.floor(minutes / 60)
    minutes = minutes % 60
  }

  if (hours > 24) {
    days = Math.floor(hours / 60)
    hours = hours % 24

    // Issue a warning
    global.log.warning(`The application ran for ${days} days! Please make sure to restart the application from time to time.`)
  }

  if (days > 7) {
    weeks = Math.floor(days / 7)
    days = days % 7
  }

  // Now construct the message. Always include minutes, seconds, and milliseconds
  let uptimeMessage: string = `${minutes} minutes, and ${seconds}.${ms} seconds`
  if (hours > 0) uptimeMessage = hours.toString() + ' hours, ' + uptimeMessage
  if (days > 0) uptimeMessage = days.toString() + ' days, ' + uptimeMessage
  if (weeks > 0) uptimeMessage = weeks.toString() + ' weeks, ' + uptimeMessage

  global.log.info(`Shutdown almost complete. Application uptime was: ${uptimeMessage}.`)

  // After everything is done, shut down the log provider.
  await logProvider.shutdown()
}
