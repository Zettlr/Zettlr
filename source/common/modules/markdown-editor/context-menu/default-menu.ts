/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        defaultMenu function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a utility function to show a basic Markdown context
 *                  menu
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { AnyMenuItem } from '@dts/renderer/context'
import { SyntaxNode } from '@lezer/common'
import { forEachDiagnostic, Diagnostic, forceLinting, setDiagnostics } from '@codemirror/lint'
import { applyBold, applyItalic, insertLink, applyBlockquote, applyOrderedList, applyBulletList, applyTaskList } from '../commands/markdown'
import { cut, copyAsPlain, copyAsHTML, paste, pasteAsPlain } from '../util/copy-paste-cut'

const ipcRenderer = window.ipc
const suggestionCache = new Map<string, string[]>()

// Listen for dictionary-provider messages. NOTE: The suggestionCache is shared,
// meaning I'd have to implement it in a scope if I need custom
ipcRenderer.on('dictionary-provider', (event, message) => {
  const { command } = message

  if (command === 'invalidate-dict') {
    // Invalidate the buffered dictionary
    suggestionCache.clear()
  }
})

/**
 * Sanitizes a term so that the dictionary can find it (remove funky characters
 * and quotes, for example)
 *
 * @param   {string}  term  The unsanitized term
 *
 * @return  {string}        The sanitized term
 */
function sanitizeTerm (term: string): string {
  // Convert smart quotes into the default before checking the term, see #1948
  return term.replace(/’‘‚‹›»“”」/g, "'")
}

/**
 * Returns a list of suggestions. If none are cached locally, this will return
 * an empty list and start a fetch in the background.
 *
 * @param   {string}             term  The term to get suggestions for
 *
 * @return  {Promise<string[]>}        A list of possible suggestions
 */
async function fetchSuggestions (term: string): Promise<string[]> {
  const saneTerm = sanitizeTerm(term)
  const cachedSuggestions = suggestionCache.get(saneTerm)
  if (cachedSuggestions !== undefined) {
    return cachedSuggestions
  }

  // If we're here, the suggestion has not yet been cached. Code is equal to
  // above's batchSuggest
  const suggestions: string[][] = await ipcRenderer.invoke(
    'dictionary-provider',
    { command: 'suggest', terms: [saneTerm] }
  )

  suggestionCache.set(saneTerm, suggestions[0])
  return suggestions[0]
}

/**
 * Shows a default context menu for the given node at the given coordinates in
 * the given view.
 *
 * @param   {EditorView}                view    The view
 * @param   {SyntaxNode}                node    The node
 * @param   {{ x: number, y: number }}  coords  The screen coordinates
 */
export async function defaultMenu (view: EditorView, node: SyntaxNode, coords: { x: number, y: number }): Promise<void> {
  // In this function, we're doing a lot of iffs to check if there is a
  // spellcheck underneath the cursor and, if there is, add suggestions (if
  // there are) to the context menu.
  const pos = view.posAtCoords(coords)

  const suggestions: string[] = []
  let diagnostic: Diagnostic|undefined
  let word: string|undefined

  if (pos !== null) {
    forEachDiagnostic(view.state, (diag, from, to) => {
      // We need a suggestion that's under the cursor and also of a spellcheck
      if (from <= pos && to >= pos && diag.source === 'spellcheck') {
        diagnostic = diag
      }
    })
  }

  // If we have a diagnostic, we can extract the word & select it
  if (diagnostic !== undefined) {
    word = view.state.sliceDoc(diagnostic.from, diagnostic.to)
    view.dispatch({
      selection: { anchor: diagnostic.from, head: diagnostic.to }
    })
  }

  // If we have a word, we can fetch suggestions ...
  if (word !== undefined) {
    suggestions.push(...await fetchSuggestions(word))
  }

  // ... and transform them to menu items
  const suggestionItems: AnyMenuItem[] = suggestions.map(suggestion => {
    return {
      type: 'normal',
      enabled: true,
      label: suggestion,
      id: '$' + suggestion // The $ helps distinguish the suggestions
    }
  })

  // If there are no suggestions, add an indication
  if (suggestionItems.length === 0) {
    suggestionItems.push({
      type: 'normal',
      enabled: false,
      label: trans('No suggestions'),
      id: 'no-suggestion'
    })
  }

  // Always add a separator afterwards and an add-to-dictionary before
  suggestionItems.push({ type: 'separator' })
  suggestionItems.unshift(
    {
      label: trans('Add to dictionary'),
      id: 'add-to-dictionary',
      type: 'normal',
      enabled: true
    },
    { type: 'separator' }
  )

  const tpl: AnyMenuItem[] = [
    {
      label: trans('Bold'),
      accelerator: 'CmdOrCtrl+B',
      id: 'markdownBold',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Italic'),
      accelerator: 'CmdOrCtrl+I',
      id: 'markdownItalic',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('Insert link'),
      accelerator: 'CmdOrCtrl+K',
      id: 'markdownLink',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Insert numbered list'),
      id: 'markdownMakeOrderedList',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Insert unordered list'),
      id: 'markdownMakeUnorderedList',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Insert tasklist'),
      accelerator: 'CmdOrCtrl+T',
      id: 'markdownMakeTaskList',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Blockquote'),
      id: 'markdownBlockquote',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Insert Table'),
      id: 'markdownInsertTable',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('Cut'),
      accelerator: 'CmdOrCtrl+X',
      id: 'cut',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Copy'),
      accelerator: 'CmdOrCtrl+C',
      id: 'copy',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Copy as HTML'),
      accelerator: 'CmdOrCtrl+Alt+C',
      id: 'copyAsHTML',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Paste'),
      accelerator: 'CmdOrCtrl+V',
      id: 'paste',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Paste without style'),
      accelerator: 'CmdOrCtrl+Shift+V',
      id: 'pasteAsPlain',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('Select all'),
      accelerator: 'CmdOrCtrl+A',
      id: 'selectAll',
      type: 'normal',
      enabled: true
    }
  ]

  // If we found a diagnostic earlier and a word, add the suggestion items
  if (diagnostic !== undefined && word !== undefined) {
    tpl.unshift(...suggestionItems)
  }

  showPopupMenu(coords, tpl, (clickedID) => {
    if (clickedID === 'markdownBold') {
      applyBold(view)
    } else if (clickedID === 'markdownItalic') {
      applyItalic(view)
    } else if (clickedID === 'markdownLink') {
      insertLink(view)
    } else if (clickedID === 'markdownMakeOrderedList') {
      applyOrderedList(view)
    } else if (clickedID === 'markdownMakeUnorderedList') {
      applyBulletList(view)
    } else if (clickedID === 'markdownMakeTaskList') {
      applyTaskList(view)
    } else if (clickedID === 'markdownBlockquote') {
      applyBlockquote(view)
    } else if (clickedID === 'markdownInsertTable') {
      // TODO
    } else if (clickedID === 'cut') {
      cut(view)
    } else if (clickedID === 'copy') {
      copyAsPlain(view)
    } else if (clickedID === 'copyAsHTML') {
      copyAsHTML(view)
    } else if (clickedID === 'paste') {
      paste(view)
    } else if (clickedID === 'pasteAsPlain') {
      pasteAsPlain(view)
    } else if (clickedID === 'selectAll') {
      view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } })
    } else if (clickedID === 'no-suggestion') {
      // Do nothing
    } else if (clickedID === 'add-to-dictionary' && word !== undefined) {
      ipcRenderer.invoke(
        'dictionary-provider',
        { command: 'add', terms: [word] }
      )
        .then(() => {
          // After we've added the word to the dictionary, we have to invalidate
          // the spellcheck linter errors that mark this specific word as wrong.
          const filteredDiagnostics: Diagnostic[] = []
          forEachDiagnostic(view.state, (d, from, to) => {
            if (d.source !== 'spellcheck') {
              filteredDiagnostics.push(d)
            } else if (view.state.sliceDoc(from, to) !== word) {
              filteredDiagnostics.push(d)
            }
          })
          view.dispatch(setDiagnostics(view.state, filteredDiagnostics))
          forceLinting(view)
        })
        .catch(e => console.error(e))
    } else if (clickedID.startsWith('$') && diagnostic !== undefined) {
      view.dispatch({
        changes: { from: diagnostic.from, to: diagnostic.to, insert: clickedID.slice(1) }
      })
    }
  })
}
