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
import { configField, configUpdateEffect } from '../util/configuration'
import { languageToolRunning } from '../linters/language-tool'

function createStatusbar (view: EditorView): Panel {
  const elem = document.createElement('div')
  elem.className = 'cm-statusbar'
  return {
    top: false,
    dom: elem,
    update (update) {
      const elements: string[] = []

      // Cursor
      const mainOffset = update.state.selection.main.from
      const line = update.state.doc.lineAt(mainOffset)
      elements.push(`${line.number}:${mainOffset - line.from + 1}`)

      const config = update.state.field(configField)

      if (config.inputMode !== 'default') {
        elements.push('Mode: ' + (config.inputMode === 'vim' ? 'Vim' : 'Emacs'))
      }

      elements.push('Indent: ' + (config.indentWithTabs ? '<Tab>' : '<Space>'))

      // Detect linters
      const linters: string[] = []
      if (config.lintMarkdown) {
        linters.push('MD')
      }
      if (config.lintLanguageTool) {
        linters.push('LT')
      }
      elements.push('Lint: ' + linters.join(' + '))

      // Determine if LanguageTool is currently running
      const hasLanguageTool = update.state.field(languageToolRunning, false) !== undefined
      if (config.lintLanguageTool && hasLanguageTool) {
        if (update.state.field(languageToolRunning)) {
          elements.push('LanguageTool: running…')
        } else {
          elements.push('LanguageTool: idle')
        }
      }

      // Get numbers of diagnostics TODO

      // Add all elements to the panel
      elem.innerHTML = ''
      for (const element of elements) {
        const span = document.createElement('span')
        span.textContent = element
        span.className = 'cm-statusbar-item'
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
    display: 'block',
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
