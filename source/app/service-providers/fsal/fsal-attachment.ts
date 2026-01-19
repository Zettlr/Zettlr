/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseAttachment function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The attachment dummy object builder.
 *
 * END HEADER
 */

import path from 'path'
import { promises as fs } from 'fs'
import type { OtherFileDescriptor } from '@dts/common/fsal'
import type FSALCache from './fsal-cache'

export async function parse (absPath: string, cache: FSALCache): Promise<OtherFileDescriptor> {
  let attachment: OtherFileDescriptor = {
    path: absPath,
    name: path.basename(absPath),
    ext: path.extname(absPath),
    size: 0,
    dir: path.dirname(absPath),
    modtime: 0,
    creationtime: 0,
    type: 'other'
  }

  try {
    // Get lstat
    let stat = await fs.lstat(absPath)
    attachment.modtime = stat.mtime.getTime() // stat.ctimeMs DEBUG: Switch to mtimeMs for the time being
    attachment.creationtime = stat.birthtime.getTime()
    attachment.size = stat.size
  } catch (err: any) {
    err.message = `Error reading file ${absPath};: ${err.message as string}`
    throw err // Rethrow
  }

  if (!await cache.has(attachment.path)) {
    await cache.set(attachment.path, attachment)
  }

  return attachment
}
