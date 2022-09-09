// There are a few things people need to do with footnotes, all defined here:
// 1. Hover over them for a preview
// 2. Cmd-Click them to edit them in place
// 3. And, obviously, add and remove them

import { ChangeSpec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

export function addNewFootnote (target: EditorView): boolean {
  if (!target.state.selection.main.empty) {
    return true // Footnotes can't be added if something is selected
  }

  const where = target.state.selection.main.from

  const fnRE = /\[\^(\d+?)\](?!:)/g
  let identifiers = []
  for (const match of target.state.sliceDoc().matchAll(fnRE)) {
    identifiers.push({
      id: parseInt(match[1], 10),
      from: match.index as number,
      to: match.index as number + match[0].length
    })
  }

  // Now remove all those footnote identifiers that occur before the `where`
  // position since they won't need to change. We can also filter out non-
  // numeric identifiers since those can't be counted upwards
  identifiers = identifiers.filter(i => i.to > where)

  // Now find the new identifier
  let newIdentifier = identifiers.length === 0 ? 1 : Infinity
  for (const i of identifiers) {
    if (i.id < newIdentifier) {
      newIdentifier = i.id
    }
  }

  // Now also collect all the footnote refs in the document, thereby identifying
  // where we have to insert the new ref and for renumbering them later
  const fnRefRE = /^\[\^(\d+?)\]:(?=\s)/gm
  let refs = []
  for (const match of target.state.sliceDoc().matchAll(fnRefRE)) {
    refs.push({
      id: parseInt(match[1], 10),
      from: match.index as number,
      to: match.index as number + match[0].length
    })
  }

  // Since we don't yet know where the ref will be at, we have to rely on the
  // identifier. Everything equal or greater than the new identifier works.
  refs = refs.filter(r => r.id >= newIdentifier)

  // Where to insert the refnote is the position of the equal numbered ref OR
  // the end of the document
  let whereRef = target.state.doc.length
  const eqRef = refs.find(r => r.id === newIdentifier)
  if (eqRef !== undefined) {
    whereRef = eqRef.from
  }

  // Now we have to collect all changes that are about to happen:
  // 1. Insertion of the new footnote
  const changes: ChangeSpec[] = [
    { from: where, insert: `[^${newIdentifier}]` },
    { from: whereRef, insert: `\n[^${newIdentifier}]: \n` }
  ]
  // 2. Renumbering of all following footnotes (that are numerical)
  for (const i of identifiers) {
    changes.push({ from: i.from, to: i.to, insert: `[^${i.id + 1}]` })
  }
  for (const ref of refs) {
    changes.push({ from: ref.from, to: ref.to, insert: `[^${ref.id + 1}]:` })
  }

  // And go.
  target.dispatch({
    changes,
    // Offset like this: 6 = \n[^]:\s\n // 3 = [^] // identifier = 2x the new number
    selection: { anchor: whereRef + 6 + 3 + String(newIdentifier).length * 2 }
  })
  return true
}
