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

import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'
import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const ipcRenderer = window.ipc

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  const activeFile = context.getters.lastLeafActiveFile()
  if (activeFile === null) {
    return // Nothing to do
  }

  if (!hasMarkdownExt(activeFile.path)) {
    return // Can only generate suggestions for Markdown files
  }

  const descriptor = await ipcRenderer.invoke('application', {
    command: 'get-file-contents',
    payload: activeFile.path
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
