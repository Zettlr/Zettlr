/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        Helper function
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
import { spawn } from 'child_process'
import isFile from '../../common/util/is-file'

/**
 * Contains custom paths that should be present on the process.env.PATH property
 * for the given operating system as reported by process.platform.
 */
const CUSTOM_PATHS = {
  win32: [],
  linux: ['/usr/bin'],
  darwin: [
    '/usr/local/bin',
    '/Library/TeX/texbin'
  ],
  aix: [],
  android: [],
  freebsd: [],
  openbsd: [],
  sunos: [],
  cygwin: [],
  netbsd: []
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
  path.join(app.getPath('userData'), 'defaults') // Defaults files
]

/**
 * Platform specific delimiter (; on Windows, : everywhere else)
 *
 * @var {string}
 */
const DELIM = (process.platform === 'win32') ? ';' : ':'

export default async function environmentCheck (): Promise<void> {
  global.log.info('Performing environment check ...')

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
    global.log.warning(`[Application] Your platform/arch (${process.platform}/${process.arch}) combination is not officially supported. Zettlr might not function correctly.`)
  }

  // We need to check if Pandoc has been bundled with this package.
  // Because if it is, we can simply use that one instead.
  const executable = (process.platform === 'win32') ? 'pandoc.exe' : 'pandoc'
  const pandocPath = path.join(process.resourcesPath, executable)
  if (isFile(pandocPath)) {
    global.log.info(`[Application] Pandoc has been bundled with this release. Path: ${pandocPath}`)
    process.env.PANDOC_PATH = pandocPath
  } else if (!app.isPackaged) {
    // We're in develop mode, so possibly, we have a Pandoc exe. Let's check
    const resPath = path.join(__dirname, '../../resources', executable)
    if (isFile(resPath)) {
      global.log.info(`[Application] App is unpackaged, and Pandoc has been found in the resources directory: ${resPath}`)
      process.env.PANDOC_PATH = resPath
    } else {
      global.log.warning(`[Application] App is unpackaged, but there was no Pandoc executable: ${resPath}`)
    }
  } else {
    global.log.warning('[Application] Pandoc has not been bundled with this release. Falling back to system version instead.')
  }

  // Make sure the PATH property exists
  if (process.env.PATH === undefined) {
    process.env.PATH = ''
  }

  // First integrate the additional paths that we need.
  let tempPATH = process.env.PATH.split(DELIM)

  for (let customPath of CUSTOM_PATHS[process.platform]) {
    // Check for both trailing and non-trailing slashes (to not add any
    // directory more than once)
    let customPathAlt = customPath + '/'
    if (customPath.endsWith('/')) {
      customPathAlt = customPath.substr(0, customPath.length - 1)
    }

    if (!tempPATH.includes(customPath) && !tempPATH.includes(customPathAlt)) {
      tempPATH.push(customPath)
    }
  }

  // Make sure to remove accidental empty strings
  process.env.PATH = tempPATH.filter(e => e.trim() !== '').join(DELIM)

  // Then ensure all required directories exist
  for (let p of REQUIRED_DIRECTORIES) {
    try {
      await fs.lstat(p)
    } catch (e) {
      global.log.info(`Creating required directory ${p} ...`)
      await fs.mkdir(p, { recursive: true })
    }
  }

  try {
    process.env.ZETTLR_IS_TRAY_SUPPORTED = await isTraySupported() ? '1' : '0'
  } catch (err) {
    process.env.ZETTLR_IS_TRAY_SUPPORTED = '0'
    global.log.warning(err.message)
  }

  global.log.info('Environment check complete.')
}

/**
 * Check if system supports a Tray.
 *
 * Returns true on Windows and MacOS.
 * Returns true on Linux with Gnome desktop if Gnome Extension
 * 'KStatusNotifierItem/AppIndicator Support' is installed, otherwise throws
 * an {Error} with the reason why.
 * Returns true on Linux with other desktops. e.g. KDE, XFCE, etc.
 *
 * @return {*}  {Promise<boolean>} If supported, returns true. Never returns
 *              false.
 * @throws {Error} Details why the Tray is not supported; or
 *                 Details the error if an error occurred while checking Tray
 *                 support.
 */
export async function isTraySupported (): Promise<boolean> {
  const isLinux = process.platform === 'linux'
  if (isLinux) {
    if (process.env.XDG_CURRENT_DESKTOP === 'GNOME') {
      return await new Promise<boolean>((resolve, reject) => {
        const shellProcess = spawn('gsettings', [ 'get', 'org.gnome.shell', 'enabled-extensions' ])
        let out = ''

        shellProcess.stdout.on('data', (data) => {
          out = out.concat(data.toString())
        })

        shellProcess.on('close', (code, signal) => {
          if (code !== 0) {
            reject(new Error('Tray is not supported. Gnome ' +
              'Extension \'KStatusNotifierItem/AppIndicator Support\' is ' +
              'required for Tray support on the Gnome Desktop.'
            )) // trans('system.error.tray_not_supported')
          } else if (out.includes("'appindicatorsupport@rgcjonas.gmail.com'")) {
            resolve(true)
          } else {
            reject(new Error('Tray is not supported. Gnome ' +
              'Extension \'KStatusNotifierItem/AppIndicator Support\' is ' +
              'required for Tray support on the Gnome Desktop.'
            )) // trans('system.error.tray_not_supported')
          }
        })

        // Reject on errors.
        shellProcess.on('error', (err) => {
          reject(err)
        })
      })
    }
  }
  return (true)
}
