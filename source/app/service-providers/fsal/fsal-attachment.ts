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
import type { OtherFileDescriptor } from '@dts/common/fsal'
import type FSALCache from './fsal-cache'
import { getFilesystemMetadata } from './util/get-fs-metadata'

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
    const metadata = await getFilesystemMetadata(absPath)
    attachment.modtime = metadata.modtime
    attachment.creationtime = metadata.birthtime
    attachment.size = metadata.size
  } catch (err: any) {
    err.message = `Error reading file ${absPath};: ${err.message as string}`
    throw err // Rethrow
  }

  if (!await cache.has(attachment.path)) {
    await cache.set(attachment.path, attachment)
  }

  return attachment
}
