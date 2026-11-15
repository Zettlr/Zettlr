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
import { type DecorationSet, EditorView } from '@codemirror/view'
import { type EditorState, StateField } from '@codemirror/state'
import { subviewUpdatePlugin } from './subview'
import { TableWidget } from './widget'
import { tableSelection } from './selection'

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
  tableSelection,
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
    'div.cm-table-editor-widget-wrapper': {
      maxWidth: 'fit-content',
      // Ensure the add buttons never disappear
      padding: '21px 10.5px 10.5px 21px',
      margin: '0 2px 0 6px', // Taken from .cm-line so that tables align
      overflow: 'auto'
    },
    'div.cm-table-editor-widget-wrapper table': {
      // BUG: Somehow the `drawSelection` extension does not properly override
      // the native selections. By essentially copying out the
      // `hideNativeSelection` theme from the extension to this place here, we
      // can prevent that.
      '& .cm-line': {
        '& ::selection, &::selection': {
          backgroundColor: 'transparent !important'
        },
        caretColor: 'transparent !important'
      },
      '& .cm-content': {
        caretColor: 'transparent !important',
        '& :focus': {
          caretColor: 'initial !important',
          '&::selection, & ::selection': {
            backgroundColor: 'Highlight !important'
          }
        }
      },
      borderCollapse: 'collapse',
      '& tr:hover > td:first-child > .plus, & tr:hover > th:first-child > .plus': {
        opacity: '1',
        pointerEvents: 'auto'
      },
      '&:hover .cm-table-select, &:focus-within .cm-table-select, & .cm-table-select:focus-visible': {
        opacity: '1',
        pointerEvents: 'auto'
      },
      // Implement Artem's theme
      '& td, & th': {
        textAlign: 'left',
        cursor: 'text',
        color: '#3a3a3a',
        position: 'relative',
        border: `1px solid ${COLORS.colorNeutral08}`,
        padding: '0px',
        minWidth: '96px',
        '&.cm-table-cell-selected': {
          backgroundColor: 'Highlight',
          color: 'HighlightText'
        },
        // Content wrapper styles
        '& div.content': {
          padding: '4px 6px',
          '&.editing': {
            paddingLeft: '0px'
          }
        },
        '& .cm-table-select, & .cm-table-actions button': {
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          width: '21px',
          height: '21px',
          border: '0',
          borderRadius: '3px',
          padding: '3px',
          backgroundColor: 'transparent',
          color: COLORS.colorNeutral18,
          cursor: 'pointer',
          '&:hover, &:focus-visible': {
            backgroundColor: COLORS.colorNeutral03
          },
          '&:focus-visible': { outline: `1px solid ${COLORS.colorNeutral18}` },
          '& svg': { width: '15px', height: '15px', flexShrink: '0', pointerEvents: 'none' }
        },
        '& .cm-table-select': {
          opacity: '0',
          pointerEvents: 'none',
          '&.column': { top: '-21px', left: '50%', transform: 'translateX(-50%)' },
          '&.row': { left: '-21px', top: '50%', transform: 'translateY(-50%)' },
          '&.table': { left: '11px', top: '-21px' }
        },
        '&:first-child .cm-table-select.column': { left: 'calc(50% + 11px)' },
        '& .cm-table-actions': {
          position: 'absolute',
          display: 'none',
          flexWrap: 'wrap',
          width: 'max-content',
          maxWidth: 'calc(100% - 2px)',
          boxSizing: 'border-box',
          left: '-1px',
          top: '-1px',
          zIndex: '4',
          gap: '2px',
          padding: '2px',
          border: `1px solid ${COLORS.colorNeutral08}`,
          borderRadius: '3px',
          backgroundColor: COLORS.colorNeutral01,
          opacity: '0',
          pointerEvents: 'none',
          '&.row': { top: 'auto', bottom: '0' },
          '& button': { position: 'static', flexShrink: '0' },
          '& button:disabled': { opacity: '0.4', cursor: 'default' }
        },
        '& .cm-table-select.row:hover ~ .cm-table-actions.row, & .cm-table-select.column:hover ~ .cm-table-actions.column, & .cm-table-select.row:focus-visible ~ .cm-table-actions.row, & .cm-table-select.column:focus-visible ~ .cm-table-actions.column, & .cm-table-actions:hover, & .cm-table-actions:focus-within': {
          display: 'flex',
          opacity: '1',
          pointerEvents: 'auto'
        },
        // Grab handle styles
        '& .grab-handle': {
          position: 'absolute',
          // display: 'flex',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          padding: '3px',
          '& svg': { height: '15px', width: '20px' },
          '&.column': {
            height: '21px',
            width: '100%',
            top: '-21px'
          },
          '&.row': {
            width: '26px', // Necessary because otherwise it'll shrink
            height: '100%',
            top: '0',
            left: '-23px', // Ensure the now superfluous padding is removed
            '& svg': { transform: 'rotate(90deg)' }
          }
        },
        '&.cm-table-controls-active > .plus, &:hover > .plus, &:focus-within > .plus': {
          opacity: '1',
          pointerEvents: 'auto'
        },
        '& .plus': {
          opacity: '0',
          pointerEvents: 'none',
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '3px',
          width: '21px',
          height: '21px',
          zIndex: '5',
          '& svg': { width: '15px', height: '15px' },
          '&.top': { top: '-10.5px', left: '-21px' },
          '&.bottom': { bottom: '-10.5px', left: '-21px' },
          '&.left': { top: '-21px', left: '-10.5px' },
          '&.right': { top: '-21px', right: '-10.5px' }
        }
      }
    },
    '@media (hover: none)': {
      'div.cm-table-editor-widget-wrapper table .cm-table-select, div.cm-table-editor-widget-wrapper table .plus': {
        opacity: '1',
        pointerEvents: 'auto'
      }
    },
    // Override the large margins from the main editor view
    '.cm-content .cm-table-editor-widget-wrapper .cm-scroller': { padding: '0' },
    '.cm-content .cm-table-editor-widget-wrapper .cm-content': { padding: '0' },
    // DARK STYLES
    '&dark div.cm-table-editor-widget-wrapper table': {
      // Implement Artem's theme
      '& td, & th': {
        color: '#d6d6d6',
        border: `1px solid ${COLORS.colorNeutral22}`,
        '&.cm-table-cell-selected': { color: 'HighlightText' },
        '& .cm-table-actions': { backgroundColor: COLORS.colorNeutral23, borderColor: COLORS.colorNeutral22 },
        '& .cm-table-select:hover, & .cm-table-select:focus-visible, & .cm-table-actions button:hover, & .cm-table-actions button:focus-visible': {
          backgroundColor: COLORS.colorNeutral22
        }
      }
    }
  }),
  subviewUpdatePlugin
]
