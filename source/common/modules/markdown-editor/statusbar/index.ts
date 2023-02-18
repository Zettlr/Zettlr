/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        StatusBar
 * CVM-Role:        CodeMirror Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays a statusbar panel for the editor
 *
 * END HEADER
 */

import { showPanel, Panel, EditorView } from '@codemirror/view'
import { EditorState, StateField } from '@codemirror/state'
import { openLintPanel, forEachDiagnostic, forceLinting } from '@codemirror/lint'
import { configField, configUpdateEffect } from '../util/configuration'
import { languageToolState, updateLTState } from '../linters/language-tool'
import { trans } from '@common/i18n-renderer'
import { charCountField, wordCountField } from '../plugins/statistics-fields'
import localiseNumber from '@common/util/localise-number'
import { resolveLangCode } from '@common/util/map-lang-code'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { AnyMenuItem } from '@dts/renderer/context'
import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'

export interface StatusbarItem {
  content: string
  title?: string
  allowHtml?: boolean
  onClick?: (event: MouseEvent) => void
}

/**
 * Displays the readability mode status, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
function readabilityStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const config = state.field(configField)
  if (!hasMarkdownExt(config.metadata.path)) {
    return null
  }

  return {
    content: `<cds-icon shape=${config.readabilityMode ? 'eye' : 'eye-hide'}></cds-icon>`,
    allowHtml: true,
    title: trans('Readability mode (%s)', config.readabilityAlgorithm),
    onClick (event) {
      view.dispatch({ effects: configUpdateEffect.of({ readabilityMode: !config.readabilityMode }) })
    }
  }
}

/**
 * Displays the cursor position
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element
 */
function cursorStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const mainOffset = state.selection.main.head
  const line = state.doc.lineAt(mainOffset)
  return {
    content: `${line.number}:${mainOffset - line.from + 1}`
  }
}

/**
 * Displays the word count, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
function wordcountStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const wordCount = state.field(wordCountField, false)
  if (wordCount === undefined) {
    return null
  } else {
    return {
      content: trans('%s words', localiseNumber(wordCount))
    }
  }
}

/**
 * Displays the character count, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
function charcountStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const charCount = state.field(charCountField, false)
  if (charCount === undefined) {
    return null
  } else {
    return {
      content: trans('%s characters', localiseNumber(charCount))
    }
  }
}

/**
 * Displays an input mode indication, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
function inputModeStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const config = state.field(configField)
  if (config.inputMode !== 'default') {
    return {
      content: 'Mode: ' + (config.inputMode === 'vim' ? 'Vim' : 'Emacs')
    }
  } else {
    return null
  }
}

/**
 * Displays the status of LanguageTool, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *i
 * @return  {StatusbarItem}         Returns the element, or null
 */
function languageToolStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  // Determine if LanguageTool is currently running
  const config = state.field(configField)
  const ltState = state.field(languageToolState, false)

  if (!config.lintLanguageTool || ltState === undefined) {
    return null
  }

  // Three possibilities: It's currently running, there was an error, or
  // LT is idling
  if (ltState.running) {
    return {
      content: 'LanguageTool: <cds-icon shape="hourglass"></cds-icon>',
      allowHtml: true
    }
  }

  if (ltState.lastError !== undefined) {
    return {
      content: `LanguageTool: <cds-icon shape="exclamation-triangle"></cds-icon> (${ltState.lastError})`,
      allowHtml: true
    }
  }

  const displayLanguage = ltState.overrideLanguage !== 'auto'
    ? ltState.overrideLanguage
    : ltState.lastDetectedLanguage

  let lang = `(${displayLanguage})`
  const resolvedFlag = resolveLangCode(displayLanguage, 'flag')
  if (resolvedFlag !== displayLanguage) {
    lang = resolvedFlag
  }

  return {
    content: `LanguageTool: <cds-icon shape="check"></cds-icon> ${lang}`,
    title: resolveLangCode(displayLanguage),
    allowHtml: true,
    onClick (event) {
      // Necessary so that the context menu doesn't close again
      event.stopPropagation()
      // The languages can be a tad tricky: We want the info that we're
      // going to present to the user as concise as possible, but
      // sometimes we lack the information. For example, if we have two
      // language codes sv, and sv-SV, there may be a subtle difference
      // but it could be that we only have the translation for sv. In
      // that case, we need to add the language code to the duplicate
      // to de-duplicate the two entries.
      // We'll go as follows:

      // First, retrieve the translations for all our codes
      const resolved = ltState.supportedLanguages.map(code => {
        let flag = resolveLangCode(code, 'flag')
        if (flag === code) {
          flag = '🇺🇳' // United Nations flag
        }
        return {
          code,
          displayName: resolveLangCode(code, 'name'),
          flag,
          duplicate: false
        }
      })

      // Then, let's have a look if we have duplicates and switch their
      // flags correspondingly
      for (let i = 0; i < resolved.length; i++) {
        if (resolved[i].duplicate) {
          continue
        }

        const indexOfTwin = resolved.findIndex(e => {
          return e.displayName === resolved[i].displayName
        })

        if (indexOfTwin > -1 && indexOfTwin !== i) {
          resolved[i].duplicate = true
          resolved[indexOfTwin].duplicate = true
        }
      }

      // Now sort the items ascending (we can't sort the final items,
      // since they'd be sorted according to the flag emoji order)
      const coll = new Intl.Collator(
        [ window.config.get('appLang'), 'en' ],
        { sensitivity: 'base', usage: 'sort' }
      )

      resolved.sort((a, b) => {
        return coll.compare(a.displayName, b.displayName)
      })

      // At this point, we have the info we need. We only use the
      // displayName property except in situations where there are
      // duplicates, in which case we'll add the code in brackets
      // afterwards to de-duplicate the entries.
      const items: AnyMenuItem[] = resolved.map(entry => {
        const suffix = entry.duplicate ? ` (${entry.code})` : ''

        return {
          label: `${entry.flag} ${entry.displayName}${suffix}`,
          id: entry.code,
          type: 'checkbox',
          enabled: true,
          checked: ltState.overrideLanguage === entry.code
        }
      })

      // Insert the "auto" item on top
      items.unshift(
        {
          label: trans('Detect automatically'),
          id: 'auto',
          type: 'checkbox',
          enabled: true,
          checked: ltState.overrideLanguage === 'auto'
        },
        { type: 'separator' }
      )

      showPopupMenu({ x: event.clientX, y: event.clientY }, items, clickedID => {
        view.dispatch({ effects: updateLTState.of({ overrideLanguage: clickedID }) })
        forceLinting(view)
      })
    }
  }
}

/**
 * Displays a count of all diagnostics
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element
 */
function diagnosticsStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  let info = 0
  let warn = 0
  let error = 0
  forEachDiagnostic(state, (dia, from, to) => {
    if (dia.severity === 'info') {
      info++
    } else if (dia.severity === 'warning') {
      warn++
    } else {
      error++
    }
  })

  return {
    content: `<cds-icon shape="help-info"></cds-icon> ${info} <cds-icon shape="warning-standard"></cds-icon> ${warn} <cds-icon shape="times-circle"></cds-icon> ${error}`,
    allowHtml: true,
    title: trans('Open diagnostics panel'),
    onClick (event) {
      openLintPanel(view)
    }
  }
}

function createStatusbar (view: EditorView): Panel {
  const elem = document.createElement('div')
  elem.className = 'cm-statusbar'
  return {
    top: false,
    dom: elem,
    update (update) {
      const elements: StatusbarItem[] = []
      // NOTE: Order here determines the order in the statusbar
      const items = [
        readabilityStatus,
        cursorStatus,
        wordcountStatus,
        charcountStatus,
        inputModeStatus,
        languageToolStatus,
        diagnosticsStatus
      ]

      for (const construct of items) {
        const item = construct(update.state, update.view)
        if (item !== null) {
          elements.push(item)
        }
      }

      // Add all elements to the panel
      elem.innerHTML = ''
      for (const element of elements) {
        const span = document.createElement('span')
        if (element.allowHtml === true) {
          span.innerHTML = element.content
        } else {
          span.textContent = element.content
        }
        span.className = 'cm-statusbar-item'
        if (element.onClick !== undefined) {
          span.addEventListener('mousedown', element.onClick)
        }
        if (element.title !== undefined) {
          span.title = element.title
        }
        elem.appendChild(span)
      }
    }
  }
}

const statusbarState = StateField.define<boolean>({
  create: () => false,
  update (value, transaction) {
    // Determine if we have to switch our toggle
    for (const effect of transaction.effects) {
      if (effect.is(configUpdateEffect)) {
        if (typeof effect.value.showStatusbar === 'boolean') {
          value = effect.value.showStatusbar
        }
      }
    }

    return value
  },
  provide: f => showPanel.from(f, display => display ? createStatusbar : null)
})

const statusbarTheme = EditorView.baseTheme({
  '.cm-statusbar': {
    padding: '5px',
    fontSize: '12px',
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    userSelect: 'none',
    cursor: 'default'
  },
  '&dark .cm-statusbar': {
    backgroundColor: '#333',
    color: '#ddd'
  },
  '.cm-statusbar .cm-statusbar-item': {
    padding: '0 5px'
  },
  '.cm-statusbar .cm-statusbar-item:not(:first-child)': {
    borderLeft: '1px solid gray'
  }
})

export const statusbar = [
  statusbarState,
  statusbarTheme
]
