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

import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import { ChangeSet, type ChangeSpec, type StateCommand } from '@codemirror/state'
import { extractASTNodes, markdownToAST } from '@common/modules/markdown-utils'
import { type Footnote, type FootnoteRef } from '@common/modules/markdown-utils/markdown-ast'

/**
 * A command that adds a new footnote at the current main selection.
 *
 * @return  {boolean}    Whether the command executed
 */
export const addNewFootnote: StateCommand = ({ state, dispatch }): boolean => {
  // Reuse syntax tree if available
  const tree = ensureSyntaxTree(state, state.doc.length) ?? undefined

  const ast = markdownToAST(state.sliceDoc(), tree)
  const identifiers = extractASTNodes(ast, 'Footnote') as Footnote[]
  const refs = extractASTNodes(ast, 'FootnoteRef') as FootnoteRef[]
  const changes: ChangeSpec[] = []

  // This is where our new footnote should be inserted
  let where = state.selection.main.from
  const doc = state.doc

  // Check that the user isn't accidentally within a footnote.
  const nodeAt = syntaxTree(state).resolve(where, 0)
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
  dispatch(state.update({
    changes,
    // Offset like this:
    // 5 = [^]:\s\n (the ref, NOTE we exclude the newline)
    // 3 = [^] (the identifier)
    // 2x the new number length
    // Any offset chars, since the selection must be in terms of characters AFTER the update
    selection: { anchor: whereRef + 5 + prefix.length + 3 + String(newIdentifier).length * 2 + offsetChars },
    scrollIntoView: true
  }))
  return true
}

/**
 * This command should run on delete. It tests if there is a Footnote next to
 * the cursor that would be deleted. If so, it first selects the footnote
 * entirely. This serves two purposes: (a) footnote deletion happens for the
 * entire node, and (b) a double-check to visually tell the user they are about
 * to delete a footnote now.
 *
 * @return  {boolean}    Whether the command executed
 */
export const selectFootnoteBeforeDelete: StateCommand = ({ state, dispatch }): boolean => {
  if (!state.selection.main.empty) {
    return false
  }

  const pos = state.selection.main.head
  const node = syntaxTree(state).resolveInner(pos, -1)
  if (node.type.name === 'Footnote' && node.to === pos) {
    dispatch(state.update({ selection: { anchor: node.to, head: node.from } }))
    return true
  }

  return false
}

/**
 * This StateCommand cleans up numbered footnotes and their references by:
 *
 * 1. Ensuring that footnotes and their references are balanced. Dangling
 *    footnotes (without matching reference) and references (without matching
 *    footnote) are removed.
 *
 * 2. Renumbering footnotes and their references in order to ensure that the
 *    numbered footnotes are in ascending order.
 *
 * 3. Moving all references to the end of the document
 *
 */
export const cleanupFootnotes: StateCommand = ({ state, dispatch }): boolean => {
  // Reuse syntax tree if available
  const tree = ensureSyntaxTree(state, state.doc.length) ?? undefined

  const ast = markdownToAST(state.sliceDoc(), tree)
  const identifiers = extractASTNodes(ast, 'Footnote') as Footnote[]
  const refs = extractASTNodes(ast, 'FootnoteRef') as FootnoteRef[]

  const changes: ChangeSpec[] = []
  const nonNumericRefs: FootnoteRef[] = []
  const matchingRefs: FootnoteRef[] = []

  for (const ref of refs) {
    // Remove the whole line since we will be moving the ref to the end of the document
    const nextLine = state.doc.line(Math.min(state.doc.lineAt(ref.from).number + 1, state.doc.lines))
    // If the next line is empty, we need to remove it as well so that the spacing is cleaned up.
    // This prevents double newlines when removing refs in between two paragraphs.
    if (nextLine.text.trim() === '') {
      changes.push({ from: ref.from, to: state.doc.length > nextLine.to ? nextLine.to + 1 : nextLine.to, insert: '' })
    } else {
      changes.push({ from: ref.from, to: state.doc.length > ref.to ? ref.to + 1 : ref.to, insert: '' })
    }
    // A non-numeric footnote label
    if (!/^\d+$/.test(ref.label)) {
      // Keep track so these can be moved to the end of the document
      nonNumericRefs.push(ref)
      continue
    }

    // Find footnote references with matching footnotes
    const fn = identifiers.find(fn => fn.label === ref.label)
    if (fn !== undefined) {
      matchingRefs.push(ref)
    }
  }

  let fnIdx = 1
  const matchingRefsText: string[] = []

  for (const fn of identifiers) {
    // A non-numeric footnote label
    if (!/^\d+$/.test(fn.label)) {
      continue
    }

    // Find and remove footnotes with missing references
    const ref = matchingRefs.find(r => r.label === fn.label)
    if (ref === undefined) {
      changes.push({ from: fn.from, to: fn.to, insert: '' })
      continue
    }

    // Remove the ref from the list in case there are duplicate
    // numbers. This means that the first matching ref supersedes any
    // following ref with the same label.
    matchingRefs.splice(matchingRefs.indexOf(ref), 1)

    // Correct the footnote and footnote reference number
    let refTtext = state.sliceDoc(ref.from, ref.to)
    if (parseInt(fn.label, 10) !== fnIdx) {
      changes.push({ from: fn.from, to: fn.to, insert: `[^${fnIdx}]` })

      // Update the reference ID
      // This is done outside of the transaction so that they can later
      // be inserted in sorted order
      refTtext = refTtext.replace(ref.label, String(fnIdx))
    }

    matchingRefsText.push(refTtext)

    fnIdx++
  }

  // Move all refs to the end of the document
  const sortedRefs = matchingRefsText.concat(nonNumericRefs.map(ref => state.sliceDoc(ref.from, ref.to)))
  if (sortedRefs.length > 0) {
    // We have to base the end-of-document newlines on the document after
    // removing the refs in case there were already refs at the end of the document
    const changedDoc = ChangeSet.of(changes, state.doc.length).apply(state.doc)

    // Sanitize the end of the document for appropriate newline spacing
    let insertContent = sortedRefs.join('\n') + '\n'

    // If the last line is not empty, we add two lines
    if (changedDoc.line(changedDoc.lines).text.trim() !== '') {
      insertContent = '\n\n' + insertContent
    // If the second to last line is not empty, we add one line
    } else if (changedDoc.line(Math.max(changedDoc.lines - 1, 1)).text.trim() !== '') {
      insertContent = '\n' + insertContent
    }

    changes.push({ from: state.doc.length, insert: insertContent })
  }

  if (changes.length === 0) {
    return false
  }

  dispatch(state.update({
    changes: ChangeSet.of(changes, state.doc.length),
    selection: undefined,
    userEvent: 'footnote-cleanup'
  }))
  return true
}
