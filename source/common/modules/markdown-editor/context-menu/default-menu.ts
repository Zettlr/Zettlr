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

import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { type SyntaxNode } from '@lezer/common'
import { forEachDiagnostic, type Diagnostic, forceLinting, setDiagnostics } from '@codemirror/lint'
import { applyBold, applyItalic, insertLink, applyBlockquote, applyOrderedList, applyBulletList, applyTaskList } from '../commands/markdown'
import { cut, copyAsPlain, copyAsHTML, paste, pasteAsPlain } from '../util/copy-paste-cut'
import { getTransformSubmenu } from './transform-items'
import { extractLTSpellcheckSuggestionsFrom, isLanguageToolMisspelling } from '../linters/language-tool'

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
  let misspelledWord: string|undefined

  if (pos !== null) {
    forEachDiagnostic(view.state, (diag, from, to) => {
      // We need a suggestion that's under the cursor and indicates a misspelling.
      // These can be produced both my LanguageTool and the Hunspell dictionaries.
      if (
        from <= pos && to >= pos &&
        (diag.source === 'spellcheck' || isLanguageToolMisspelling(diag))
      ) {
        diagnostic = diag
      }
    })
  }

  // If we have a diagnostic, we can extract the word & select it
  if (diagnostic !== undefined) {
    misspelledWord = view.state.sliceDoc(diagnostic.from, diagnostic.to)
    view.dispatch({
      selection: { anchor: diagnostic.from, head: diagnostic.to }
    })
  }

  // If we have a word, we can fetch suggestions ...
  if (misspelledWord !== undefined && diagnostic !== undefined && isLanguageToolMisspelling(diagnostic)) {
    const s = extractLTSpellcheckSuggestionsFrom(diagnostic)
    if (s !== null) {
      suggestions.push(...s)
    }
  } else if (misspelledWord !== undefined) {
    suggestions.push(...await fetchSuggestions(misspelledWord))
  }

  // ... and transform them to menu items
  const suggestionItems: AnyMenuItem[] = suggestions.map(suggestion => {
    return {
      type: 'normal',
      label: suggestion,
      action () {
        if (diagnostic === undefined) {
          console.warn('Could not apply suggestion: No diagnostic found')
          return
        }

        view.dispatch({
          changes: { from: diagnostic.from, to: diagnostic.to, insert: suggestion }
        })
      }
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
      type: 'normal',
      action () {
        ipcRenderer.invoke(
          'dictionary-provider',
          { command: 'add', terms: [misspelledWord] }
        )
          .then(() => {
            // After we've added the word to the dictionary, we have to invalidate
            // the spellcheck linter errors that mark this specific word as wrong.
            const filteredDiagnostics: Diagnostic[] = []
            forEachDiagnostic(view.state, (d, from, to) => {
              if (d.source !== 'spellcheck') {
                filteredDiagnostics.push(d)
              } else if (view.state.sliceDoc(from, to) !== misspelledWord) {
                filteredDiagnostics.push(d)
              }
            })
            view.dispatch(setDiagnostics(view.state, filteredDiagnostics))
            forceLinting(view)
          })
          .catch(e => console.error(e))
      }
    },
    { type: 'separator' }
  )

  const tpl: AnyMenuItem[] = [
    {
      label: trans('Bold'),
      accelerator: 'CmdOrCtrl+B',
      type: 'normal',
      action () { applyBold(view) }
    },
    {
      label: trans('Italic'),
      accelerator: 'CmdOrCtrl+I',
      type: 'normal',
      action () { applyItalic(view) }
    },
    {
      type: 'separator'
    },
    {
      label: trans('Insert link'),
      accelerator: 'CmdOrCtrl+K',
      type: 'normal',
      action () { insertLink(view) }
    },
    {
      label: trans('Insert unordered list'),
      type: 'normal',
      action () { applyBulletList(view) }
    },
    {
      label: trans('Insert numbered list'),
      type: 'normal',
      action () { applyOrderedList(view) }
    },
    {
      label: trans('Insert task list'),
      accelerator: 'CmdOrCtrl+T',
      type: 'normal',
      action () { applyTaskList(view) }
    },
    {
      label: trans('Insert blockquote'),
      type: 'normal',
      action () { applyBlockquote(view) }
    },
    {
      label: trans('Insert table'),
      type: 'normal',
      action () { view.dispatch(view.state.replaceSelection('| | |\n|-|-|\n| | |\n')) }
    },
    {
      type: 'separator'
    },
    {
      label: trans('Cut'),
      accelerator: 'CmdOrCtrl+X',
      type: 'normal',
      action () { cut(view) }
    },
    {
      label: trans('Copy'),
      accelerator: 'CmdOrCtrl+C',
      type: 'normal',
      action () { copyAsPlain(view) }
    },
    {
      label: trans('Copy as HTML'),
      accelerator: 'CmdOrCtrl+Alt+C',
      type: 'normal',
      action () { copyAsHTML(view) }
    },
    {
      label: trans('Paste'),
      accelerator: 'CmdOrCtrl+V',
      type: 'normal',
      action () { paste(view) }
    },
    {
      label: trans('Paste without style'),
      accelerator: 'CmdOrCtrl+Shift+V',
      type: 'normal',
      action () { pasteAsPlain(view) }
    },
    {
      type: 'separator'
    },
    {
      label: trans('Select all'),
      accelerator: 'CmdOrCtrl+A',
      type: 'normal',
      action () { view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } }) }
    },
    {
      type: 'separator'
    },
    getTransformSubmenu(view)
  ]

  // If we found a diagnostic earlier and a word, add the suggestion items
  if (diagnostic !== undefined && misspelledWord !== undefined) {
    tpl.unshift(...suggestionItems)
  }

  showPopupMenu(coords, tpl)
}
