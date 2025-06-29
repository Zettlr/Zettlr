/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Autocorrect
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the autocorrect plugin, but since it basically just
 *                  consists of commands, we added it to the commands folder.
 *
 * END HEADER
 */

// The autocorrect plugin is basically just a keymap that listens to spaces and enters
import { syntaxTree } from '@codemirror/language'
import { EditorSelection, type ChangeSpec, type EditorState } from '@codemirror/state'
import { type Command, type EditorView } from '@codemirror/view'
import { configField } from '../util/configuration'

// These characters can be directly followed by a starting magic quote
const startChars = ' ([{-–—\n\r\t\v\f/\\'

/**
 * Given the editor state and a position, this function returns whether the
 * position sits within a node that is protected from autocorrect. In those
 * cases, no autocorrection will be applied, regardless of whether there is a
 * suitable candidate.
 *
 * @param   {EditorState}  state  The state
 * @param   {number}       pos    The position to check
 *
 * @return  {boolean}             True if the position touches a protected node.
 */
function posInProtectedNode (state: EditorState, pos: number): boolean {
  const PROTECTED_NODES = [
    'InlineCode', // `code`
    'Comment', 'CommentBlock', // <!-- comment -->
    'FencedCode', 'CodeText', // Code block
    'HorizontalRule', // --- and ***
    'YAMLFrontmatter',
    'HTMLTag', 'HTMLBlock' // HTML elements
  ]

  let node = syntaxTree(state).resolveInner(pos, -1)

  while (node.parent !== null) {
    if (PROTECTED_NODES.includes(node.type.name)) {
      return true
    }

    node = node.parent
  }

  // Neither the node itself, nor any of its parents, are protected.
  return false
}

/**
 * If AutoCorrect is active, this handles a (potential) replacement on Space or
 * Enter.
 *
 * @param   {EditorView}  view  The editor's view
 *
 * @return  {boolean}           Always returns false to make Codemirror add the Space/Enter
 */
export function handleReplacement (view: EditorView): boolean {
  // The config field is only present in the main editor, not in the assets
  // manager code editors or elsewhere.
  const config = view.state.field(configField, false)
  if (config === undefined) {
    return false
  }

  const { autocorrect } = config
  if (!autocorrect.active || autocorrect.replacements.length === 0) {
    return false
  }

  // Make a deep copy of the autocorrect (to not mess with the order), sort by
  // key length descending.
  const replacements = autocorrect.replacements.map(e => { return { ...e } })
  replacements.sort((a, b) => b.key.length - a.key.length)

  const maxKeyLength = replacements[0].key.length
  const changes: ChangeSpec[] = []

  for (const range of view.state.selection.ranges) {
    // Ignore selections (only cursors)
    if (!range.empty) {
      continue
    }

    // Ignore those cursors that are inside protected nodes
    if (posInProtectedNode(view.state, range.from)) {
      continue
    }

    // Leave --- and ... lines (YAML frontmatter as well as horizontal rules)
    // We have investigated finding these as protected nodes. However, '---' in
    // the first line is not parsed as any type.
    const line = view.state.doc.lineAt(range.from)
    if ([ '---', '...' ].includes(line.text)) {
      continue
    }

    const from = Math.max(range.from - maxKeyLength, 0)
    const slice = view.state.sliceDoc(from, range.from)
    for (const { key, value } of replacements) {
      if (slice.endsWith(key)) {
        const startOfReplacement = range.from - key.length
        if (posInProtectedNode(view.state, startOfReplacement)) {
          break // `range.from` is not in a protected area, but start is.
        }

        const charBefore = startOfReplacement === 0
          ? ' ' // Assume a space which makes below's code simpler
          : view.state.sliceDoc(startOfReplacement - 1, startOfReplacement)

        if (autocorrect.matchWholeWords && !/\W/.test(charBefore)) {
          // We should match whole words, but the replacement is
          // not preceeded by a non-word character.
          break
        }

        changes.push({ from: startOfReplacement, to: range.from, insert: value })
        break // Do not check the other possible replacements
      }
    }
  }

  view.dispatch({ changes })

  // Indicate that we did not handle the key, making Codemirror add the key
  return false
}

/**
 * Handles backspace presses that turn magic quotes into regular quotes
 *
 * @param   {EditorView}  view  The editor view
 *
 * @return  {boolean}           Whether the function has replaced a quote
 */
export function handleBackspace (view: EditorView): boolean {
  // The config field is only present in the main editor, not in the assets
  // manager code editors or elsewhere.
  const config = view.state.field(configField, false)
  if (config === undefined) {
    return false
  }

  const { autocorrect } = config
  if (!autocorrect.active) {
    return false
  }

  const primaryMagicQuotes = autocorrect.magicQuotes.primary.split('…')
  const secondaryMagicQuotes = autocorrect.magicQuotes.secondary.split('…')

  // This checks if we have a magic quote right before the cursor. If so,
  // pressing Backspace will not remove the quote, but rather replace it with a
  // simple " or ' quote.
  const changes: ChangeSpec[] = []

  for (const range of view.state.selection.ranges) {
    if (range.from === 0) {
      continue
    }

    const slice = view.state.sliceDoc(range.from - 1, range.from)
    if (primaryMagicQuotes.includes(slice) && slice !== '"') {
      changes.push({ from: range.from - 1, to: range.from, insert: '"' })
    } else if (secondaryMagicQuotes.includes(slice) && slice !== "'") {
      changes.push({ from: range.from - 1, to: range.from, insert: "'" })
    }
  }

  if (changes.length > 0) {
    view.dispatch({ changes })
  }

  return changes.length > 0 // If we've replaced a quote, we must stop Codemirror from removing it
}

/**
 * Adds magic quotes instead of simple quotes, if applicable
 *
 * @param   {string}  quote  The quote to replace, either ' or "
 *
 * @return  {Command}        Returns a Command function
 */
export function handleQuote (quote: string): Command {
  return function (view: EditorView): boolean {
    // The config field is only present in the main editor, not in the assets
    // manager code editors or elsewhere.
    const config = view.state.field(configField, false)
    if (config === undefined) {
      return false
    }

    const { autocorrect } = config
    if (!autocorrect.active) {
      return false
    }

    const primary = autocorrect.magicQuotes.primary.split('…')
    const secondary = autocorrect.magicQuotes.secondary.split('…')
    const quotes = (quote === '"') ? primary : secondary

    const transaction = view.state.changeByRange((range) => {
      // NOTE we're running through the hassle of definitely inserting quotes as
      // otherwise the quote character would be swallowed, even in "protected"
      // areas of the document.
      const isFromProtected = posInProtectedNode(view.state, range.from)
      const isToProtected = posInProtectedNode(view.state, range.to)

      if (range.empty) {
        // Check the character before and insert an appropriate quote
        const charBefore = view.state.sliceDoc(range.from - 1, range.from)
        const insert = isFromProtected
          ? quote // `from` is protected so no fancy quotes
          : startChars.includes(charBefore) ? quotes[0] : quotes[1]

        return {
          range: EditorSelection.cursor(range.to + insert.length),
          changes: {
            from: range.from,
            to: range.to,
            insert
          }
        }
      } else {
        // Surround the selection with quotes
        const text = view.state.sliceDoc(range.from, range.to)
        const quoteStart = isFromProtected ? quote : quotes[0]
        const quoteEnd = isToProtected ? quote : quotes[1]
        return {
          range: EditorSelection.range(range.from + quoteStart.length, range.to + quoteEnd.length),
          changes: { from: range.from, to: range.to, insert: `${quoteStart}${text}${quoteEnd}` }
        }
      }
    })

    view.dispatch(transaction)

    return true
  }
}
