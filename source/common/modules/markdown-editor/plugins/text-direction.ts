/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Text Direction Plugin (CodeMirror 6)
 * CVM-Role:        Extension
 * Maintainer:      Orwa Diraneyya
 * License:         GNU GPL v3
 *
 * Description:     Provides text direction (RTL/LTR) support for CodeMirror 6.
 *                  Supports left-to-right, right-to-left, and auto-detection
 *                  from document content for Arabic, Hebrew, and other RTL languages.
 *
 * END HEADER
 */

import { type Extension, EditorView } from '@codemirror/view'
import { configField } from '../util/configuration'

/**
 * Detects the primary text direction from document content
 * @param content The text content to analyze
 * @returns 'rtl' if RTL characters dominate, 'ltr' otherwise
 */
function detectTextDirection(content: string): 'ltr' | 'rtl' {
  // RTL character ranges: Arabic, Hebrew, and other RTL scripts
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g

  // LTR character ranges: Latin alphabet
  const ltrRegex = /[A-Za-z]/g

  const rtlMatches = content.match(rtlRegex)
  const ltrMatches = content.match(ltrRegex)

  const rtlCount = rtlMatches ? rtlMatches.length : 0
  const ltrCount = ltrMatches ? ltrMatches.length : 0

  // If we have RTL characters and they outnumber LTR characters, use RTL
  return rtlCount > 0 && rtlCount >= ltrCount ? 'rtl' : 'ltr'
}

/**
 * Creates a text direction extension that applies CSS direction based on configuration
 */
export function textDirectionExtension(): Extension {
  return EditorView.theme({}, {
    dark: false
  }).from([
    // Base theme that gets updated based on config
    EditorView.theme({
      '&': {
        // This will be dynamically updated based on the config
      }
    }),

    // Extension that updates the theme based on configuration
    EditorView.updateListener.of((update) => {
      if (update.docChanged || update.viewUpdate) {
        const config = update.state.field(configField)
        const { textDirection } = config

        let resolvedDirection: 'ltr' | 'rtl' = 'ltr'

        if (textDirection === 'auto') {
          // Auto-detect from document content
          const content = update.state.doc.toString()
          resolvedDirection = detectTextDirection(content)
        } else {
          resolvedDirection = textDirection as 'ltr' | 'rtl'
        }

        // Apply the direction to the editor
        const editorElement = update.view.dom
        editorElement.style.direction = resolvedDirection

        // Also set the dir attribute for better accessibility
        editorElement.setAttribute('dir', resolvedDirection)

        // Set text-align based on direction for better UX
        if (resolvedDirection === 'rtl') {
          editorElement.style.textAlign = 'right'
        } else {
          editorElement.style.textAlign = 'left'
        }
      }
    })
  ])
}

/**
 * Creates the main text direction extension with proper CSS theming
 * This uses CodeMirror 6's theme system for efficient updates
 */
export function textDirectionTheme(): Extension {
  return EditorView.theme({
    '&': {
      // Base styles that work for both LTR and RTL
      unicodeBidi: 'plaintext', // Enables proper bidirectional text handling
    },
    '&[dir="rtl"]': {
      direction: 'rtl',
      textAlign: 'right'
    },
    '&[dir="ltr"]': {
      direction: 'ltr',
      textAlign: 'left'
    },
    '.cm-editor': {
      // Ensure the editor itself respects the direction
      '&[dir="rtl"]': {
        direction: 'rtl'
      },
      '&[dir="ltr"]': {
        direction: 'ltr'
      }
    },
    '.cm-content': {
      // Content area should inherit direction
      '&[dir="rtl"]': {
        direction: 'rtl',
        textAlign: 'right'
      },
      '&[dir="ltr"]': {
        direction: 'ltr',
        textAlign: 'left'
      }
    },
    // Ensure cursor positioning works correctly in RTL
    '.cm-cursor': {
      borderLeftWidth: '1px',
      borderRightWidth: '0px'
    },
    // RTL-specific cursor styling
    '[dir="rtl"] .cm-cursor': {
      borderLeftWidth: '0px',
      borderRightWidth: '1px'
    }
  })
}

/**
 * Main text direction support extension combining theme and update logic
 */
export function textDirection(): Extension {
  return [
    textDirectionTheme(),

    // Dynamic direction updates based on config
    EditorView.updateListener.of((update) => {
      // Only update when config changes or document changes (for auto-detection)
      // or when the editor first initializes
      if (update.docChanged || update.startState.doc.length === 0 ||
          update.transactions.some(tr => tr.reconfigured)) {
        const config = update.state.field(configField)
        const { textDirection } = config

        // Handle undefined textDirection by defaulting to 'ltr'
        const safeTextDirection = textDirection ?? 'ltr'
        let resolvedDirection: 'ltr' | 'rtl' = 'ltr'

        if (safeTextDirection === 'auto') {
          // Auto-detect from document content
          const content = update.state.doc.toString()
          resolvedDirection = detectTextDirection(content)
        } else {
          resolvedDirection = safeTextDirection as 'ltr' | 'rtl'
        }

        // Update the DOM attributes
        const editorElement = update.view.dom
        editorElement.setAttribute('dir', resolvedDirection)

        // Also update the content area
        const contentElement = editorElement.querySelector('.cm-content')
        if (contentElement) {
          contentElement.setAttribute('dir', resolvedDirection)
        }

        console.log(`[Text Direction] Applied direction: ${resolvedDirection} (from setting: ${textDirection} -> ${safeTextDirection})`)
      }
    })
  ]
}