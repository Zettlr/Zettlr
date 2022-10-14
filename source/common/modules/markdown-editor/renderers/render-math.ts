// Utilizing a ReplaceDecorator, we're here rendering stuff.

// The renderers are adapted from the example here:
// https://codemirror.net/examples/decoration/#boolean-toggle-widgets
import { renderBlockWidgets } from './base-renderer'
import { SyntaxNode, SyntaxNodeRef } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'

import katex from 'katex'
import 'katex/contrib/mhchem'
import { EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'

class MathWidget extends WidgetType {
  constructor (readonly equation: string, readonly displayMode: boolean, readonly node: SyntaxNode) {
    super()
  }

  eq (other: MathWidget): boolean {
    return other.equation === this.equation &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('span')
    elem.classList.add('preview-math')
    elem.dataset.equation = this.equation
    katex.render(this.equation, elem, { throwOnError: false, displayMode: this.displayMode })
    elem.addEventListener('click', clickAndSelect(view, this.node))
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return false // By default ignore all events
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  // This parser should look for InlineCode and FencedCode and then immediately
  // check its first CodeMark child to ensure its contents only include $ or $$.
  if (![ 'InlineCode', 'FencedCode' ].includes(node.type.name)) {
    return false
  }

  // We've got some code. Let's now make sure that we have a CodeMark and it's
  // either 2 long (if FencedCode) or 1-2 (if InlineCode)
  const firstChild = node.node.firstChild // Accessing node.node will force-calc the tree here
  if (firstChild === null || firstChild.type.name !== 'CodeMark') {
    return false
  }

  const markSpan = firstChild.to - firstChild.from

  if (markSpan !== 2 && node.type.name === 'FencedCode') {
    return false
  }

  return true // There's reason to assume we are indeed dealing with a math equation
}

function createWidget (state: EditorState, node: SyntaxNodeRef): MathWidget|undefined {
  // Get the node's text contents, determine if this is a displayMode equation,
  // and then remove the leading and trailing dollars. Also, pass a stable node
  // reference (SyntaxNodeRef will be dropped, but the SyntaxNode itself will
  // stay, and keep its position updated depending on what happens in the doc)
  const nodeText = state.sliceDoc(node.from, node.to)
  if (!nodeText.startsWith('$') && (!nodeText.endsWith('$\n') || nodeText.endsWith('$'))) {
    return undefined // It's regular FencedCode/InlineCode
  }

  const displayMode = nodeText.startsWith('$$')
  const equation = nodeText.replace(/^\$\$?(.+?)\$\$?$/s, '$1') // NOTE the s flag
  return new MathWidget(equation, displayMode, node.node)
}

export const renderMath = renderBlockWidgets(shouldHandleNode, createWidget)