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
import { loadI18n } from '../common/i18n-main'
import isFile from '../common/util/is-file'
import isDir from '../common/util/is-dir'
import path from 'path'

// Developer tools
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'

// Providers
import AppearanceProvider from './service-providers/appearance-provider'
import AssetsProvider from './service-providers/assets-provider'
import CiteprocProvider from './service-providers/citeproc-provider'
import ConfigProvider from './service-providers/config-provider'
import CssProvider from './service-providers/css-provider'
import DictionaryProvider from './service-providers/dictionary-provider'
import LogProvider from './service-providers/log-provider'
import MenuProvider from './service-providers/menu-provider'
import TagProvider from './service-providers/tag-provider'
import TargetProvider from './service-providers/target-provider'
import TranslationProvider from './service-providers/translation-provider'
import UpdateProvider from './service-providers/update-provider'
import NotificationProvider from './service-providers/notification-provider'
import RecentDocumentsProvider from './service-providers/recent-docs-provider'
import StatsProvider from './service-providers/stats-provider'
import TrayProvider from './service-providers/tray-provider'

// We need module-global variables so that garbage collect won't shut down the
// providers before the app is shut down.
let appearanceProvider: AppearanceProvider
let assetsProvider: AssetsProvider
let citeprocProvider: CiteprocProvider
let configProvider: ConfigProvider
let cssProvider: CssProvider
let dictionaryProvider: DictionaryProvider
let logProvider: LogProvider
let tagProvider: TagProvider
let targetProvider: TargetProvider
let translationProvider: TranslationProvider
let updateProvider: UpdateProvider
let menuProvider: MenuProvider
let notificationProvider: NotificationProvider
let recentDocsProvider: RecentDocumentsProvider
let statsProvider: StatsProvider
let trayProvider: TrayProvider

// Statistics: Record the uptime of the application
let upTimestamp: number

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
      .catch((err: any) => global.log.error(`Could not install DevTools extensions: ${String(err.message)}`, err))
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
  assetsProvider = new AssetsProvider()
  await assetsProvider.init()
  citeprocProvider = new CiteprocProvider()
  dictionaryProvider = new DictionaryProvider()
  recentDocsProvider = new RecentDocumentsProvider()
  menuProvider = new MenuProvider() // Requires config & recent docs providers
  tagProvider = new TagProvider()
  targetProvider = new TargetProvider()
  cssProvider = new CssProvider()
  translationProvider = new TranslationProvider()
  updateProvider = new UpdateProvider()
  notificationProvider = new NotificationProvider()
  statsProvider = new StatsProvider()
  trayProvider = new TrayProvider()

  // If the user has provided a working path to XeLaTeX, make sure that its
  // directory name is in path for Zettlr to find it.
  const xelatexPath: string = global.config.get('xelatex').trim()
  const xelatexPathIsFile = isFile(xelatexPath)
  const xelatexPathIsDir = isDir(xelatexPath)
  if (xelatexPath !== '' && (xelatexPathIsFile || xelatexPathIsDir)) {
    if (xelatexPathIsFile) {
      addToPath(path.dirname(xelatexPath), 'unshift')
    } else {
      addToPath(xelatexPath, 'unshift')
    }
  }

  // If the user has provided a working path to Pandoc, make sure that its
  // directory name is in path for Zettlr to find it.
  const pandocPath: string = global.config.get('pandoc').trim()
  const pandocPathIsFile = isFile(pandocPath)
  const pandocPathIsDir = isDir(pandocPath)
  if (pandocPath !== '' && (pandocPathIsFile || pandocPathIsDir)) {
    if (pandocPathIsFile) {
      addToPath(path.dirname(pandocPath), 'unshift')
    } else {
      addToPath(pandocPath, 'unshift')
    }
  }

  // If we have a bundled pandoc, unshift its path to env.PATH in order to have
  // the system search there first for the binary, and not use the internal
  // one.
  const useBundledPandoc = Boolean(global.config.get('export.useBundledPandoc'))
  if (process.env.PANDOC_PATH !== undefined && useBundledPandoc) {
    addToPath(path.dirname(process.env.PANDOC_PATH), 'unshift')
    global.log.info('[Application] The bundled pandoc executable is now in PATH. If you do not want to use the bundled pandoc, uncheck the corresponding setting and reboot the app.')
  }

  // Initiate i18n after the config provider has definitely spun up
  let metadata = await loadI18n(global.config.get('appLang'))

  // It may be that only a fallback has been provided or else. In this case we
  // must update the config to reflect this.
  if (metadata.tag !== global.config.get('appLang')) {
    global.config.set('appLang', metadata.tag)
  }

  // Initial setting of the application menu.
  menuProvider.set()
}

/**
 * Shuts the application down and performs cleanup operations
 *
 * @return  {Promise<void>}  Resolves always
 */
export async function shutdownApplication (): Promise<void> {
  global.log.info(`さようなら！ Shutting down at ${(new Date()).toString()}`)
  // Shutdown all providers in the reverse order
  await safeShutdown(trayProvider)
  await safeShutdown(statsProvider)
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
  await safeShutdown(assetsProvider)
  await safeShutdown(appearanceProvider)
  await safeShutdown(configProvider)

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
