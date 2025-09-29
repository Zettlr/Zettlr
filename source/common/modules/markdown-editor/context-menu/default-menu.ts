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
import { italicsToQuotes } from 'source/common/modules/markdown-editor/commands/transforms/italics-to-quotes'
import { stripDuplicateSpaces } from 'source/common/modules/markdown-editor/commands/transforms/strip-duplicate-spaces'
import { removeLineBreaks } from 'source/common/modules/markdown-editor/commands/transforms/remove-line-breaks'
import { addSpacesAroundEmdashes } from 'source/common/modules/markdown-editor/commands/transforms/add-spaces-around-emdashes'
import { removeSpacesAroundEmdashes } from 'source/common/modules/markdown-editor/commands/transforms/remove-spaces-around-emdashes'
import { doubleQuotesToSingle } from 'source/common/modules/markdown-editor/commands/transforms/double-quotes-to-single-quotes'
import { singleQuotesToDouble } from 'source/common/modules/markdown-editor/commands/transforms/single-quotes-to-double-quotes'
import { straightenQuotes } from 'source/common/modules/markdown-editor/commands/transforms/straighten-quotes'
import { quotesToItalics } from 'source/common/modules/markdown-editor/commands/transforms/quotes-to-italics'
import { toDoubleQuotes } from 'source/common/modules/markdown-editor/commands/transforms/to-double-quotes'
import { toSentenceCase } from 'source/common/modules/markdown-editor/commands/transforms/to-sentence-case'
import { toTitleCase } from 'source/common/modules/markdown-editor/commands/transforms/to-title-case'
import { zapGremlins } from 'source/common/modules/markdown-editor/commands/transforms/zap-gremlins'
import { configField } from '../util/configuration'

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
      type: 'normal'
    },
    { type: 'separator' }
  )

  const tpl: AnyMenuItem[] = [
    {
      label: trans('Bold'),
      accelerator: 'CmdOrCtrl+B',
      id: 'markdownBold',
      type: 'normal'
    },
    {
      label: trans('Italic'),
      accelerator: 'CmdOrCtrl+I',
      id: 'markdownItalic',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Insert link'),
      accelerator: 'CmdOrCtrl+K',
      id: 'markdownLink',
      type: 'normal'
    },
    {
      label: trans('Insert unordered list'),
      id: 'markdownMakeUnorderedList',
      type: 'normal'
    },
    {
      label: trans('Insert numbered list'),
      id: 'markdownMakeOrderedList',
      type: 'normal'
    },
    {
      label: trans('Insert task list'),
      accelerator: 'CmdOrCtrl+T',
      id: 'markdownMakeTaskList',
      type: 'normal'
    },
    {
      label: trans('Insert blockquote'),
      id: 'markdownBlockquote',
      type: 'normal'
    },
    {
      label: trans('Insert table'),
      id: 'markdownInsertTable',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Cut'),
      accelerator: 'CmdOrCtrl+X',
      id: 'cut',
      type: 'normal'
    },
    {
      label: trans('Copy'),
      accelerator: 'CmdOrCtrl+C',
      id: 'copy',
      type: 'normal'
    },
    {
      label: trans('Copy as HTML'),
      accelerator: 'CmdOrCtrl+Alt+C',
      id: 'copyAsHTML',
      type: 'normal'
    },
    {
      label: trans('Paste'),
      accelerator: 'CmdOrCtrl+V',
      id: 'paste',
      type: 'normal'
    },
    {
      label: trans('Paste without style'),
      accelerator: 'CmdOrCtrl+Shift+V',
      id: 'pasteAsPlain',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Select all'),
      accelerator: 'CmdOrCtrl+A',
      id: 'selectAll',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Transform'),
      id: 'submenuTransform',
      type: 'submenu',
      submenu: [
        {
          label: trans('Zap gremlins'),
          id: 'zapGremlins',
          type: 'normal'
        },
        {
          label: trans('Strip duplicate spaces'),
          id: 'stripDuplicateSpaces',
          type: 'normal'
        },
        {
          label: trans('Italics to quotes'),
          id: 'italicsToQuotes',
          type: 'normal'
        },
        {
          label: trans('Quotes to italics'),
          id: 'quotesToItalics',
          type: 'normal'
        },
        {
          label: trans('Remove line breaks'),
          id: 'removeLineBreaks',
          type: 'normal'
        },
        {
          type: 'separator'
        },
        {
          label: trans('Straighten quotes'),
          id: 'straightenQuotes',
          type: 'normal'
        },
        {
          label: trans('Ensure double quotes'),
          id: 'toDoubleQuotes',
          type: 'normal'
        },
        {
          label: trans('Double quotes to single'),
          id: 'doubleQuotesToSingle',
          type: 'normal'
        },
        {
          label: trans('Single quotes to double'),
          id: 'singleQuotesToDouble',
          type: 'normal'
        },
        {
          type: 'separator'
        },
        {
          label: trans('Emdash — Add spaces around'),
          id: 'addSpacesAroundEmdashes',
          type: 'normal'
        },
        {
          label: trans('Emdash — Remove spaces around'),
          id: 'removeSpacesAroundEmdashes',
          type: 'normal'
        },
        {
          type: 'separator'
        },
        {
          label: trans('To sentence case'),
          id: 'toSentenceCase',
          type: 'normal'
        },
        {
          label: trans('To title case'),
          id: 'toTitleCase',
          type: 'normal'
        }
      ]
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
      view.dispatch(view.state.replaceSelection('| | |\n|-|-|\n| | |\n'))
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
    } else if (clickedID === 'stripDuplicateSpaces') {
      stripDuplicateSpaces(view)
    } else if (clickedID === 'italicsToQuotes') {
      italicsToQuotes(view)
    } else if (clickedID === 'quotesToItalics') {
      quotesToItalics(view.state.field(configField).italicFormatting)(view)
    } else if (clickedID === 'removeLineBreaks') {
      removeLineBreaks(view)
    } else if (clickedID === 'addSpacesAroundEmdashes') {
      addSpacesAroundEmdashes(view)
    } else if (clickedID === 'removeSpacesAroundEmdashes') {
      removeSpacesAroundEmdashes(view)
    } else if (clickedID === 'doubleQuotesToSingle') {
      doubleQuotesToSingle(view)
    } else if (clickedID === 'singleQuotesToDouble') {
      singleQuotesToDouble(view)
    } else if (clickedID === 'straightenQuotes') {
      straightenQuotes(view)
    } else if (clickedID === 'toDoubleQuotes') {
      toDoubleQuotes(view)
    } else if (clickedID === 'toSentenceCase') {
      toSentenceCase(String(window.config.get('appLang')))(view)
    } else if (clickedID === 'toTitleCase') {
      toTitleCase(String(window.config.get('appLang')))(view)
    } else if (clickedID === 'zapGremlins') {
      zapGremlins(view)
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
