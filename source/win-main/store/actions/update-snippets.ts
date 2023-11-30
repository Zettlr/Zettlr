/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateRelatedFilesAction
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Updates the list of related files
 *
 * END HEADER
 */

import { type ActionContext } from 'vuex'
import { type ZettlrState } from '..'

const ipcRenderer = window.ipc

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  // First reset, default is no snippets
  context.commit('snippets', [])

  // Now we have to pair two types of calls to the assets provider to get all
  // snippets: First a call to list all snippets, and then one `get` call to
  // retrieve its file contents.
  const snippetNames: string[] = await ipcRenderer.invoke('assets-provider', {
    command: 'list-snippets'
  })

  const snippets: Array<{ name: string, content: string }> = []

  for (const snippet of snippetNames) {
    const content: string = await ipcRenderer.invoke('assets-provider', {
      command: 'get-snippet',
      payload: { name: snippet }
    })

    snippets.push({ name: snippet, content })
  }

  context.commit('snippets', snippets)
}
