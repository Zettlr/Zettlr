// Creates a StateField that keeps a ToC updated

import { EditorState, StateField } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

function headingToID (headingString: string): string {
  const match = /\{(.+)\}$/.exec(headingString)
  if (match !== null) {
    // There's Pandoc attribute markup in the heading string, so we don't have
    // to calculate an ID (maybe)
    const attrs = match[1].split(' ').map(x => x.trim()).filter(x => x !== '')
    const id = attrs.find(x => x.startsWith('#'))
    if (id !== undefined) {
      return id.substring(1)
    }
  }

  let text = headingString
  // Remove all formatting, links, etc.
  text = text.replace(/[*_]{1,3}(.+)[*_]{1,3}/g, '$1')
  text = text.replace(/`[^`]+`/g, '$1')
  text = text.replace(/\[.+\]\(.+\)/g, '')
  // Remove all footnotes.
  text = text.replace(/\[\^.+\]/g, '')
  // Replace all spaces and newlines with hyphens.
  text = text.replace(/[\s\n]/g, '-')
  // Remove all non-alphanumeric characters, except underscores, hyphens, and periods.
  text = text.replace(/[^a-zA-Z0-9_.-]/g, '')
  // Convert all alphabetic characters to lowercase.
  text = text.toLowerCase()
  // Remove everything up to the first letter (identifiers may not begin with a number or punctuation mark).
  const letterMatch = /[a-z]/.exec(text)
  const firstLetter = (letterMatch !== null) ? letterMatch.index : 0
  text = text.substring(firstLetter)
  // If nothing is left after this, use the identifier section.
  if (text.length === 0) {
    text = 'section'
  }

  return text
}

export interface ToCEntry {
  /**
   * The zero-indexed line number of the heading
   */
  line: number
  /**
   * The text contents of the heading (without the heading formatting)
   */
  text: string
  /**
   * The level of the heading (1-6)
   */
  level: number
  /**
   * A human-readable title numbering (e.g. 1.2, 2.5.1)
   */
  renderedLevel: string
  /**
   * An ID used to link to this heading
   */
  id: string
}

/**
 * This function generates a Table of Contents based on the EditorState
 *
 * @param   {EditorState}  state  The editor state to create a ToC from
 *
 * @return  {ToCEntry[]}          The ToC
 */
function generateToc (state: EditorState): ToCEntry[] {
  const toc: ToCEntry[] = []
    let h1 = 0
    let h2 = 0
    let h3 = 0
    let h4 = 0
    let h5 = 0
    let h6 = 0
    syntaxTree(state).iterate({
      enter (node) {
        switch (node.type.name) {
          case 'ATXHeading1':
          case 'SetextHeading1':
            h1++
            h2 = h3 = h4 = h5 = h6 = 0
            toc.push({
              line: state.doc.lineAt(node.from).number,
              text: state.doc.sliceString(node.from + 2, node.to),
              level: 1,
              renderedLevel: [ h1 ].join('.'),
              id: headingToID(state.doc.sliceString(node.from + 2, node.to))
            })
            break
          case 'ATXHeading2':
          case 'SetextHeading2':
            h2 ++
            h3 = h4 = h5 = h6 = 0
            toc.push({
              line: state.doc.lineAt(node.from).number,
              text: state.doc.sliceString(node.from + 2, node.to),
              level: 2,
              renderedLevel: [ h1, h2 ].join('.'),
              id: headingToID(state.doc.sliceString(node.from + 2, node.to))
            })
            break
          case 'ATXHeading3':
            h3 ++
            h4 = h5 = h6 = 0
            toc.push({
              line: state.doc.lineAt(node.from).number,
              text: state.doc.sliceString(node.from + 4, node.to),
              level: 3,
              renderedLevel: [ h1, h2, h3 ].join('.'),
              id: headingToID(state.doc.sliceString(node.from + 4, node.to))
            })
            break
          case 'ATXHeading4':
            h4 ++
            h5 = h6 = 0
            toc.push({
              line: state.doc.lineAt(node.from).number,
              text: state.doc.sliceString(node.from + 5, node.to),
              level: 4,
              renderedLevel: [ h1, h2, h3, h4 ].join('.'),
              id: headingToID(state.doc.sliceString(node.from + 5, node.to))
            })
            break
          case 'ATXHeading5':
            h5 ++
            h6 = 0
            toc.push({
              line: state.doc.lineAt(node.from).number,
              text: state.doc.sliceString(node.from + 6, node.to),
              level: 5,
              renderedLevel: [ h1, h2, h3, h4, h5 ].join('.'),
              id: headingToID(state.doc.sliceString(node.from + 6, node.to))
            })
            break
          case 'ATXHeading6':
            h6++
            toc.push({
              line: state.doc.lineAt(node.from).number,
              text: state.doc.sliceString(node.from + 7, node.to),
              level: 6,
              renderedLevel: [ h1, h2, h3, h4, h5, h6 ].join('.'),
              id: headingToID(state.doc.sliceString(node.from + 7, node.to))
            })
            break
        }
      }
    })

    return toc
}

export const tocField = StateField.define<ToCEntry[]>({
  create (state) {
    return generateToc(state)
  },

  update (value, transaction) {
    if (!transaction.docChanged) {
      return value
    }

    return generateToc(transaction.state)
  }
})
