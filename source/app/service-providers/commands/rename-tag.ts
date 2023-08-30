/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RenameTag command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command renames a tag across all files.
 *
 * END HEADER
 */

import replaceTags from '@common/util/replace-tags'
import type { MDFileDescriptor } from '@dts/common/fsal'
import { promises as fs } from 'fs'
import ZettlrCommand from './zettlr-command'
import { dialog } from 'electron'
import { trans } from '@common/i18n-main'

export default class RenameTag extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'rename-tag')
  }

  /**
    * Remove a directory.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash of containing and name of new dir.
    */
  async run (evt: string, arg: any): Promise<boolean> {
    const oldName: string = arg.oldName
    const newName: string = arg.newName

    // First, retrieve all files from the FSAL
    const allFiles = this._app.fsal.getAllFiles()
      .filter(d => d.type === 'file') as MDFileDescriptor[]

    // Then, retain only the relevant files
    const relevantFiles = allFiles.filter((d: MDFileDescriptor) => d.tags.includes(oldName))

    const response = await dialog.showMessageBox({
      title: trans('Confirm'),
      message: trans('Replace tag "%s" with "%s" across %s files?', oldName, newName, relevantFiles.length),
      buttons: [
        trans('Yes'),
        trans('Cancel')
      ],
      defaultId: 1
    })

    if (response.response === 1) {
      return false // Do not replace the tag.
    }

    // Lastly, do the replacing file by file. NOTE: This rests on the fact that
    // the FSAL will pick up those changes via the file system itself.
    for (const file of relevantFiles) {
      const content = await fs.readFile(file.path, 'utf-8')
      const newContent = replaceTags(content, oldName, newName)
      if (newContent !== content) {
        await fs.writeFile(file.path, newContent, 'utf-8')
        this._app.log.info(`[Application] Replaced tag "${oldName}" with "${newName}" in file ${file.path}`)
      } else {
        this._app.log.warning(`[Application] Could not replace "${oldName}" with "${newName}" in file ${file.path}. Note that the tag replacer does not yet work with comma-separated keyword lists.`)
      }
    }

    return true
  }
}
