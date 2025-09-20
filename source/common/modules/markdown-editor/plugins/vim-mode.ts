/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror Vim
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is responsible for extending the Vim mode API, and
 *                  providing an extension that can be used in the input
 *                  compartments. NOTE that this only works in MainEditor
 *                  instances, not code editors, since the latter don't provide
 *                  the required state fields.
 *
 * END HEADER
 */

import type { Extension } from '@codemirror/state'
import { type ExParams, vim, Vim, type CodeMirror } from '@replit/codemirror-vim'
import { configField } from '../util/configuration'
import { editorMetadataFacet } from './editor-metadata'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'

const ipcRenderer = window.ipc

/**
 * Sends a save-request to the main process.
 *
 * @param   {CodeMirror}       cm       Replit's CodeMirror object
 * @param   {ExParams}         _params  Any params to the command
 *
 * @return  {Promise<void>}             Returns the IPC promise
 */
function write (cm: CodeMirror, _params: ExParams): Promise<void> {
  try {
    cm.cm6.state.field(configField)
  } catch (err: any) {
    console.error('Cannot execute write command: configField missing from EditorState')
    return new Promise((resolve, reject) => reject())
  }

  // Grab the required information from the editor state
  const filePath = cm.cm6.state.field(configField).metadata.path

  // Return the promise so that the chained wq command can catch it
  return ipcRenderer.invoke('documents-provider', {
    command: 'save-file',
    payload: { path: filePath }
  } as DocumentManagerIPCAPI)
    .then(result => {
      if (result !== true) {
        console.error('Retrieved a falsy result from main, indicating an error with saving the file.')
      }
    })
    .catch(e => console.error(e))
}

/**
 * Sends a close-file command to the main process.
 *
 * @param   {CodeMirror}       cm       Replit's CodeMirror object
 * @param   {ExParams}         _params  Any params to the command
 *
 * @return  {Promise<void>}             Returns the IPC promise
 */
function quit (cm: CodeMirror, _params: ExParams): Promise<void> {
  // Grab the required information from the editor state
  const filePath = cm.cm6.state.field(configField).metadata.path
  const { leafId, windowId } = cm.cm6.state.facet(editorMetadataFacet)

  if (leafId === undefined || windowId === undefined) {
    throw new Error('Cannot close file: Leaf or Window ID were empty!')
  }

  // Request closing of the editor with main
  return ipcRenderer.invoke('documents-provider', {
    command: 'close-file',
    payload: {
      path: filePath,
      windowId: windowId,
      leafId: leafId
    }
  } as DocumentManagerIPCAPI)
    .catch(e => console.error(e))
}

// replit's API seems a bit less elegant than the CodeMirror one, but I think
// this is because they also need to support older CM5 setups.
Vim.defineEx('quit', 'q', quit)
Vim.defineEx('write', 'w', write)
Vim.defineEx('wq', 'wq', (cm: CodeMirror, params: ExParams) => {
  // To prevent closing a file before it is written (and, thus, risking a prompt
  // to the user), we wait until the invocation is done and only then request a
  // close of the file.
  write(cm, params).then(() => {
    quit(cm, params).catch(err => console.error(err))
  }).catch(err => console.error(err))
})

// Remap movement keys
// @ts-expect-error The types are not properly updated
Vim.map('j', 'gj') // Account for line wraps when moving down
// @ts-expect-error The types are not properly updated
Vim.map('k', 'gk') // Account for line wraps when moving up

// Unmap bindings to restore default editor behavior
// @ts-expect-error The types are not properly updated
Vim.unmap('<C-f>') // Allow invoking Ctrl+F search from all modes
Vim.unmap('<C-t>', 'insert') // Allow task item shortcut in Insert mode
Vim.unmap('<C-c>', 'insert') // Allow using Ctrl+C without exiting Insert mode

// Why do we do this, even though it seems somewhat pointless? Well, first to
// ensure that we have a central place where we modify the Vim extension, and
// two, in case we can actually provide extensions inside the state here, we
// have everything set up. Also, this prevents registering multiple Ex's here.
export function vimPlugin (): Extension {
  return [vim()]
} 
