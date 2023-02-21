/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Main Override Theme
 * CVM-Role:        BaseTheme
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exports the base editor theme which configures the
 *                  main editor in such a way that it fits within the general
 *                  appearance of Zettlr.
 *
 * END HEADER
 */
import { EditorView } from '@codemirror/view'

export const mainOverride = EditorView.baseTheme({
  // General overrides
  '&.cm-editor': {
    height: '100%',
    fontFamily: 'inherit',
    backgroundColor: 'transparent'
  },
  '.cm-scroller': {
    flexGrow: '1' // Ensure the content pushes possible panels towards the edge
  },
  '.cm-scroller .muted': {
    opacity: '0.2'
  },
  // KaTeX overrides
  '.katex': {
    fontSize: '1.1em', // reduce font-size of math a bit
    display: 'inline-block', // needed for display math to behave properly
    userSelect: 'none' // Disable user text selection
  },
  '.katex-display, .katex-display > .katex > .katex-html': {
    display: 'inline-block', // needed for display math to behave properly
    width: '100%' // display math should be centered
  },
  // Panel button overrides
  '.cm-panels .cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'inherit',
    borderRadius: '6px',
    fontSize: '13px'
  },
  '&light .cm-panels .cm-button': {
    backgroundColor: 'white',
    borderColor: '#aaa'
  },
  '.cm-panel.cm-search label input[type=checkbox]': {
    marginRight: '10px'
  },
  // Define the readability classes. Red, orange, and yellow indicate bad scores
  // Purple and blue indicate average scores, and green indicates good scores
  '&light .cm-readability-0': { backgroundColor: '#ff0000aa', color: '#444' },
  '&light .cm-readability-1': { backgroundColor: '#f67b2baa', color: '#444' },
  '&light .cm-readability-2': { backgroundColor: '#e5a14faa', color: '#444' },
  '&light .cm-readability-3': { backgroundColor: '#e3e532aa', color: '#444' },
  '&light .cm-readability-4': { backgroundColor: '#d4c1fdaa', color: '#444' },
  '&light .cm-readability-5': { backgroundColor: '#538fe9aa', color: '#444' },
  '&light .cm-readability-6': { backgroundColor: '#53bce9aa', color: '#444' },
  '&light .cm-readability-7': { backgroundColor: '#53e7e9aa', color: '#444' },
  '&light .cm-readability-8': { backgroundColor: '#4ad14caa', color: '#444' },
  '&light .cm-readability-9': { backgroundColor: '#53e955aa', color: '#444' },
  '&light .cm-readability-10': { backgroundColor: '#7cf87eaa', color: '#444' },
  '&dark .cm-readability-0': { backgroundColor: '#ff0000aa', color: '#ccc' },
  '&dark .cm-readability-1': { backgroundColor: '#f67b2baa', color: '#ccc' },
  '&dark .cm-readability-2': { backgroundColor: '#e5a14faa', color: '#ccc' },
  '&dark .cm-readability-3': { backgroundColor: '#e3e532aa', color: '#ccc' },
  '&dark .cm-readability-4': { backgroundColor: '#d4c1fdaa', color: '#ccc' },
  '&dark .cm-readability-5': { backgroundColor: '#538fe9aa', color: '#ccc' },
  '&dark .cm-readability-6': { backgroundColor: '#53bce9aa', color: '#ccc' },
  '&dark .cm-readability-7': { backgroundColor: '#53e7e9aa', color: '#ccc' },
  '&dark .cm-readability-8': { backgroundColor: '#4ad14caa', color: '#ccc' },
  '&dark .cm-readability-9': { backgroundColor: '#53e955aa', color: '#ccc' },
  '&dark .cm-readability-10': { backgroundColor: '#7cf87eaa', color: '#ccc' }
})

export const defaultLight = EditorView.theme({}, { dark: false })
export const defaultDark = EditorView.theme({}, { dark: true })
