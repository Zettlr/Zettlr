/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Utilizing the TableEditor, this renderer renders tables.
 *
 * END HEADER
 */

// DEBUG // As of now, the new TableEditor has very rudimentary functionality.
// DEBUG // It properly renders tables with basic styles in Markdown documents
// DEBUG // and allows users to click inside tables to start editing. That
// DEBUG // creation and removal of various subviews is a bit wonky right now,
// DEBUG // but any change is immediately applied to the underlying main
// DEBUG // EditorView, ensuring that no changes are retained just within the
// DEBUG // subview.

// TODOs:
// 1. Check how large the performance penalty is for converting the Markdown
//    into HTML every time we update the table's DOM. Since we already parsing
//    the AST, I guess it should not be too bad, but I'll have to run a
//    performance test.

import { type DecorationSet, EditorView } from '@codemirror/view'
import { type EditorState, StateField } from '@codemirror/state'
import { subviewUpdatePlugin } from './subview'
import { TableWidget } from './widget'

// TODO: Think of an appropriate place for this. Or do we want to keep this
// confined to this plugin?
const COLORS = {
  colorTransparent: 'transparent',
  colorNeutral00: '#FFFFFF',
  colorNeutral01: '#F7F7F7',
  colorNeutral02: '#EFEFEF',
  colorNeutral03: '#E6E6E6',
  colorNeutral04: '#DEDEDE',
  colorNeutral05: '#D6D6D6',
  colorNeutral06: '#CECECE',
  colorNeutral07: '#C5C5C5',
  colorNeutral08: '#BDBDBD',
  colorNeutral09: '#B5B5B5',
  colorNeutral10: '#ADADAD',
  colorNeutral11: '#A5A5A5',
  colorNeutral12: '#9C9C9C',
  colorNeutral13: '#949494',
  colorNeutral14: '#8C8C8C',
  colorNeutral15: '#848484',
  colorNeutral16: '#7B7B7B',
  colorNeutral17: '#737373',
  colorNeutral18: '#6B6B6B',
  colorNeutral19: '#636363',
  colorNeutral20: '#5A5A5A',
  colorNeutral21: '#525252',
  colorNeutral22: '#4A4A4A',
  colorNeutral23: '#424242',
  colorNeutral24: '#3A3A3A',
  colorNeutral25: '#313131',
  colorNeutral26: '#292929',
  colorNeutral27: '#212121',
  colorNeutral28: '#191919',
  colorNeutral29: '#101010',
  colorNeutral30: '#080808',
  colorNeutral31: '#000000',

  colorAccent400: '#3FC894',
  colorAccent500: '#1CB27E',
  colorAccent600: '#0F8C63',
  colorAccent700: '#0C7052',
  colorAccent800: '#0C5942'
}

// Define a StateField that handles the entire TableEditor Schischi, as well as
// a few helper extensions that are necessary for the functioning of the widgets
export const renderTables = [
  // The actual TableEditor provider
  StateField.define<DecorationSet>({
    create (state: EditorState) {
      return TableWidget.createForState(state)
    },
    update (field, tr) {
      return TableWidget.createForState(tr.state)
    },
    provide: f => EditorView.decorations.from(f)
  }),
  // A theme for the various elements
  EditorView.baseTheme({
    '.cm-table-editor-widget': {
      borderCollapse: 'collapse',
      margin: '0 2px 0 6px', // Taken from .cm-line so that tables align
      // Implement Artem's theme
      '& td, & th': {
        color: '#3a3a3a',
        position: 'relative',
        border: `1px solid ${COLORS.colorNeutral08}`,
        padding: '12px 16px',
        minWidth: '96px',
        outlineOffset: '-0.5px',
        '&:hover': {
          outline: `1px solid ${COLORS.colorNeutral17}`,
        },
        '&:focus-within, &:focus-visible': {
          padding: '8px 8px',
          outline: `1px solid ${COLORS.colorAccent500}`,
          outlineColor: '#1cb27e',
          zIndex: '100',
          boxShadow: `inset 0 0 0 1px var(${COLORS.colorAccent500})`,
          '&:hover': {
            outline: `1px solid ${COLORS.colorAccent400}`,
            boxShadow: `inset 0 0 0 1px var(${COLORS.colorAccent400})`
          }
        }
      },
      '& th': { backgroundColor: COLORS.colorNeutral04 },
      '& tr:nth-child(2n+1) td': { backgroundColor: COLORS.colorNeutral02 }
    },
    '.cm-content .cm-table-editor-widget .cm-scroller': {
      padding: '0' // Override the large margin from the main editor view
    },
    // DARK STYLES
    '&dark .cm-table-editor-widget': {
      // Implement Artem's theme
      '& td, & th': {
        color: '#d6d6d6',
        border: `1px solid ${COLORS.colorNeutral22}`,
        '&:hover': { outline: `1px solid ${COLORS.colorNeutral13}`, },
        '&:focus-within, &:focus-visible': {
          outline: `1px solid ${COLORS.colorAccent600}`,
          boxShadow: `inset 0 0 0 1px var(${COLORS.colorAccent600})`,
          '&:hover': {
            outline: `1px solid ${COLORS.colorAccent500}`,
            boxShadow: `inset 0 0 0 1px var(${COLORS.colorAccent500})`
          }
        }
      },
      '& th': { backgroundColor: COLORS.colorNeutral24 },
      '& tr:nth-child(2n+1) td': { backgroundColor: COLORS.colorNeutral27 }
    }
  }),
  subviewUpdatePlugin
]
