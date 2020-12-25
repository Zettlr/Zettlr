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
  path.join(app.getPath('userData'), 'logs') // Log path
]

/**
 * Platform specific delimiter (; on Windows, : everywhere else)
 *
 * @var {string}
 */
const DELIM = (process.platform === 'win32') ? ';' : ':'

export default async function environmentCheck (): Promise<void> {
  global.log.info('Performing environment check ...')

  // We need to check if Pandoc has been bundled with this package.
  // Because if it is, we can simply use that one instead.
  const executable = (process.platform === 'win32') ? 'pandoc.exe' : 'pandoc'
  const pandocPath = path.join(process.resourcesPath, executable)
  if (isFile(pandocPath)) {
    global.log.info(`[Application] Pandoc has been bundled with this release. Path: ${pandocPath}`)
    process.env.PANDOC_PATH = pandocPath
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

  global.log.info('Environment check complete.')
}
