/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileFindAndReturn command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command finds the absolute path of a file, and returns
 *                  the file's descriptor (including contents)
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { filetypes as FILETYPES } from '../../common/data.json'
import { MDFileMeta } from '../modules/fsal/types'
import { DateTime } from 'luxon'
import formatDate from '../../common/util/format-date'
import { systemPreferences } from 'electron'


export default class FilePathFindMetaData extends ZettlrCommand {
  constructor(app: any) {
    super(app, ['file-find-and-return-meta-data'])
  }

  /**
      * Removes a file.
      * @param {String} evt The event name
      * @param  {Object} arg the parameters of the file to be deleted
      * @return {Boolean} Whether the file was successfully deleted.
      */
  async run(evt: string, arg: any): Promise<any> {
    // Initialise the file as the result of findExact failing
    let file
    let MetaData
    // It might be linked by ID
    file = this._app.getFileSystem().findExact((arg as string), 'id')
    if (file !== undefined) {
      MetaData = await this._app.getFileSystem().getFileContents(file)
    }
    // It's not an ID, so search each type of file
    if (file === undefined) {
      for (let type of FILETYPES) {
        file = this._app.getFileSystem().findExact((arg as string) + type, 'name')
        if (file !== undefined) {
          // If we find it, then return it
          MetaData = await this._app.getFileSystem().getFileContents(file)
        }
      }
    }
    // Get the contents of the file such as:
    if (MetaData !== undefined) {
      MetaData = <MDFileMeta>MetaData
      let content = MetaData.content.substring(0, 200)
      if (MetaData.content.length > 200) {
        content += '...'
      }
      let wordCount = MetaData.wordCount // The word count
      let title = MetaData.name // The file name

      // use luxon to get a local time difference
      let time = formatDate(MetaData.modtime)
      return ([title,content,wordCount,time])
    }
    // We can't find it, so return Not Found
    return null
  }
}
