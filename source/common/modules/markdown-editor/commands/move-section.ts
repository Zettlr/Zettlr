import type { StateCommand } from '@codemirror/state'
import type { ToCEntry } from '../plugins/toc-field'

export function moveSection (toc: ToCEntry[], from: number, to: number): StateCommand {
  return ({ state, dispatch }) => {
    const entry = toc.find(e => e.line === from)

    if (entry === undefined) {
      return false
    }

    // The section ends at either the next higher or same-level heading
    const nextSections = toc.slice(toc.indexOf(entry) + 1)
    let entryEndPos = state.doc.length

    for (const section of nextSections) {
      if (section.level <= entry.level) {
        entryEndPos = section.pos
        break
      }
    }
    const lastLine = state.doc.lines

    const toLineNumber = to !== -1 ? to : lastLine
    const toLine = state.doc.line(toLineNumber)
    const targetPos = to !== lastLine ? toLine.from : toLine.to

    const sectionText = state.doc.slice(entry.pos, entryEndPos)
    let entryContents = sectionText.toString()

    if (toLine.number === lastLine) {
      // if we are moving to the end of the document,
      // but not a new line, we need to add two new
      // lines before entryContents
      const prevLine = state.doc.line(Math.max(1, toLine.number - 1))
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

    const changes = [
      { from: entry.pos, to: entryEndPos, insert: '' },
      { from: targetPos, insert: entryContents }
    ]

    dispatch(state.update({ changes }))
    return true
  }
}
