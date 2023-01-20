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
import { StateField } from '@codemirror/state'
import { openLintPanel, forEachDiagnostic, forceLinting } from '@codemirror/lint'
import { configField, configUpdateEffect } from '../util/configuration'
import { languageToolState, updateLTState } from '../linters/language-tool'
import { trans } from '@common/i18n-renderer'
import { charCountField, wordCountField } from './statistics-fields'
import localiseNumber from '@common/util/localise-number'
import { resolveLangCode } from '@common/util/map-lang-code'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { AnyMenuItem } from '@dts/renderer/context'

export interface StatusbarItem {
  content: string
  title?: string
  allowHtml?: boolean
  onClick?: (event: MouseEvent) => void
}

function createStatusbar (view: EditorView): Panel {
  const elem = document.createElement('div')
  elem.className = 'cm-statusbar'
  return {
    top: false,
    dom: elem,
    update (update) {
      const elements: StatusbarItem[] = []

      // Cursor
      const mainOffset = update.state.selection.main.from
      const line = update.state.doc.lineAt(mainOffset)
      elements.push({ content: `${line.number}:${mainOffset - line.from + 1}` })

      const config = update.state.field(configField)

      // Word and char count
      const wordCount = update.state.field(wordCountField, false)
      const charCount = update.state.field(charCountField, false)

      if (wordCount !== undefined) {
        elements.push({ content: trans('%s words', localiseNumber(wordCount)) })
      }
      if (charCount !== undefined) {
        elements.push({ content: trans('%s characters', localiseNumber(charCount)) })
      }

      if (config.inputMode !== 'default') {
        elements.push({ content: 'Mode: ' + (config.inputMode === 'vim' ? 'Vim' : 'Emacs') })
      }

      // Determine if LanguageTool is currently running
      const ltState = update.state.field(languageToolState, false)
      if (config.lintLanguageTool && ltState !== undefined) {
        // Three possibilities: It's currently running, there was an error, or
        // LT is idling
        if (ltState.running) {
          elements.push({
            content: 'LanguageTool: <cds-icon shape="hourglass"></cds-icon>',
            allowHtml: true
          })
        } else if (ltState.lastError !== undefined) {
          elements.push({
            content: `LanguageTool: <cds-icon shape="exclamation-triangle"></cds-icon> (${ltState.lastError})`,
            allowHtml: true
          })
        } else {
          const displayLanguage = ltState.overrideLanguage !== 'auto'
            ? ltState.overrideLanguage
            : ltState.lastDetectedLanguage

          let lang = `(${displayLanguage})`
          const resolvedFlag = resolveLangCode(displayLanguage, 'flag')
          if (resolvedFlag !== displayLanguage) {
            lang = resolvedFlag
          }
          elements.push({
            content: `LanguageTool: <cds-icon shape="check"></cds-icon> ${lang}`,
            title: resolveLangCode(displayLanguage),
            allowHtml: true,
            onClick (event) {
              const items: AnyMenuItem[] = ltState.supportedLanguages.map(e => {
                const displayName = resolveLangCode(e, 'name')
                let flag = resolveLangCode(e, 'flag')
                if (flag === e) {
                  flag = '🇺🇳' // United Nations flag
                }
                return {
                  label: `${flag} ${displayName}`,
                  id: e,
                  type: 'checkbox',
                  enabled: true,
                  checked: ltState.overrideLanguage === e
                }
              })

              // Insert the "auto" item
              items.unshift(
                { type: 'separator' },
                {
                  label: trans('Detect automatically'),
                  id: 'auto',
                  type: 'checkbox',
                  enabled: true,
                  checked: ltState.overrideLanguage === 'auto'
                }
              )
              showPopupMenu({ x: event.clientX, y: event.clientY }, items, clickedID => {
                view.dispatch({ effects: updateLTState.of({ overrideLanguage: clickedID }) })
                forceLinting(view)
              })
            }
          })
        }
      }

      // Get numbers of diagnostics
      let info = 0
      let warn = 0
      let error = 0
      forEachDiagnostic(update.state, (dia, from, to) => {
        if (dia.severity === 'info') {
          info++
        } else if (dia.severity === 'warning') {
          warn++
        } else {
          error++
        }
      })

      elements.push({
        content: `<cds-icon shape="help-info"></cds-icon> ${info} <cds-icon shape="warning-standard"></cds-icon> ${warn} <cds-icon shape="times-circle"></cds-icon> ${error}`,
        allowHtml: true,
        title: trans('Open diagnostics panel'),
        onClick (event) {
          openLintPanel(update.view)
        }
      })

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
