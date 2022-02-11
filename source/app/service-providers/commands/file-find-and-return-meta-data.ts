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
    super(app, ['file-find-and-return-meta-data'])
  }

  /**
      * Removes a file.
      * @param {String} evt The event name
      * @param  {Object} arg the parameters of the file to be deleted
      * @return {Boolean} Whether the file was successfully deleted.
      */
  async run (evt: string, arg: any): Promise<any> {
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
    return null
  }
}
