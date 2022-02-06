/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function checks if some file exists and is a Markdown file
 *
 * END HEADER
 */

import { lstatSync } from 'fs'
import path from 'path'
import { mdFileExtensions, codeFileExtensions } from './valid-file-extensions'

const MD_FILES = mdFileExtensions(true)
const CODE_FILES = codeFileExtensions(true)

/**
 * Returns true if the file is either a Markdown or a recognized code file
 *
 * @param  {string}   p  The path to the file.
 *
 * @return {boolean}     True or false.
 */
export function isMdOrCodeFile (p: string): boolean {
  try {
    const stat = lstatSync(p)
    return stat.isFile() && hasMdOrCodeExt(p)
  } catch (err) {
    return false
  }
}

/**
 * Returns true if the given path has a valid Markdown or Code extension
 *
 * @param   {string}   p  The path to check
 *
 * @return  {boolean}     True or false
 */
export function hasMdOrCodeExt (p: string): boolean {
  return hasMarkdownExt(p) || hasCodeExt(p)
}

/**
 * Has the given path a valid Markdown file extension?
 *
 * @param   {string}   p  The path to check
 *
 * @return  {boolean}     True or false
 */
export function hasMarkdownExt (p: string): boolean {
  const ext = path.extname(p).toLowerCase()
  return MD_FILES.includes(ext)
}

/**
 * Has the given path a valid Code file extension?
 *
 * @param   {string}   p  The path to check
 *
 * @return  {boolean}     True or false
 */
export function hasCodeExt (p: string): boolean {
  const ext = path.extname(p).toLowerCase()
  return CODE_FILES.includes(ext)
}
