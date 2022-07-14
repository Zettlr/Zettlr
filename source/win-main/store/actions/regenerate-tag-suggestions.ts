/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RegenerateTagSuggestionsAction
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Regenerates the array of suggested tags for the current file
 *
 * END HEADER
 */

import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const ipcRenderer = window.ipc

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  if (context.state.activeFile === null) {
    return // Nothing to do
  }

  if (context.state.activeFile.type !== 'file') {
    return // Can only generate suggestions for Markdown files
  }

  const descriptor = await ipcRenderer.invoke('application', {
    command: 'get-file-contents',
    payload: context.state.activeFile.path
  })

  if (descriptor == null) {
    console.error('Could not regenerate tag suggestions: Main returned', descriptor)
    return
  }

  const suggestions = []
  for (const tag of Object.keys(context.state.tagDatabase)) {
    if (String(descriptor.content).includes(tag) && descriptor.tags.includes(tag) === false) {
      suggestions.push(tag)
    }
  }

  context.commit('setTagSuggestions', suggestions)
}
