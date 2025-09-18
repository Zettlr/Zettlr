import { type EditorView } from '@codemirror/view'
import { type ToCEntry } from '../plugins/toc-field'

/**
 * Moves the section that starts with an ATX heading on the from-line to the
 * line identified by to
 *
 * @param   {number}  from  The starting line (including the section heading)
 * @param   {number}  to    The target line for the section (is -1 if it should be moved to the end)
 */
export function moveSection (target: EditorView, toc: ToCEntry[], from: number, to: number): void {
  const entry = toc.find(e => e.line === from)

  if (entry === undefined) {
    return // Something went wrong
  }

  // The section ends at either the next higher or same-level heading
  const nextSections = toc.slice(toc.indexOf(entry) + 1)
  let entryEndPos = target.state.doc.length

  for (const section of nextSections) {
    if (section.level <= entry.level) {
      entryEndPos = section.pos
      break
    }
  }

  const toLineNumber = to !== -1 ? to : target.state.doc.lines
  const toLine = target.state.doc.line(toLineNumber)
  const targetPos = to !== -1 ? toLine.from : toLine.to
  const sectionText = target.state.doc.slice(entry.pos, entryEndPos)
  let entryContents = sectionText.toString()

  if (to === -1) {
    // if we are moving to the end of the document,
    // but not a new line, we need to add two new
    // lines before entryContents
    const prevLine = target.state.doc.line(Math.max(1, toLineNumber - 1))
    if (toLine.text.trim() !== '') {
      entryContents = '\n\n' + entryContents
    // if the last line is new, but the previous one is not,
    // we need to add one new line before entryContents
    } else if (prevLine.text.trim() !== '') {
      entryContents = '\n' + entryContents
    }
  }

  const sectionLastLine = sectionText.line(sectionText.lines)
  const sectionPrevLine = sectionText.line(Math.max(1, sectionText.lines - 1))
  // if the section we are moving does not end
  // in a new line, we need to add two new lines
  //  after entryContents
  if (sectionLastLine.text.trim() !== '') {
    entryContents = entryContents + '\n\n'
  // if the section ends in a new line, but the previous one
  // is not a new line, then we need to add one new line
  // after the entryContents
  } else if (sectionPrevLine.text.trim() !== '') {
    entryContents = entryContents + '\n'
  }

  // Now, dispatch the updates.
  target.dispatch({
    changes: [
      // First, "cut"
      { from: entry.pos, to: entryEndPos, insert: '' },
      // Then, "paste"
      { from: targetPos, insert: entryContents }
    ]
  })
}
