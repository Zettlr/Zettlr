/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function is called on boot and checks the environment
 *                  to ensure a proper functioning of the application.
 *
 * END HEADER
 */

import path from 'path'
import { app } from 'electron'
import tls from 'tls'
import { promises as fs } from 'fs'
import isFile from '../../common/util/is-file'
import isTraySupported from './is-tray-supported'
import { getProgramVersion } from './get-program-version'
import fixPath from 'fix-path'
import { runCommand } from './run-command'

export default async function environmentCheck (): Promise<void> {
  console.log('[Application] Performing environment check ...')

  // Ensure that the Node process trusts both its own bundled certificates
  // (= the default) as well as any system store certificates when making
  // connections.
  const bundled = tls.getCACertificates('bundled')
  const system = tls.getCACertificates('system')
  tls.setDefaultCACertificates([ ...bundled, ...system ])
  console.log('[Application] Info: The main process now uses both the bundled Mozilla CA as well as the system CA.')

  // This is necessary on macOS and Linux, because GUI applications may not
  // inherit the same PATH environment variable as terminal programs. This is
  // necessary, however, to detect additional helper programs, such as quarto.
  fixPath()

  /**
   * Required directories that must exist on the system in order for certain
   * functionality to work and not bring down Zettlr to its knees on startup.
   *
   * @var {string[]}
   */
  const REQUIRED_DIRECTORIES = [
    app.getPath('userData'), // Main config directory
    path.join(app.getPath('userData'), 'dict'), // Custom dictionary path
    path.join(app.getPath('userData'), 'lang'), // Custom translation path
    path.join(app.getPath('userData'), 'logs'), // Log path
    path.join(app.getPath('userData'), 'defaults'), // Defaults files
    path.join(app.getPath('userData'), 'snippets'), // Snippets files
    path.join(app.getPath('userData'), 'lua-filter') // Lua filters
  ]

  const is64Bit = process.arch === 'x64'
  const isARM64 = process.arch === 'arm64'
  const isDarwin = process.platform === 'darwin'
  const isLinux = process.platform === 'linux'
  const isWindows = process.platform === 'win32'
  const winARM = isWindows && isARM64
  const macARM = isDarwin && isARM64
  const linuxARM = isLinux && isARM64

  if (!winARM && !macARM && !is64Bit && !isLinux && !linuxARM) {
    // We support: Windows ARM and macOS ARM
    // and anything 64bit. Warn for everything else.
    console.warn(`[Application] Your platform/arch (${process.platform}/${process.arch}) combination is not officially supported. Zettlr might not function correctly.`)
  }

  // We need to check if Pandoc has been bundled with this package.
  // Because if it is, we can simply use that one instead.
  const executable = (process.platform === 'win32') ? 'pandoc.exe' : 'pandoc'
  const pandocPath = path.join(process.resourcesPath, executable)
  if (isFile(pandocPath)) {
    console.log(`[Application] Pandoc has been bundled with this release. Path: ${pandocPath}`)
    process.env.PANDOC_PATH = pandocPath
  } else if (!app.isPackaged) {
    // We're in develop mode, so possibly, we have a Pandoc exe. Let's check
    const resPath = path.join(__dirname, '../../resources', executable)
    if (isFile(resPath)) {
      process.env.PANDOC_PATH = resPath
      console.log(`[Application] App is unpackaged, and Pandoc has been found in the resources directory: ${resPath}`)
    } else {
      console.warn(`[Application] App is unpackaged, but there was no Pandoc executable: ${resPath}`)
    }
  } else {
    console.warn('[Application] Pandoc has not been bundled with this release. Falling back to system version instead.')
  }

  // Now, let's see if there's a quarto package installed
  try {
    const version = await getProgramVersion('quarto')
    console.log(`[Application] Found a system-wide Quarto install! Version ${String(version)}`)
    process.env.QUARTO_SUPPORT = '1'
    process.env.QUARTO_VERSION = String(version)
  } catch (err) {
    // No system wide install
    console.log('[Application] Quarto not found on system. *.qmd-files will be exported with Pandoc.')
    process.env.QUARTO_SUPPORT = '0'
  }

  // Finally, determine if git is installed on this machine.
  process.env.GIT_SUPPORT = '0'
  try {
    // On macOS, the `git` command always exists. If the user has installed the
    // XCode command line tools, it will resolve to the actual git binary.
    // However, on Macs without XCode command line tools, it will instead
    // trigger an annoying popup asking to install the command line tools. To
    // figure out if git is installed on macOS, we have to go another route and
    // check the return code of `xcode-select -p`. If it's 0, we are good to go
    // to check for git availability (because the command line tools are
    // intalled). NOTE that we cannot use the recommended tool by apple, `xcrun`
    // because that will *also* trigger the setup dialog.
    let XCodeCLIToolsInstalled = false
    if (process.platform === 'darwin') {
      const xcodeResult = await runCommand('xcode-select', ['-p'])
      XCodeCLIToolsInstalled = xcodeResult.code === 0
    }

    if (process.platform !== 'darwin' || XCodeCLIToolsInstalled) {
      const version = await getProgramVersion('git')
      process.env.GIT_SUPPORT = '1'
      process.env.GIT_VERSION = version
    }
  } catch (err) {
    // No action needed
  }

  // Make sure the PATH property exists
  if (process.env.PATH === undefined) {
    process.env.PATH = ''
  }

  // Then ensure all required directories exist
  for (const directory of REQUIRED_DIRECTORIES) {
    try {
      await fs.lstat(directory)
    } catch (err) {
      console.log(`[Application] Creating required directory ${directory} ...`)
      await fs.mkdir(directory, { recursive: true })
    }
  }

  // Determine if the platform as Tray support
  try {
    process.env.ZETTLR_IS_TRAY_SUPPORTED = await isTraySupported() ? '1' : '0'
  } catch (err: unknown) {
    process.env.ZETTLR_IS_TRAY_SUPPORTED = '0'
    if (err instanceof Error) {
      process.env.ZETTLR_TRAY_ERROR = err.message
      console.warn(err.message)
    }
  }

  // Finally, remember whether the updates have been disabled at build time.
  // This makes this decision of the packager transparent to users and can help
  // troubleshoot issues. Since `__UPDATES_DISABLED__` is not an actual variable
  // but will be replaced with a string by Webpack, this ensures this
  // information is retained in the final app, even though update code will be
  // removed for good.
  process.env.UPDATES_DISABLED = __UPDATES_DISABLED__

  if (__UPDATES_DISABLED__ === '1') {
    console.warn('This Zettlr binary has been compiled with update checks completely disabled.')
  }

  console.log('[Application] Environment check complete.')
}
