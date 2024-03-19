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
import { promises as fs } from 'fs'
import isFile from '../../common/util/is-file'
import isTraySupported from './is-tray-supported'
import { getProgramVersion } from './get-program-version'
import fixPath from 'fix-path'

export default async function environmentCheck (): Promise<void> {
  console.log('[Application] Performing environment check ...')

  // This is necessary on macOS and Linux, because GUI applications may not
  // inherit the same PATH environment variable as terminal programs. This is
  // necessary, however, to detect additional helper programs, such as quarto.
  fixPath()

  /**
   * Contains custom paths that should be present on the process.env.PATH
   * property for the given operating system as reported by process.platform.
   *
   * @deprecated With the addition of `fixPath`, it is highly likely that we do
   * not need this contraption anymore.
   */
  const CUSTOM_PATHS: { [key in NodeJS.Platform]: string[] } = {
    win32: [],
    linux: ['/usr/bin'],
    darwin: [
      // LaTeX binary directory
      '/Library/TeX/texbin',
      // Homebrew default for Intel Macs
      '/usr/local/bin',
      // Homebrew default for M1 Macs
      '/opt/homebrew/bin'
    ],
    aix: [],
    android: [],
    freebsd: [],
    openbsd: [],
    sunos: [],
    cygwin: [],
    netbsd: [],
    haiku: []
  }

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

  /**
   * Platform specific delimiter (; on Windows, : everywhere else)
   *
   * @var {string}
   */
  const DELIM = (process.platform === 'win32') ? ';' : ':'

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

  // Finally, determine if git is installed on this machine
  try {
    const version = await getProgramVersion('git')
    process.env.GIT_SUPPORT = '1'
    process.env.GIT_VERSION = version
  } catch (err) {
    process.env.GIT_SUPPORT = '0'
  }

  // Make sure the PATH property exists
  if (process.env.PATH === undefined) {
    process.env.PATH = ''
  }

  // First integrate the additional paths that we need.
  let tempPATH = process.env.PATH.split(DELIM)

  for (const customPath of CUSTOM_PATHS[process.platform]) {
    // Check for both trailing and non-trailing slashes (to not add any
    // directory more than once)
    let customPathAlt = customPath + '/'
    if (customPath.endsWith('/')) {
      customPathAlt = customPath.substring(0, customPath.length - 1)
    }

    if (!tempPATH.includes(customPath) && !tempPATH.includes(customPathAlt)) {
      tempPATH.push(customPath)
    }
  }

  // Make sure to remove accidental empty strings
  process.env.PATH = tempPATH.filter(e => e.trim() !== '').join(DELIM)

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
  } catch (err: any) {
    process.env.ZETTLR_IS_TRAY_SUPPORTED = '0'
    process.env.ZETTLR_TRAY_ERROR = err.message
    console.warn(err.message)
  }

  console.log('[Application] Environment check complete.')
}
