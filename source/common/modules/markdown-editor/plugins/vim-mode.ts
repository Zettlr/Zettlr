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
import { vim, Vim, type CodeMirror } from '@replit/codemirror-vim'
import { configField } from '../util/configuration'
import { editorMetadataFacet } from './editor-metadata'

const ipcRenderer = window.ipc

// This seems to be the interface that the Vim plugin uses to provide args for
// any of the commands. NOTE: I may be wrong, I didn't fully verify this.
interface VimParams {
  argString: string
  args: string[]
  commandName: string
  input: string
  line: any|undefined
  selectionLine: number
}

/**
 * Sends a save-request to the main process.
 *
 * @param   {CodeMirror}       cm      Replit's CodeMirror object
 * @param   {VimParams}        params  Any params to the command
 *
 * @return  {Promise<void>}            Returns the IPC promise
 */
function write (cm: CodeMirror, params: VimParams): Promise<void> {
  console.log(params)
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
  })
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
 * @param   {CodeMirror}       cm      Replit's CodeMirror object
 * @param   {VimParams}        params  Any params to the command
 *
 * @return  {Promise<void>}            Returns the IPC promise
 */
function quit (cm: CodeMirror, params: VimParams): Promise<void> {
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
  })
    .catch(e => console.error(e))
}

// replit's API seems a bit less elegant than the CodeMirror one, but I think
// this is because they also need to support older CM5 setups.
Vim.defineEx('quit', 'q', quit)
Vim.defineEx('write', 'w', write)
Vim.defineEx('wq', 'wq', (cm: CodeMirror, params: VimParams) => {
  // To prevent closing a file before it is written (and, thus, risking a prompt
  // to the user), we wait until the invocation is done and only then request a
  // close of the file.
  write(cm, params).then(() => {
    quit(cm, params)
  })
})

// Remap movement keys
Vim.map('j', 'gj') // Account for line wraps when moving down
Vim.map('k', 'gk') // Account for line wraps when moving up

// Unmap bindings to restore default editor behavior
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
