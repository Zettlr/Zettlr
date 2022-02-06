/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TutorialOpen command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command copies over the tutorial files and opens them.
 *
 * END HEADER
 */

import path from 'path'
import { promises as fs } from 'fs'
import ZettlrCommand from './zettlr-command'
import { app } from 'electron'
import isDir from '@common/util/is-dir'
import findLangCandidates from '@common/util/find-lang-candidates'

export default class TutorialOpen extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'tutorial-open')
  }

  /**
   * Sorts a directory according to the argument
   * @param {String} evt The event name
   * @param  {Object} arg An object containing both a hash and a sorting type
   */
  async run (evt: string, arg: any): Promise<any> {
    const tutorialPath = path.join(__dirname, 'tutorial')
    const targetPath = path.join(app.getPath('documents'), 'Zettlr Tutorial')
    const availableLanguages = await fs.readdir(tutorialPath, { 'encoding': 'utf8' })

    const candidates = availableLanguages
      .map(e => { return { 'tag': e, 'path': path.join(tutorialPath, e) } })
      .filter(e => isDir(e.path))

    const { exact, close } = findLangCandidates(this._app.config.get('appLang'), candidates)

    let tutorial = path.join(tutorialPath, 'en')
    if (exact !== undefined) {
      tutorial = exact.path
    } else if (close !== undefined) {
      tutorial = close.path
    }

    // Now we have both a target and a language candidate, let's copy over the files!
    try {
      await fs.lstat(targetPath)
      this._app.log.info(`The directory ${targetPath} already exists.`)
    } catch (err) {
      await fs.mkdir(targetPath)

      // Now copy over every file from the directory
      const tutorialFiles = await fs.readdir(tutorial, { 'encoding': 'utf8' })
      for (const file of tutorialFiles) {
        await fs.copyFile(path.join(tutorial, file), path.join(targetPath, file))
      }
      this._app.log.info('Successfully copied the tutorial files', tutorialFiles)
    }
    // Now the last thing to do is set it as open
    await this._app.commands.run('roots-add', [targetPath])
    const tutorialDirectory = this._app.fsal.findDir(targetPath)
    if (tutorialDirectory !== null) {
      this._app.fsal.openDirectory = tutorialDirectory
      await this._app.documents.openFile(path.join(targetPath, 'welcome.md'), true)
    }
  }
}
