/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file offers a function that allows additional
 *                  directories to be added to the global PATH variable.
 *
 * END HEADER
 */

import type LogProvider from '@providers/log'

/**
 * Adds the given path to PATH.
 *
 * @param  {LogProvider} logger  The logger associated with the app
 * @param  {string}      path    The path to add to PATH
 * @param  {string}      method  The method to use when adding the path.
 */
export default function addToPath (logger: LogProvider, path: string, method: 'unshift'|'push'): void {
  if (process.env.PATH === undefined) {
    process.env.PATH = ''
  }

  const DELIM = (process.platform === 'win32') ? ';' : ':'
  const tempPATH = process.env.PATH.split(DELIM)

  if (method === 'unshift') {
    tempPATH.unshift(path)
  } else if (method === 'push') {
    tempPATH.push(path)
  }

  process.env.PATH = tempPATH.join(DELIM)
  logger.info(`[Application] Added ${path} to PATH.`)
}
