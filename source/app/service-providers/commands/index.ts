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
import FetchLinkPreview from './fetch-link-preview'
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
import LanguageTool from './language-tool'
import OpenAttachment from './open-attachment'
import OpenAuxWindow from './open-aux-window'
import Print from './print'
import RequestMove from './request-move'
import RootClose from './root-close'
import RootOpen from './root-open'
import SaveImageFromClipboard from './save-image-from-clipboard'
import TutorialOpen from './tutorial-open'
import UpdateProjectProperties from './update-project-properties'
import UpdateUserDictionary from './update-user-dictionary'
import ProviderContract from '@providers/provider-contract'
import { type AppServiceContainer } from 'source/app/app-service-container'
import type ZettlrCommand from './zettlr-command'
import { clipboard, ipcMain, nativeImage } from 'electron'
import enumLangFiles from '@common/util/enum-lang-files'
import enumDictFiles from '@common/util/enum-dict-files'
import RenameTag from './rename-tag'

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
  FetchLinkPreview,
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
  LanguageTool,
  OpenAttachment,
  OpenAuxWindow,
  Print,
  RenameTag,
  RequestMove,
  RootClose,
  RootOpen,
  SaveImageFromClipboard,
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
      if (typeof command === 'string') {
        return await this.run(command, payload)
      } else {
        throw new Error(`[Commands] Could not run command "${String(command)}": Not a string`)
      }
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
      return this._app.workspaces.getStatistics()
    } else if (command === 'get-descriptor' && typeof payload === 'string') {
      if (await this._app.fsal.isFile(payload)) {
        return await this._app.fsal.getDescriptorForAnySupportedFile(payload)
      } else if (await this._app.fsal.isDir(payload)) {
        return await this._app.fsal.getAnyDirectoryDescriptor(payload)
      } else {
        this._app.log.error(`[Application] Could not return descriptor for ${String(payload)}: Neither file nor directory.`)
      }
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

      // Due to the colons in the drive letters on Windows, the pathname will
      // look like this: /C:/Users/Documents/test.jpg
      // See: https://github.com/Zettlr/Zettlr/issues/5489
      if (/^\/[A-Z]:/i.test(imgPath)) {
        imgPath = imgPath.slice(1)
      }

      const img = nativeImage.createFromPath(imgPath)

      if (!img.isEmpty()) {
        clipboard.writeImage(img)
      }
      return true
    } else if (command === 'get-file-contents' && typeof payload === 'string') {
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
    } else if (command === 'open-project-preferences' && typeof payload === 'string') {
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
      } else if (command === 'get-available-languages') {
        return enumLangFiles().map(elem => elem.tag)
      } else if (command === 'get-available-dictionaries') {
        return enumDictFiles().map(elem => elem.tag)
      } else {
        this._app.log.warning(`[Application] Received a request to run command ${command}, but it's not registered.`)
      }
    }
  }

  async shutdown (): Promise<void> {
    this._app.log.verbose('Command Provider shutting down ...')
  }
}
