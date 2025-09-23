import { syntaxTree } from '@codemirror/language'
import type { EditorView } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'

/**
 * Takes an EditorView and a node, and returns either the containing link or
 * image node, or null. If this function returns a node, the provided node was
 * either the containing node, or a node contained by this link/image context.
 *
 * @param   {EditorView}       view  The editor view
 * @param   {SyntaxNode}       node  The node to check
*
 * @return  {SyntaxNode|null}        The context node, or null.
 */
function getImgOrLinkContext (view: EditorView, node: SyntaxNode): SyntaxNode|null {
  if ([ 'URL', 'Link', 'Image' ].includes(node.type.name)) {
    return node
  }

  let nodeAt: SyntaxNode|null = node
  while (nodeAt !== null && ![ 'Link', 'Image' ].includes(nodeAt.type.name)) {
    nodeAt = nodeAt.parent
  }

  return nodeAt
}

/**
 * Takes an EditorView and a node, and returns either the containin citation
 * node, or null. If this function returns a node, the provided node was part of
 * a citation context.
 *
 * @param   {EditorView}       view  The editor view
 * @param   {SyntaxNode}       node  The node to check
 *
 * @return  {SyntaxNode|null}        The context node, or null.
 */
function getCitationContext (view: EditorView, node: SyntaxNode): SyntaxNode|null {
  if (node.type.name === 'Citation') {
    return node
  }

  let nodeAt: SyntaxNode|null = node
  while (nodeAt !== null && nodeAt.type.name !== 'Citation') {
    nodeAt = nodeAt.parent
  }

  return nodeAt
}

/**
 * Returns the containing Table syntax node, if node is part of a table context.
 *
 * @param   {EditorView}       view  The editor view
 * @param   {SyntaxNode}       node  The node to check
 *
 * @return  {SyntaxNode|null}        The context node, or null
 */
function getTableContext (view: EditorView, node: SyntaxNode): SyntaxNode|null {
  if (node.type.name === 'Table') {
    return node
  }

  let nodeAt: SyntaxNode|null = node
  while (nodeAt !== null && nodeAt.type.name !== 'Table') {
    nodeAt = nodeAt.parent
  }

  return nodeAt
}

function getEquationContext (view: EditorView, node: SyntaxNode): SyntaxNode|null {
  // Math is a bit more difficult. It comes in block and inline flavor, and has
  // no unique syntax node name.

  // First the equation blocks; that is contained within a FencedCode node.
}

export async function cmContextMenu (event: PointerEvent, view: EditorView): Promise<boolean> {
  // First, let us gather some context to figure out which menu items we need to
  // show.
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos === null) {
    return false // No context menu to show
  }

  // First, we need to find the SyntaxNode under the cursor.
  const node = syntaxTree(view.state).resolveInner(pos)

  // Find whether the user has a selection. (In that case, we don't overwrite
  // that selection. Some commands benefit from a selection.)
  const hasSelection = !view.state.selection.ranges.every(x => x.empty)

  // Now, let's enumerate the potential contexts the user can be in the editor.
  //
  // * No specific context (includes raw text, or emphasis)
  // * Links and images
  // * Citations
  // * Tables
  // * Equations

  const imgLinkNode = getImgOrLinkContext(view, node)
  const citationNode = getCitationContext(view, node)
  const tableNode = getTableContext(view, node)

  return true
}
