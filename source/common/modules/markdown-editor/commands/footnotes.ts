/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Footnotes Commands
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A collection of commands for adding, modifying, and removing footnotes.
 *
 * END HEADER
 */

// There are a few things people need to do with footnotes, all defined here:
// 1. Hover over them for a preview
// 2. Cmd-Click them to edit them in place
// 3. And, obviously, add and remove them

import { syntaxTree } from '@codemirror/language'
import { type ChangeSpec } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { extractASTNodes, markdownToAST } from '@common/modules/markdown-utils'
import { type Footnote, type FootnoteRef } from '@common/modules/markdown-utils/markdown-ast'

/**
 * A command that adds a new footnote at the current main selection.
 *
 * @param   {EditorView}  target  The editor view.
 *
 * @return  {boolean}             Whether the command ran.
 */
export function addNewFootnote (target: EditorView): boolean {
  const ast = markdownToAST(target.state.sliceDoc())
  const identifiers = extractASTNodes(ast, 'Footnote') as Footnote[]
  const refs = extractASTNodes(ast, 'FootnoteRef') as FootnoteRef[]
  const changes: ChangeSpec[] = []

  // This is where our new footnote should be inserted
  let where = target.state.selection.main.from
  const doc = target.state.doc

  // Check that the user isn't accidentally within a footnote.
  const nodeAt = syntaxTree(target.state).resolve(where, 0)
  if (nodeAt.name === 'Footnote') {
    where = nodeAt.to
  }

  // Split up all identifiers into before and after. Before will be used to find
  // the new identifier, after will need to be adapted afterwards.
  const fnBefore = identifiers.filter(i => i.to <= where)
  const fnAfter = identifiers.filter(i => i.from > where)

  // Now find the new identifier. It'll be the highest number+1 of fnBefore.
  let newIdentifier = fnBefore.length + 1
  for (const fn of fnBefore) {
    const id = parseInt(fn.label, 10)
    if (!/^\d+$/.test(fn.label) || id < newIdentifier) {
      continue // A text label, or smaller than our new Identifier
    }
    newIdentifier = id + 1
  }

  // We additionally need the position of where to put the corresponding ref.
  let whereRef = doc.length // Default: end of document
  for (const ref of refs) {
    const id = parseInt(ref.label, 10)
    if (!/^\d+$/.test(ref.label) || id < newIdentifier) {
      continue // A text label, or smaller than our new Identifier
    }

    // This is the first ref which is not smaller than the new identifier
    whereRef = ref.from
    break
  }

  const isEOF = whereRef === doc.length
  const targetLine = doc.lineAt(whereRef).number
  const hasRefBefore = refs.filter(ref => ref.to <= whereRef).length > 0
  const isBeginningOfLine = doc.lineAt(whereRef).from === whereRef
  const prevLineNo = isBeginningOfLine ? targetLine - 1 : targetLine
  const emptyLineBefore = doc.line(prevLineNo).text.trim() === '' || isEOF

  // We don't need to add another newline if there is already an empty line
  // before, or if a ref ends just before this one. This keeps the footnote refs
  // separate from the main text body with a double line break, but keeps the
  // refs themselves tight.
  let prefix = ''
  if ((!isBeginningOfLine && hasRefBefore) || (isBeginningOfLine && isEOF)) {
    prefix = '\n' // Single newline between footnotes
  } else if (!emptyLineBefore && !hasRefBefore) {
    prefix = '\n\n' // Footnote paragraph should be separated by an empty line
  } else if (hasRefBefore && !isBeginningOfLine) {
    prefix = '\n'
  } else if (isEOF && !isBeginningOfLine) {
    prefix = '\n\n'
  }

  let suffix = isEOF ? '' : '\n'

  // Now we can add the first two changes that will insert the new footnote
  changes.push({ from: where, insert: `[^${newIdentifier}]` })
  changes.push({ from: whereRef, insert: `${prefix}[^${newIdentifier}]: ${suffix}` })

  // We need to maintain a tally of how many more or less characters will be
  // inserted AFTER the new footnote identifier and BEFORE the whereRef.
  let offsetChars = 0

  // Finally, we can renumber the following fns
  let id = newIdentifier + 1
  for (const fn of fnAfter) {
    if (!/^\d+$/.test(fn.label)) {
      continue // Exclude text-labels
    }

    if (fn.label === `${id}`) {
      // In this case, the footnote is already correct, but we have to increment
      id++
      continue
    }

    let from = fn.from + 2
    let to = fn.from + 2 + fn.label.length

    offsetChars += `${id}`.length - (to - from)

    changes.push({ from, to, insert: `${id}` })

    const ref = refs.find(ref => ref.label === fn.label)
    if (ref !== undefined) {
      if (ref.to < whereRef) {
        // Since footnote refs do not have to be ordered, some refs may occur
        // before whereRef, and thus need to be accounted for in the offset.
        offsetChars += `${id}`.length - (to - from)
      }

      from = ref.from + 2
      to = ref.from + 2 + ref.label.length
      changes.push({ from, to, insert: `${id}` })
    }
    id++
  }

  // And go.
  target.dispatch({
    changes,
    // Offset like this:
    // 5 = [^]:\s\n (the ref, NOTE we exclude the newline)
    // 3 = [^] (the identifier)
    // 2x the new number length
    // Any offset chars, since the selection must be in terms of characters AFTER the update
    selection: { anchor: whereRef + 5 + prefix.length + 3 + String(newIdentifier).length * 2 + offsetChars }
  })
  return true
}
