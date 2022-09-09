import { EditorView, hoverTooltip, Tooltip } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'

/**
 * Given fn in the format [^some-identifier], this function attempts to find a
 * footnote's body in the document.
 *
 * @param   {EditorState}       state  The state
 * @param   {string}            fn     The footnote to match with a ref
 *
 * @return  {string|undefined}         Either the body, or undefined
 */
function findRefForFootnote (state: EditorState, fn: string): string|undefined {
  let text: string|undefined = undefined
  // Find the corresponding ref
  syntaxTree(state).iterate({
    enter (node) {
      if (node.type.name === 'Document') {
        return // Ignore but traverse down
      }

      if (node.type.name !== 'FootnoteRef') {
        return false // Do not traverse down
      }

      // Check the contents
      const ref = state.sliceDoc(node.from, node.to)

      if (ref !== fn + ':') {
        return false
      }
      
      // We got the actual ref. The next sibling is the footnote's body (if any).
      const body = node.node.nextSibling
      if (body === null) {
        return false
      }

      text = state.sliceDoc(body.from, body.to)      
    }
  })

  return text
}

/**
 * If the user currently hovers over a footnote, this function returns the specs
 * to create a tooltip with the footnote ref's contents, else null.
 */
function footnotesTooltip (view: EditorView, pos: number, side: 1 | -1): Tooltip|Promise<Tooltip|null>|null {
  let { from, text } = view.state.doc.lineAt(pos)
  const fnRE = /\[\^.+?\](?!:)/g
  const relativePos = pos - from

  let footnoteMatch: RegExpMatchArray|null = null
  for (const match of text.matchAll(fnRE)) {
    if (match.index as number > relativePos || match.index as number + match[0].length < relativePos) {
      continue
    }
    footnoteMatch = match
    break
  }

  if (footnoteMatch === null) {
    return null
  }

  const fn = footnoteMatch[0]

  if (fn.endsWith('^]')) {
    return null // It's an inline footnote
  }

  const tooltipContent = findRefForFootnote(view.state, fn) ?? 'No ref found.'

  return {
    pos,
    above: true,
    create(view) {
      let dom = document.createElement("div")
      dom.textContent = tooltipContent
      return {dom}
    }
  }
}

export const footnoteHover = hoverTooltip(footnotesTooltip, { hoverTime: 100 })
