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
import { MDFileMeta } from '@dts/common/fsal'

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
   * @return  {MDFileMeta|undefined|string[]}       Returns a MetaDescriptor, undefined, or an array
   */
  async run (evt: string, arg: any): Promise<MDFileMeta|undefined|any[]> {
    // Quick'n'dirty command to return the Meta descriptor for the given query
    if (evt === 'find-exact') {
      const descriptor = this._app.fsal.findExact(arg)
      if (descriptor === undefined) {
        return undefined
      }
      return this._app.fsal.getMetadataFor(descriptor) as MDFileMeta
    }

    const file = this._app.fsal.findExact(arg)
    if (file !== undefined) {
      const metaData = await this._app.fsal.getFileContents(file) as MDFileMeta
      let content = metaData.content.substring(0, 200) // The content
      if (metaData.content.length > 200) {
        content += '...'
      }
      const wordCount = metaData.wordCount // The word count
      const title = metaData.name // The file name

      return ([ title, content, wordCount, metaData.modtime ])
    }

    // We can't find it, so return Not Found
    return undefined
  }
}
