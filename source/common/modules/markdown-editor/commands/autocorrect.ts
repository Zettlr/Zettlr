// The autocorrect plugin is basically just a keymap that listens to spaces and enters
import { ChangeSpec, EditorSelection } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { configField } from '../util/configuration'

// These characters can be directly followed by a starting magic quote
const startChars = ' ([{-–—'

/**
 * Retrieves the length of the longest replacement key
 *
 * @param   {Array<{ key: string, value: string }>}  candidates  The list of candidates
 *
 * @return  {number}               The length of the longest key
 */
function getMaxCandidateLength (candidates: Array<{ key: string, value: string }>): number {
  let len = 0
  for (const keyLength of candidates.map(c => c.key.length)) {
    if (keyLength > len) {
      len = keyLength
    }
  }
  return len
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
  const autocorrect = view.state.field(configField).autocorrect
  if (!autocorrect.active || autocorrect.replacements.length === 0) {
    return false
  }

  // First, get the cursor position
  const maxLength = getMaxCandidateLength(autocorrect.replacements)
  const changes: ChangeSpec[] = []

  for (const range of view.state.selection.ranges) {
    const slice = view.state.sliceDoc(range.from - maxLength, range.from)
    for (const { key, value } of autocorrect.replacements) {
      if (slice.endsWith(key)) {
        changes.push({ from: range.from - key.length, to: range.from, insert: value })
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
  const autocorrect = view.state.field(configField).autocorrect
  if (!autocorrect.active) {
    return false
  }

  const primaryMagicQuotes = autocorrect.magicQuotes.primary
  const secondaryMagicQuotes = autocorrect.magicQuotes.secondary

  // This checks if we have a magic quote right before the cursor. If so,
  // pressing Backspace will not remove the quote, but rather replace it with a
  // simple " or ' quote.
  const changes: ChangeSpec[] = []
  let hasHandled = false

  for (const range of view.state.selection.ranges) {
    const slice = view.state.sliceDoc(range.from - 1, range.from)
    if (primaryMagicQuotes.includes(slice)) {
      hasHandled = true
      changes.push({ from: range.from - 1, to: range.from, insert: '"' })
    } else if (secondaryMagicQuotes.includes(slice)) {
      hasHandled = true
      changes.push({ from: range.from - 1, to: range.from, insert: "'" })
    }
  }

  view.dispatch({ changes })
  return hasHandled // If we've replaced a quote, we must stop Codemirror from removing it
}

/**
 * Adds magic quotes instead of simple quotes, if applicable
 *
 * @param   {string}  quote  The quote to replace, either ' or "
 *
 * @return  {Command}        Returns a Command function
 */
export function handleQuote (quote: string) {
  return function (view: EditorView): boolean {
    const autocorrect = view.state.field(configField).autocorrect
    if (!autocorrect.active) {
      return false
    }

    const primary = autocorrect.magicQuotes.primary.split('…')
    const secondary = autocorrect.magicQuotes.secondary.split('…')
    const quotes = (quote === '"') ? primary : secondary

    const transaction = view.state.changeByRange((range) => {
      if (range.empty) {
        // Check the character before and insert an appropriate quote
        const charBefore = view.state.sliceDoc(range.from - 1, range.from)
        const insert = startChars.includes(charBefore) ? quotes[0] : quotes[1]
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
        return {
          range: EditorSelection.range(range.from + quotes[0].length, range.to + quotes[1].length),
          changes: { from: range.from, to: range.to, insert: `${quotes[0]}${text}${quotes[1]}`}
        }
      }
    })

    view.dispatch(transaction)

    return true
  }
}
