/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Code Themes
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Base code syntax theme.
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'

// To add new variables:
//
// 1. Add the variable and type to `CodeThemeVars`
// 2. Set a default value in `defaultCodeVars`
// 3. Apply the styling to each desired element in `codeTheme`
// 4. Optionally, override styling in the various `themes/*.ts` files
//
// To rename existing variables:
//
// 1. Change the name in `CodeThemeVars`
// 2. update `defaultCodeVars` and any `themes/*.ts` files with the new name.
// 3. Update the name in `codeTheme`.
//    - This will not get flagged by intellisense,
//      so it requires a manual find-and-replace

export interface CodeThemeVars {
  [selector: string]: string|number // necessary to match the type of StyleSpec
  /** CSS `<color>` value */
  '--zettlr-editor-code-base-0': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-base-1': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-base-2': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-base-3': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-base-00': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-base-01': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-base-02': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-base-03': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-yellow': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-orange': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-red': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-magenta': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-violet': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-blue': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-cyan': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-green': string
}

/* Code Theme
 *
 * We're using this solarized theme here: https://ethanschoonover.com/solarized/
 * See also the CodeEditor.vue component, which uses the same colours
*/

const BASE_0 = '#839496'
const BASE_1 = '#93a1a1'
const BASE_2 = '#eee8d5'
const BASE_3 = '#fdf6e3'
const BASE_00 = '#657b83'
const BASE_01 = '#586e75'
const BASE_02 = '#073642'
const BASE_03 = '#002b36'

const YELLOW = '#b58900'
const ORANGE = '#cb4b16'
const RED = '#dc322f'
const MAGENTA = '#d33682'
const VIOLET = '#6c71c4'
const BLUE = '#268bd2'
const CYAN = '#2aa198'
const GREEN = '#859900'

export const defaultCodeVars: CodeThemeVars = {
  '--zettlr-editor-code-base-0': BASE_0,
  '--zettlr-editor-code-base-1': BASE_1,
  '--zettlr-editor-code-base-2': BASE_2,
  '--zettlr-editor-code-base-3': BASE_3,
  '--zettlr-editor-code-base-00': BASE_00,
  '--zettlr-editor-code-base-01': BASE_01,
  '--zettlr-editor-code-base-02': BASE_02,
  '--zettlr-editor-code-base-03': BASE_03,
  '--zettlr-editor-code-yellow': YELLOW,
  '--zettlr-editor-code-orange': ORANGE,
  '--zettlr-editor-code-red': RED,
  '--zettlr-editor-code-magenta': MAGENTA,
  '--zettlr-editor-code-violet': VIOLET,
  '--zettlr-editor-code-blue': BLUE,
  '--zettlr-editor-code-cyan': CYAN,
  '--zettlr-editor-code-green': GREEN,
}

export const codeTheme = EditorView.baseTheme({
  '&': defaultCodeVars,
  '.code': {
    color: 'var(--zettlr-editor-code-base-02)',
    fontFamily: 'var(--zettlr-editor-code-font)'
  },
  '&dark .code': { color: 'var(--zettlr-editor-code-base-1)' },

  '.cm-comment': { color: 'var(--zettlr-editor-code-base-00)' },
  '.cm-line-comment': { color: 'var(--zettlr-editor-code-base-00)' },
  '.cm-block-comment': { color: 'var(--zettlr-editor-code-base-00)' },

  // Sort based on color; roughly sort based on function of the class.
  '.cm-string': { color: 'var(--zettlr-editor-code-green)' },
  '.cm-keyword': { color: 'var(--zettlr-editor-code-green)' },
  '.cm-inserted': { color: 'var(--zettlr-editor-code-green)' },
  '.cm-positive': { color: 'var(--zettlr-editor-code-green)' },

  '.cm-control-keyword': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-atom': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-color': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-number': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-integer': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-bool': { color: 'var(--zettlr-editor-code-violet)' },

  '.cm-property': { color: 'var(--zettlr-editor-code-magenta)' },
  '.cm-operator': { color: 'var(--zettlr-editor-code-magenta)' },
  '.cm-compare-operator': { color: 'var(--zettlr-editor-code-magenta)' },
  '.cm-arithmetic-operator': { color: 'var(--zettlr-editor-code-magenta)' },
  '.cm-self': { color: 'var(--zettlr-editor-code-magenta)' },

  '.cm-operator-keyword': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-definition-keyword': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-module-keyword': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-null': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-meta': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-unit': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-qualifier': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-builtin': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-property-name': { color: 'var(--zettlr-editor-code-blue)' },

  '.cm-tag-name': { color: 'var(--zettlr-editor-code-cyan)' },
  '.cm-modifier': { color: 'var(--zettlr-editor-code-cyan)' },
  '.cm-variable-name': { color: 'var(--zettlr-editor-code-cyan)' },
  '.cm-variable': { color: 'var(--zettlr-editor-code-cyan)' },

  '.cm-attribute-name': { color: 'var(--zettlr-editor-code-orange)' },
  '.cm-regexp': { color: 'var(--zettlr-editor-code-orange)' },

  '.cm-name': { color: 'var(--zettlr-editor-code-yellow)' },
  '.cm-class-name': { color: 'var(--zettlr-editor-code-yellow)' },
  '.cm-type-name': { color: 'var(--zettlr-editor-code-yellow)' },
  '.cm-changed': { color: 'var(--zettlr-editor-code-yellow)' },

  '.cm-deleted': { color: 'var(--zettlr-editor-code-red)' },
  '.cm-negative': { color: 'var(--zettlr-editor-code-red)' },
  '.cm-invalid': { color: 'var(--zettlr-editor-code-red)' },
})
