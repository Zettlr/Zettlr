/**
 * BEGIN HEADER
 *
 * Contains:        Utility class
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains functionality to generate regular
 *                  expressions to be used across the application for
 *                  consistent behaviour.
 *
 * END HEADER
 */

/**
 * Returns a regular expression that matches file IDs as in the settings
 *
 * @param   {boolean}  exact      If true, makes sure that the full string needs to match
 *
 * @return  {RegExp}              The compiled Regular Expression
 */
export function getIDRE (idGenPattern: string, exact: boolean = false): RegExp {
  let idRegExpString: string = idGenPattern
  // Make sure the ID definitely has at least one
  // capturing group to not produce errors.
  if (!(/\(.+?\)/.test(idRegExpString))) {
    idRegExpString = `(${idRegExpString})`
  }

  return RegExp(
    (exact) ? `^${idRegExpString}$` : idRegExpString,
    'g'
  )
}

/**
 * Returns a regular expression that matches Markdown links.
 *
 * @param   {boolean}  global  whether the expression should match globally
 *
 * @return  {RegExp}           The compiled Regular Expression
 */
export function getLinkRE (global: boolean = false): RegExp {
  return RegExp(
    /^.+\.[a-z0-9]+/.source,
    (global) ? 'gi' : 'i')
}

/**
 * Returns a regular expression that matches URL protocols (e.g. http://)
 *
 * @param   {boolean}  multiline  Whether or not the expression should be multiline
 *
 * @return  {RegExp}           The wanted regular expression
 */
export function getProtocolRE (multiline: boolean = false): RegExp {
  let flag = (multiline) ? 'm' : ''
  return RegExp(
    /^([a-z]{1,10}):\/\//,
    'i' + flag
  )
}
