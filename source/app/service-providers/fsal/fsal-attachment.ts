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
import { shell } from 'electron'

export async function parse (absPath: string): Promise<OtherFileDescriptor> {
  let attachment: OtherFileDescriptor = {
    root: false, // other files are never roots
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

  return attachment
}

export async function reparseChangedFile (attachment: OtherFileDescriptor): Promise<void> {
  let stat = await fs.lstat(attachment.path)
  attachment.modtime = stat.mtime.getTime() // stat.ctimeMs DEBUG: Switch to mtimeMs for the time being
  attachment.creationtime = stat.birthtime.getTime()
  attachment.size = stat.size
}

export async function remove (fileObject: OtherFileDescriptor, deleteOnFail: boolean): Promise<void> {
  try {
    await shell.trashItem(fileObject.path)
  } catch (err: any) {
    if (deleteOnFail) {
      // If this function throws, there's really something off and we shouldn't recover.
      await fs.unlink(fileObject.path)
    } else {
      err.message = `[FSAL File] Could not remove file ${fileObject.path}: ${String(err.message)}`
      throw err
    }
  }
}
