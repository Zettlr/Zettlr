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

import { ChangeSpec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

interface Footnote {
  id: number
  from: number
  to: number
  ref?: {
    from: number
    to: number
  }
}

export function addNewFootnote (target: EditorView): boolean {
  const text = target.state.sliceDoc()

  // First, collect all fn refs of the document, which we'll need in the next
  // step.
  const fnRefRE = /^\[\^(\d+?)\]:(?=\s)/gm
  const refs = []
  for (const match of text.matchAll(fnRefRE)) {
    refs.push({
      id: parseInt(match[1], 10),
      from: match.index as number,
      to: match.index as number + match[0].length
    })
  }

  // Second, collect all footnotes, adding the corresponding ref if applicable.
  const fnRE = /\[\^(\d+?)\](?!:)/g
  const identifiers: Footnote[] = []
  for (const match of text.matchAll(fnRE)) {
    const id = parseInt(match[1], 10)
    const newElem: Footnote = {
      id,
      from: match.index as number,
      to: match.index as number + match[0].length
    }

    const ref = refs.find(ref => ref.id === id)
    if (ref !== undefined) {
      newElem.ref = { from: ref.from, to: ref.to }
    }

    identifiers.push(newElem)
  }

  // This is where our new footnote should be inserted
  const where = target.state.selection.main.from

  // Split up all identifiers into before and after. Before will be used to find
  // the new identifier, after will need to be adapted during the insertion.
  const fnBefore = identifiers.filter(i => i.to <= where)
  const fnAfter = identifiers.filter(i => i.to > where)

  // Now find the new identifier. It'll be the highest number+1 of the befores.
  let newIdentifier = fnBefore.length + 1
  for (const i of fnBefore) {
    if (i.id >= newIdentifier) {
      newIdentifier = i.id + 1
    }
  }

  // Now that we have the new identifier, we can renumber the following fns
  for (let i = 0, id = newIdentifier + 1; i < fnAfter.length; i++, id++) {
    fnAfter[i].id = id
  }

  // A final thing we have to do is find where we should put the new identifier.
  let whereRef = target.state.doc.length
  for (const i of fnAfter) {
    if (i.ref !== undefined) {
      whereRef = i.ref.from
      break // First non-empty ref wins
    }
  }

  // Now we have to collect all changes that are about to happen:
  // 1. Insertion of the new footnote
  const changes: ChangeSpec[] = [
    { from: where, insert: `[^${newIdentifier}]` },
    { from: whereRef, insert: `\n[^${newIdentifier}]: \n` }
  ]
  // 2. Renumbering of all following footnotes
  for (const i of fnAfter) {
    changes.push({ from: i.from, to: i.to, insert: `[^${i.id}]` })
    if (i.ref !== undefined) {
      changes.push({ from: i.ref.from, to: i.ref.to, insert: `[^${i.id}]:` })
    }
  }

  // And go.
  target.dispatch({
    changes,
    // Offset like this: 6 = \n[^]:\s\n // 3 = [^] // identifier = 2x the new number
    selection: { anchor: whereRef + 6 + 3 + String(newIdentifier).length * 2 }
  })
  return true
}
