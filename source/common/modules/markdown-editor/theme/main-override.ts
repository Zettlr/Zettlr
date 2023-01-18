import { EditorView } from '@codemirror/view'

export const mainOverride = EditorView.baseTheme({})
export const defaultLight = EditorView.theme({}, { dark: false })
export const defaultDark = EditorView.theme({}, { dark: true })
