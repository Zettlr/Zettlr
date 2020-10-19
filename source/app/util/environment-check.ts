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

  process.env.PATH = tempPATH.join(DELIM)

  // Then ensure all required directories exist
  for (let p of REQUIRED_DIRECTORIES) {
    try {
      await fs.lstat(p)
    } catch (e) {
      global.log.info(`Creating required directory ${p} ...`)
      await fs.mkdir(p)
    }
  }

  global.log.info('Environment check complete.')
}
