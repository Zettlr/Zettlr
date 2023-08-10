/**
 * Selects text contents within the given DOM node. Does not guarantee that the
 * requested range will actually be selected, as some elements cannot have
 * selected text.
 *
 * @param   {Node}    node  The DOM node
 * @param   {number}  from  Optional start, default 0
 * @param   {number}  to    Optional end, default 0
 */
export function selectElementContents (node: Node, from: number = 0, to: number = 0): void {
  const sel = window.getSelection()
  // From MDN: Firefox may return null, other browsers may return a Selection
  // with type None
  if (sel === null || sel.type === 'None') {
    return
  }

  // From MDN: "If the startNode is a Node of type Text, Comment, or CDataSection,
  // then startOffset is the number of characters from the start of startNode. For
  // other Node types, startOffset is the number of child nodes between the start
  // of the startNode."
  // Therefore: Ensure that the node is a text node so that from and to actually
  // refer to characters, and not to nodes.
  if (node.nodeType !== Node.TEXT_NODE) {
    const maybeTextNode = [...node.childNodes].find(child => child.nodeType === Node.TEXT_NODE) as Text|undefined
    if (maybeTextNode !== undefined) {
      node = maybeTextNode
    }
  }

  // Normalize the requested caret positions
  const maxLength = node.textContent?.length ?? 0
  if (from > maxLength) {
    from = maxLength // Setting to maxLength puts the cursor AFTER the last char
  }

  if (to > maxLength) {
    to = maxLength
  }

  const range = document.createRange()
  range.setStart(node, from)
  range.setEnd(node, to)

  // Reset the selection
  sel.removeAllRanges()
  sel.addRange(range)
}
