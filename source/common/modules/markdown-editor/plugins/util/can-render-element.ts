import { Editor, Position } from 'codemirror'

export default function canRenderElement (cm: Editor, from: Position, to: Position): boolean {
  // Check if the cursor is within the range
  const cursor = cm.getCursor('head')
  if (cursor.line === from.line && cursor.ch >= from.ch && cursor.ch <= to.ch) {
    return false
  }

  // We can only have one marker at any given position at any given time
  if (cm.findMarks(from, to).length > 0) {
    return false
  }

  // We cannot render an element within a comment. This is the final check since
  // it is quite expensive to compute
  const tokenTypeBegin = cm.getTokenTypeAt(from)
  const tokenTypeEnd = cm.getTokenTypeAt(to)
  if (tokenTypeBegin?.includes('comment') || tokenTypeEnd?.includes('comment')) {
    return false
  }

  return true
}
