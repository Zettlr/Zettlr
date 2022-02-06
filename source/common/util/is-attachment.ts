/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check for attachments.
 *
 * END HEADER
 */

import { extname } from 'path'
import isFile from './is-file'

/**
 * This function determines whether or not a given path describes an attachment.
 * @param  {string}  p The path to be checked.
 * @param  {Boolean} skipExistenceCheck Whether or not to skip the existence check
 * @return {Boolean}   Returns true, if the path is an attachment, or false.
 */
export default function isAttachment (p: string, ext: string[], skipExistenceCheck: boolean = false): boolean {
  let fileExists = skipExistenceCheck ? true : isFile(p)
  return fileExists && ext.includes(extname(p).toLowerCase())
}
