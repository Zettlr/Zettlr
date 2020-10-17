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
import hash from '../../../common/util/hash'
import {
  OtherFileDescriptor,
  OtherFileMeta,
  DirDescriptor,
  DescriptorType
} from './types'

export async function parse (absPath: string, parent: DirDescriptor): Promise<OtherFileDescriptor> {
  let attachment = {
    'parent': parent,
    'path': absPath,
    'name': path.basename(absPath),
    'hash': hash(absPath),
    'ext': path.extname(absPath),
    'dir': path.dirname(absPath),
    'modtime': 0,
    'creationtime': 0,
    'type': DescriptorType.Other
  }

  try {
    // Get lstat
    let stat = await fs.lstat(absPath)
    attachment.modtime = stat.mtime.getTime() // stat.ctimeMs DEBUG: Switch to mtimeMs for the time being
    attachment.creationtime = stat.birthtime.getTime()
  } catch (e) {
    global.log.error('Error reading file ' + absPath, e)
    throw e // Rethrow
  }

  return attachment
}

export function metadata (attachment: OtherFileDescriptor): OtherFileMeta {
  return {
    // By only passing the hash, the object becomes
    // both lean AND it can be reconstructed into a
    // circular structure with NO overheads in the
    // renderer.
    'parent': attachment.parent.hash,
    'path': attachment.path,
    'name': attachment.name,
    'hash': attachment.hash,
    'ext': attachment.ext,
    'type': attachment.type,
    'modtime': attachment.modtime,
    'creationtime': attachment.creationtime,
    'dir': attachment.dir

  }
}
