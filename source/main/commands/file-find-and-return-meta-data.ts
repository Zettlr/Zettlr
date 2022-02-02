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
import { mdFileExtensions } from '@common/get-file-extensions'

const FILETYPES = mdFileExtensions(true)

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
    let file
    let metaData
    // It might be linked by ID
    file = this._app.getFileSystem().findExact((arg as string), 'id')
    if (file !== undefined) {
      metaData = await this._app.getFileSystem().getFileContents(file)
    }
    // It's not an ID, so search each type of file
    if (file === undefined) {
      for (let type of FILETYPES) {
        file = this._app.getFileSystem().findExact((arg as string) + type, 'name')
        if (file !== undefined) {
          // If we find it, then return it
          metaData = await this._app.getFileSystem().getFileContents(file)
          break
        }
      }
    }
    // Get the contents of the file such as:
    if (metaData !== undefined) {
      metaData = metaData as MDFileMeta // forces MDFileMeta rather than CodeFileMeta
      let content = metaData.content.substring(0, 200) // The content
      if (metaData.content.length > 200) {
        content += '...'
      }
      let wordCount = metaData.wordCount // The word count
      let title = metaData.name // The file name

      // use luxon to get a local time difference
      return ([ title, content, wordCount, metaData.modtime ])
    }
    // We can't find it, so return Not Found
    return null
  }
}
