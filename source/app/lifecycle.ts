/**
 * This file contains lifecycle functions which boot and shutdown the
 * application.
 */

// Helper function to extract files to open from process.argv
import extractFilesFromArgv from '../common/util/extract-files-from-argv'
import registerCustomProtocols from './util/custom-protocols'
import resolveTimespanMs from './util/resolve-timespan-ms'

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

  // Get a nice resolved timespan with right properties
  const span = resolveTimespanMs(downTimestamp - upTimestamp)

  if (span.days > 0 || span.weeks > 0) {
    global.log.warning('Zettlr has run for more than one day. Please make sure to regularly reboot your computer.')
  }

  // Now construct the message. Always include minutes, seconds, and milliseconds
  let uptimeMessage: string = `${span.minutes} minutes, and ${span.seconds}.${span.ms} seconds`
  if (span.hours > 0) uptimeMessage = span.hours.toString() + ' hours, ' + uptimeMessage
  if (span.days > 0) uptimeMessage = span.days.toString() + ' days, ' + uptimeMessage
  if (span.weeks > 0) uptimeMessage = span.weeks.toString() + ' weeks, ' + uptimeMessage

  global.log.info(`Shutdown almost complete. Application uptime was: ${uptimeMessage}.`)

  // After everything is done, shut down the log provider.
  await logProvider.shutdown()
}
