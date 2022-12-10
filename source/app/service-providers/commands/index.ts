/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Command loader
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file simply imports all commands, and exports them in
 *                  a unified object for easy instantiation by zettlr.ts.
 *
 * END HEADER
 */

import DirDelete from './dir-delete'
import DirNewProject from './dir-new-project'
import DirNew from './dir-new'
import DirProjectExport from './dir-project-export'
import DirRemoveProject from './dir-remove-project'
import DirRename from './dir-rename'
import DirRescan from './dir-rescan'
import DirSetIcon from './dir-set-icon'
import DirSort from './dir-sort'
import Export from './export'
import FileDelete from './file-delete'
import FileDuplicate from './file-duplicate'
import FileNew from './file-new'
import FileRename from './file-rename'
import FileSearch from './file-search'
import ForceOpen from './force-open'
import FileFindAndReturnMetaData from './file-find-and-return-meta-data'
import ImportLangFile from './import-lang-file'
import ImportFiles from './import'
import IncreasePomodoro from './increase-pomodoro'
import OpenAttachment from './open-attachment'
import Print from './print'
import RequestMove from './request-move'
import RootClose from './root-close'
import RootOpen from './root-open'
import SaveImageFromClipboard from './save-image-from-clipboard'
import TutorialOpen from './tutorial-open'
import UpdateProjectProperties from './update-project-properties'
import UpdateUserDictionary from './update-user-dictionary'
import ProviderContract from '@providers/provider-contract'
import AppServiceContainer from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'
import SetOpenDirectory from './set-open-directory'
import { clipboard, ipcMain, nativeImage } from 'electron'
import isFile from '@common/util/is-file'
import isDir from '@common/util/is-dir'

export const commands = [
  DirDelete,
  DirNewProject,
  DirNew,
  DirProjectExport,
  DirRemoveProject,
  DirRename,
  DirRescan,
  DirSetIcon,
  DirSort,
  Export,
  FileDelete,
  FileDuplicate,
  FileNew,
  FileRename,
  FileSearch,
  FileFindAndReturnMetaData,
  ForceOpen,
  ImportFiles,
  ImportLangFile,
  IncreasePomodoro,
  OpenAttachment,
  Print,
  RequestMove,
  RootClose,
  RootOpen,
  SaveImageFromClipboard,
  SetOpenDirectory,
  TutorialOpen,
  UpdateProjectProperties,
  UpdateUserDictionary
]

export default class CommandProvider extends ProviderContract {
  private readonly _commands: ZettlrCommand[]

  // TODO: Right now this just injects the full service container into the
  // commands, but it mayt be better to only provide those which are actually
  // required.
  constructor (private readonly _app: AppServiceContainer) {
    super()
    // Load available commands
    this._commands = commands.map(Command => new Command(this._app))

    // Set up the command listener
    ipcMain.handle('application', async (event, { command, payload }) => {
      return await this.run(command, payload)
    })
  }

  /**
   * Runs a command through the application pipeline
   *
   * @param   {string}  command  The command to run
   * @param   {any}     payload  Any payload, as required depending on the command.
   *
   * @return  {Promise<any>}     The return from running the command
   */
  async run (command: string, payload: any): Promise<any> {
    // FIRST: Try to run a minimal command for which its own custom function
    // wouldn't make sense.
    if (command === 'get-statistics-data') {
      return this._app.fsal.statistics
    } else if (command === 'get-filetree-events') {
      return this._app.fsal.filetreeHistorySince(payload)
    } else if (command === 'get-descriptor') {
      if (isFile(payload)) {
        return await this._app.fsal.getDescriptorForAnySupportedFile(payload)
      } else if (isDir(payload)) {
        return await this._app.fsal.getAnyDirectoryDescriptor(payload)
      } else {
        this._app.log.error(`[Application] Could not return descriptor for ${String(payload)}: Neither file nor directory.`)
      }
    } else if (command === 'get-open-directory') {
      const openDir = this._app.fsal.openDirectory
      if (openDir === null) {
        return null
      }

      return openDir
    } else if (command === 'next-file') {
      // Trigger a "forward" command on the document manager
      // await this._app.documents.forward()
      // TODO!!!
      return true
    } else if (command === 'previous-file') {
      // Trigger a "back" command on the document manager
      // await this._app.documents.back()
      // TODO!!!
      return true
    } else if (command === 'copy-img-to-clipboard') {
      // We should copy the contents of an image file to clipboard. Payload
      // contains the image path. We can rely on the Electron framework here.
      let imgPath: string = payload
      if (imgPath.startsWith('safe-file://')) {
        imgPath = imgPath.replace('safe-file://', '')
      } else if (imgPath.startsWith('file://')) {
        imgPath = imgPath.replace('file://', '')
      }

      const img = nativeImage.createFromPath(imgPath)

      if (!img.isEmpty()) {
        clipboard.writeImage(img)
      }
      return true
    } else if (command === 'get-file-contents') {
      // Some renderer's editor has requested a file
      return await this._app.fsal.loadAnySupportedFile(payload)
    } else if (command === 'open-preferences') {
      this._app.windows.showPreferences()
      return true
    } else if (command === 'open-stats-window') {
      this._app.windows.showStatsWindow()
      return true
    } else if (command === 'open-update-window') {
      this._app.windows.showUpdateWindow()
    } else if (command === 'open-project-preferences') {
      this._app.windows.showProjectPropertiesWindow(payload)
    } else {
      // ELSE: If the command has not yet been found, try to run one of the
      // bigger commands
      const cmd: ZettlrCommand|undefined = this._commands.find((elem: ZettlrCommand) => elem.respondsTo(command))
      if (cmd !== undefined) {
        // Return the return value of the command, if there is any
        try {
          return await cmd.run(command, payload)
        } catch (err: any) {
          this._app.log.error('[Application] Error received while running command: ' + String(err.message), err)
          return false
        }
      } else {
        this._app.log.warning(`[Application] Received a request to run command ${command}, but it's not registered.`)
      }
    }
  }

  async shutdown (): Promise<void> {
    this._app.log.verbose('Command Provider shutting down ...')
  }
}
