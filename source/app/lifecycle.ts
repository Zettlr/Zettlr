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

// Helper functions
import extractFilesFromArgv from '../common/util/extract-files-from-argv'
import registerCustomProtocols from './util/custom-protocols'
import environmentCheck from './util/environment-check'

// Utility functions
import resolveTimespanMs from './util/resolve-timespan-ms'
import { loadI18nMain } from '../common/i18n'

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
import MenuProvider from './service-providers/menu-provider'
import TagProvider from './service-providers/tag-provider'
import TargetProvider from './service-providers/target-provider'
import TranslationProvider from './service-providers/translation-provider'
import UpdateProvider from './service-providers/update-provider'
import NotificationProvider from './service-providers/notification-provider'
import StatsProvider from './service-providers/stats-provider'

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
var menuProvider: MenuProvider
var notificationProvider: NotificationProvider
var statsProvider: StatsProvider

// Statistics: Record the uptime of the application
var upTimestamp: number

/**
 * Catches potential errors during shutdown of certain providers.
 *
 * @param   {Provider}      provider  The provider to shut down
 */
async function safeShutdown (provider: any): Promise<void> {
  try {
    await provider.shutdown()
  } catch (err) {
    global.log.error(`[Shutdown] Could not shut down provider ${provider.constructor.name as string}: ${err.message as string}`, err)
  }
}

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
    installExtension(VUEJS_DEVTOOLS)
      .then((name: string) => global.log.info(`Added DevTools extension:  ${name}`))
      .catch((err: any) => console.log('An error occurred: ', err))
  } catch (e) {
    global.log.verbose('Electron DevTools Installer not found - proceeding without loading developer tools.')
  }

  await environmentCheck()

  registerCustomProtocols()

  // Then we need to extract possible files that should be opened from the argv
  extractFilesFromArgv()

  // Second, we need all providers. The order is sometimes important.
  // For instance, the first provider should be the log provider, and the second
  // the config provider, as many providers require those to be alive.
  logProvider = new LogProvider()
  configProvider = new ConfigProvider()
  appearanceProvider = new AppearanceProvider()
  citeprocProvider = new CiteprocProvider()
  dictionaryProvider = new DictionaryProvider()
  recentDocsProvider = new RecentDocsProvider()
  menuProvider = new MenuProvider()
  tagProvider = new TagProvider()
  targetProvider = new TargetProvider()
  cssProvider = new CssProvider()
  translationProvider = new TranslationProvider()
  updateProvider = new UpdateProvider()
  notificationProvider = new NotificationProvider()
  statsProvider = new StatsProvider()

  // DEBUG Make sure to notify users of the wrong platform, if they have one
  const is64Bit = process.arch === 'x64'
  const isAppleSilicon = process.platform === 'darwin' && process.arch === 'arm64'
  if (!is64Bit && !isAppleSilicon) {
    setTimeout(() => {
      global.log.error(`[Application] Attention, your platform/architecture combination (${process.platform}; ${process.arch}) will no longer be supported after Zettlr 1.9.0!`)
      global.notify.normal([
        'Your platform/architecture combination is deprecated. You must upgrade',
        'to a supported operating system that supports 64 bit, if you wish to',
        'continue using Zettlr after release 1.9.0. This message will only',
        'appear during 1.8.4 and will be removed in the next release.',
        `Your platform: <strong>${process.platform} (${process.arch})</strong>`
      ].join(' '), true)
    }, 30000)
  } else {
    global.log.info(`[Application] You are prepared for Zettlr 1.9.0, as your platform/architecture combination (${process.platform}; ${process.arch}) will continue to be supported!`)
  }

  // Initiate i18n after the config provider has definitely spun up
  let metadata: any = loadI18nMain(global.config.get('appLang'))

  // It may be that only a fallback has been provided or else. In this case we
  // must update the config to reflect this.
  if (metadata.tag !== global.config.get('appLang')) {
    global.config.set('appLang', metadata.tag)
  }
}

/**
 * Shuts the application down and performs cleanup operations
 *
 * @return  {Promise<void>}  Resolves always
 */
export async function shutdownApplication (): Promise<void> {
  global.log.info(`さようなら！ Shutting down at ${(new Date()).toString()}`)
  // Shutdown all providers in the reverse order
  await safeShutdown(notificationProvider)
  await safeShutdown(updateProvider)
  await safeShutdown(translationProvider)
  await safeShutdown(cssProvider)
  await safeShutdown(targetProvider)
  await safeShutdown(tagProvider)
  await safeShutdown(menuProvider)
  await safeShutdown(recentDocsProvider)
  await safeShutdown(dictionaryProvider)
  await safeShutdown(citeprocProvider)
  await safeShutdown(appearanceProvider)
  await safeShutdown(configProvider)
  await safeShutdown(statsProvider)

  const downTimestamp = Date.now()

  // Get a nice resolved timespan with right properties
  const span = resolveTimespanMs(downTimestamp - upTimestamp)

  if (span.days > 0 || span.weeks > 0) {
    global.log.warning('Zettlr has run for more than one day. Please make sure to regularly reboot your computer.')
  }

  // Now construct the message. Always include minutes, seconds, and milliseconds
  let uptimeMessage: string = `${span.minutes} minutes, and ${span.seconds}.${span.ms} seconds`
  if (span.hours > 0) uptimeMessage = `${span.hours} hours, ${uptimeMessage}`
  if (span.days > 0) uptimeMessage = `${span.days} days, ${uptimeMessage}`
  if (span.weeks > 0) uptimeMessage = `${span.weeks} weeks, ${uptimeMessage}`

  global.log.info(`Shutdown almost complete. Application uptime was: ${uptimeMessage}.`)

  // After everything is done, shut down the log provider.
  await logProvider.shutdown()
}
