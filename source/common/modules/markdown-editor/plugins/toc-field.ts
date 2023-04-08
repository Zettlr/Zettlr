/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table of Contents field
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This state field keeps an updated table of contents for
 *                  Markdown documents.
 *
 * END HEADER
 */

import { StateField, type EditorState } from '@codemirror/state'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'

/**
 * Takes a heading (the full line) and transforms it into an ID. This function
 * will first look for a Pandoc-style ID ({#heading-id}), then for a named
 * anchor (<a name="heading-id"></a>), and if both fail, transform the text into
 * an ID utilizing the Pandoc algorithm.
 *
 * @param   {string}  headingString  The heading string to generate an ID for
 *
 * @return  {string}                 The generated ID
 */
function headingToID (headingString: string): string {
  // If there are Pandoc attributes inside this header, and they include an ID,
  // then we should use that one.
  const pandocAttrs = /\{(.+)\}$/.exec(headingString)
  if (pandocAttrs !== null) {
    const attrs = pandocAttrs[1].split(' ').map(x => x.trim()).filter(x => x !== '')
    const id = attrs.find(x => x.startsWith('#'))
    if (id !== undefined) {
      return id.substring(1)
    }
  }

  // A named anchor is also a valid heading ID, so if there is one, return that.
  const namedAnchor = /<a(?:.+)name=['"]?([^'"]+)['"]?(?:.*)>(?:.*)<\/a>/i.exec(headingString)
  if (namedAnchor !== null) {
    return namedAnchor[1]
  }

  // If both of these "explicit" overriding methods work, transform what's left
  // of the content into an ID utilizing Pandoc's algorithm.

  let text = headingString
  // Remove HTML elements
  text = text.replace(/<.+>/i, '')
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
   * The one-indexed line number of the heading
   */
  line: number
  /**
   * The character where the entry begins
   */
  pos: number
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

  // We try to retrieve the full syntax tree, and if that fails, fall back to
  // the (possibly incomplete) syntax tree. For the ToC we definitely want to
  // utilize the full tree.
  let tree = ensureSyntaxTree(state, state.doc.length, 1000)
  if (tree === null) {
    tree = syntaxTree(state)
  }

  tree.iterate({
    enter (node) {
      if (node.type.name === 'Document') {
        return
      }

      switch (node.type.name) {
        case 'ATXHeading1':
        case 'SetextHeading1': {
          h1++
          h2 = h3 = h4 = h5 = h6 = 0
          const from = node.type.name === 'ATXHeading1' ? node.from + 2 : node.from
          toc.push({
            line: state.doc.lineAt(node.from).number,
            pos: node.from,
            text: state.doc.sliceString(from, node.to),
            level: 1,
            renderedLevel: [h1].join('.'),
            id: headingToID(state.doc.sliceString(from, node.to))
          })
          return false
        }
        case 'ATXHeading2':
        case 'SetextHeading2': {
          h2++
          h3 = h4 = h5 = h6 = 0
          const from = node.type.name === 'ATXHeading2' ? node.from + 3 : node.from
          toc.push({
            line: state.doc.lineAt(node.from).number,
            pos: node.from,
            text: state.doc.sliceString(from, node.to),
            level: 2,
            renderedLevel: [ h1, h2 ].join('.'),
            id: headingToID(state.doc.sliceString(from, node.to))
          })
          return false
        }
        case 'ATXHeading3':
          h3++
          h4 = h5 = h6 = 0
          toc.push({
            line: state.doc.lineAt(node.from).number,
            pos: node.from,
            text: state.doc.sliceString(node.from + 4, node.to),
            level: 3,
            renderedLevel: [ h1, h2, h3 ].join('.'),
            id: headingToID(state.doc.sliceString(node.from + 4, node.to))
          })
          return false
        case 'ATXHeading4':
          h4++
          h5 = h6 = 0
          toc.push({
            line: state.doc.lineAt(node.from).number,
            pos: node.from,
            text: state.doc.sliceString(node.from + 5, node.to),
            level: 4,
            renderedLevel: [ h1, h2, h3, h4 ].join('.'),
            id: headingToID(state.doc.sliceString(node.from + 5, node.to))
          })
          return false
        case 'ATXHeading5':
          h5++
          h6 = 0
          toc.push({
            line: state.doc.lineAt(node.from).number,
            pos: node.from,
            text: state.doc.sliceString(node.from + 6, node.to),
            level: 5,
            renderedLevel: [ h1, h2, h3, h4, h5 ].join('.'),
            id: headingToID(state.doc.sliceString(node.from + 6, node.to))
          })
          return false
        case 'ATXHeading6':
          h6++
          toc.push({
            line: state.doc.lineAt(node.from).number,
            pos: node.from,
            text: state.doc.sliceString(node.from + 7, node.to),
            level: 6,
            renderedLevel: [ h1, h2, h3, h4, h5, h6 ].join('.'),
            id: headingToID(state.doc.sliceString(node.from + 7, node.to))
          })
          return false
        default:
          return false
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
