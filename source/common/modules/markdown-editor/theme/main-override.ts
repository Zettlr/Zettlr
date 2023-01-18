import { EditorView } from '@codemirror/view'

export const mainOverride = EditorView.baseTheme({
  '&.cm-editor': {
    height: '100%'
  },
  '&.cm-scroller': {
    flexGrow: '1'
  }
})
export const defaultLight = EditorView.theme({}, { dark: false })
export const defaultDark = EditorView.theme({}, { dark: true })
