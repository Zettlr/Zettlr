/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Bidirectional text support
 * CVM-Role:        CodeMirror Extension
 * Maintainer:      Writer fork
 * License:         GNU GPL v3
 *
 * Description:     Makes the Markdown editor usable for mixed-direction
 *                  (e.g. Arabic/English) writing: every line resolves its own
 *                  base direction from its first strong character, unless the
 *                  document's YAML frontmatter pins a direction via the
 *                  `direction: ltr|rtl|auto` key. Inline syntax elements are
 *                  rendered as bidi isolates so that link brackets, code
 *                  backticks etc. are not reordered by surrounding RTL runs.
 *
 * END HEADER
 */

import { bidiIsolates } from '@codemirror/language'
import { RangeSetBuilder, StateField, type EditorState, type Extension, type Text } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { configField } from '../util/configuration'

export type DocumentDirection = 'ltr'|'rtl'|'auto'

/**
 * Changes further into the document than this cannot affect the frontmatter's
 * direction key, so we skip re-scanning for them. Also caps the scan itself in
 * case of an unterminated frontmatter.
 */
const FRONTMATTER_SCAN_LIMIT = 10_000

/**
 * Reads the base direction for a document from the `direction:` key of its
 * YAML frontmatter, if present.
 *
 * @param   {Text}                    doc  The document
 *
 * @return  {DocumentDirection|null}       The direction; null if the document
 *                                         has no override
 */
function readDirection (doc: Text): DocumentDirection|null {
  if (doc.lines < 2 || doc.line(1).text !== '---') {
    return null
  }

  const lastLine = doc.lineAt(Math.min(doc.length, FRONTMATTER_SCAN_LIMIT)).number
  for (let i = 2; i <= lastLine; i++) {
    const text = doc.line(i).text
    if (text === '---' || text === '...') {
      return null // Fence closed without a direction key
    }

    const match = /^direction:\s*["']?(ltr|rtl|auto)["']?\s*$/.exec(text)
    if (match !== null) {
      return match[1] as DocumentDirection
    }
  }

  return null
}

/**
 * Returns the direction that actually applies to the document: its
 * frontmatter override if present, else the application-wide default from the
 * preferences ('auto' as the last resort).
 *
 * @param   {EditorState}        state  The editor state
 *
 * @return  {DocumentDirection}         The effective direction
 */
export function effectiveDirection (state: EditorState): DocumentDirection {
  const override = state.field(documentDirectionField, false) ?? null
  return override ?? state.field(configField, false)?.defaultTextDirection ?? 'auto'
}

/**
 * Holds the document's base text direction override as configured in its YAML
 * frontmatter (null if the key is absent).
 */
export const documentDirectionField = StateField.define<DocumentDirection|null>({
  create (state) {
    return readDirection(state.doc)
  },
  update (value, transaction) {
    if (!transaction.docChanged) {
      return value
    }

    let touchesHead = false
    transaction.changes.iterChangedRanges((fromA) => {
      if (fromA <= FRONTMATTER_SCAN_LIMIT) {
        touchesHead = true
      }
    })

    return touchesHead ? readDirection(transaction.newDoc) : value
  }
})

const lineDirections: Record<DocumentDirection, Decoration> = {
  auto: Decoration.line({ attributes: { dir: 'auto' } }),
  ltr: Decoration.line({ attributes: { dir: 'ltr' } }),
  rtl: Decoration.line({ attributes: { dir: 'rtl' } })
}

/**
 * Builds one line decoration per visible line, setting the line's dir
 * attribute according to the document direction.
 *
 * @param   {EditorView}     view  The view
 *
 * @return  {DecorationSet}        The line decorations
 */
function buildLineDecorations (view: EditorView): DecorationSet {
  const direction = effectiveDirection(view.state)
  const decoration = lineDirections[direction]
  const builder = new RangeSetBuilder<Decoration>()
  let lastLine = -1
  for (const { from, to } of view.visibleRanges) {
    let pos = from
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos)
      if (line.number > lastLine) {
        // dir="auto" on a line without any strong character falls back to LTR
        // anyway, so empty lines need no attribute (which also keeps the caret
        // of a new, still-empty line where the user expects it).
        if (line.text !== '' || direction !== 'auto') {
          builder.add(line.from, line.from, decoration)
        }
        lastLine = line.number
      }
      pos = line.to + 1
    }
  }
  return builder.finish()
}

const perLineDirection = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = buildLineDecorations(view)
  }

  update (update: ViewUpdate): void {
    if (
      update.docChanged || update.viewportChanged ||
      effectiveDirection(update.state) !== effectiveDirection(update.startState)
    ) {
      this.decorations = buildLineDecorations(update.view)
    }
  }
}, { decorations: plugin => plugin.decorations })

/**
 * Bidirectional text support for the Markdown editor. NOTE: This only affects
 * the text content; the editor chrome (gutters, statusbar, panels) explicitly
 * keeps the application's layout direction. The bidi isolation of inline
 * syntax additionally requires `bidiIsolateProps` to be registered with the
 * Markdown parser (see writer/bidi-isolate-props.ts).
 *
 * @return  {Extension}  The extension set
 */
export function writerBidi (): Extension {
  return [
    // Resolve text direction per line instead of for the whole editor (this
    // also keeps EditorView.textDirection -- and thus the chrome -- LTR).
    EditorView.perLineTextDirection.of(true),
    documentDirectionField,
    perLineDirection,
    // Renders nodes marked with NodeProp.isolate as bidi isolates and informs
    // CodeMirror's cursor motion about them
    bidiIsolates()
  ]
}
