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
import FileClose from './file-close'
import FileDelete from './file-delete'
import FileDuplicate from './file-duplicate'
import FileNew from './file-new'
import FileRename from './file-rename'
import FileSave from './file-save'
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
import SaveImageFromClipboard from './save-image-from-clipboard'
import SortOpenFiles from './sort-open-files'
import UpdateProjectProperties from './update-project-properties'
import UpdateUserDictionary from './update-user-dictionary'

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
  FileClose,
  FileDelete,
  FileDuplicate,
  FileNew,
  FileRename,
  FileSave,
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
  SaveImageFromClipboard,
  SortOpenFiles,
  UpdateProjectProperties,
  UpdateUserDictionary
]
