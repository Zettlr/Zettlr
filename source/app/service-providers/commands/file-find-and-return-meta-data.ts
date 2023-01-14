/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileFindAndReturnMetaData command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command finds the absolute path of a file, and returns
 *                  the file's meta data
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { MDFileDescriptor } from '@dts/common/fsal'

const MAX_FILE_PREVIEW_LENGTH = 300

export default class FilePathFindMetaData extends ZettlrCommand {
  constructor (app: any) {
    super(app, [ 'find-exact', 'file-find-and-return-meta-data' ])
  }

  /**
   * This command serves two purposes: For the MarkdownEditor component, it
   * returns an easy to consume metadata object, and for the GraphView it offers
   * a convenient access to the internal link resolution engine to resolve links
   *
   * @param   {string}                         evt  The event
   * @param   {arg}                            arg  The argument, should be a query string
   *
   * @return  {MDFileDescriptor|undefined|string[]} Returns a MetaDescriptor, undefined, or an array
   */
  async run (evt: string, arg: any): Promise<MDFileDescriptor|undefined|any[]> {
    // Quick'n'dirty command to return the Meta descriptor for the given query
    const descriptor = this._app.fsal.findExact(arg)
    if (descriptor === undefined) {
      return undefined
    }

    if (evt === 'find-exact') {
      return descriptor
    }

    const contents = await this._app.fsal.loadAnySupportedFile(descriptor.path)
    const lines = contents.split('\n')

    let preview = ''
    let i = 0
    while (preview.length <= MAX_FILE_PREVIEW_LENGTH && i < 10) {
      const remainingChars = MAX_FILE_PREVIEW_LENGTH - preview.length
      if (lines[i].length <= remainingChars) {
        preview += lines[i] + '\n'
      } else {
        preview += lines[i].slice(0, remainingChars) + '…'
      }
      i++
    }

    return [
      descriptor.name,
      preview,
      descriptor.wordCount,
      descriptor.modtime
    ]
  }
}
