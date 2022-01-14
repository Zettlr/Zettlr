/**
 * THIS IS A FORK OF ADDON/FOLD/MARKDOWN-FOLD
 *
 * See: https://codemirror.net/addon/fold/markdown-fold.js
 *
 * This is necessary, because our mode basically _is_
 * Markdown, but it can't be named as such.
 */

import CodeMirror from 'codemirror'

const maxDepth = 6 // We allow headers until level 6

/**
 * Determines if the given line is a header
 *
 * @param {CodeMirror.Editor} cm The instance
 * @param {number} lineNo The line to check
 *
 * @return {boolean} True if the line is a header
 */
function isHeader (cm: CodeMirror.Editor, lineNo: number): boolean {
  const tokentype: string|null = cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0))
  return tokentype?.includes('header')
}

function getListIndentation (line: string): number {
  // Matches regular lists and task lists
  const match = /^(\s*)(?:[*+-](?:\s\[[x ]\])?|\d+\.)\s/i.exec(line)
  return (match !== null) ? match[1].length : -1
}

/**
 * Determines the level of the header of the given line number
 *
 * @param {CodeMirror.Editor} cm The instance
 * @param {number} lineNo The line to check
 * @param {string} line The line's contents
 * @param {string} nextLine The next line's contents
 *
 * @return {number} The level of the heading. Returns maxDepth + 1 if no hading is found
 */
function headerLevel (cm: CodeMirror.Editor, lineNo: number, line: string, nextLine: string): number {
  let match = (typeof line === 'string') ? line.match(/^(#+)\s/) : null
  if (match !== null && isHeader(cm, lineNo)) {
    return match[1].length
  }

  match = (typeof nextLine === 'string') ? nextLine.match(/^[=-]+\s*$/) : null
  if (match !== null && isHeader(cm, lineNo + 1)) {
    return nextLine[0] === '=' ? 1 : 2
  }
  return maxDepth + 1
}

/**
 * Returns the range of a fold describing the full section from the start line
 * to the next heading of the same level. This function can assume that there is
 * a heading and thus can return a valid position.
 *
 * @param {CodeMirror.Editor} cm The CodeMirror instance
 * @param {CodeMirror.Pos} start The starting position
 *
 * @return {CodeMirror.MarkerRange} The range (from, to) of this heading fold
 */
function getHeadingFoldRange (cm: CodeMirror.Editor, start: ReturnType<typeof CodeMirror.Pos>): CodeMirror.MarkerRange {
  const firstLine = cm.getLine(start.line)
  let nextLine = cm.getLine(start.line + 1)
  const level = headerLevel(cm, start.line, firstLine, nextLine)

  const lastLineNo = cm.lastLine()
  let end = start.line
  let nextNextLine = cm.getLine(end + 2)
  while (end < lastLineNo) {
    if (headerLevel(cm, end + 1, nextLine, nextNextLine) <= level) {
      break
    }

    ++end
    nextLine = nextNextLine
    nextNextLine = cm.getLine(end + 2)
  }

  return {
    from: CodeMirror.Pos(start.line, firstLine.length),
    to: CodeMirror.Pos(end, cm.getLine(end).length)
  }
}

function getListFoldRange (cm: CodeMirror.Editor, start: ReturnType<typeof CodeMirror.Pos>): CodeMirror.MarkerRange|undefined {
  // We already know the start line is a list
  const firstLine = cm.getLine(start.line)
  const listIndentation = getListIndentation(firstLine)
  const lastLineNo = cm.lastLine()
  let end = start.line

  while (end < lastLineNo) {
    const nextIndentation = getListIndentation(cm.getLine(end + 1))
    if (nextIndentation <= listIndentation) {
      break // Either no list or same or higher level as the start
    }

    ++end
  }

  if (start.line === end) {
    return undefined // Single line item, no folding required
  } else {
    return {
      from: CodeMirror.Pos(start.line, firstLine.length),
      to: CodeMirror.Pos(end, cm.getLine(end).length)
    }
  }
}

CodeMirror.registerHelper('fold', 'markdown', function (cm: CodeMirror.Editor, start: ReturnType<typeof CodeMirror.Pos>) {
  const startLine = cm.getLine(start.line)
  const level = headerLevel(cm, start.line, startLine, cm.getLine(start.line + 1))
  const listIndentation = getListIndentation(startLine)

  if (level <= maxDepth) {
    return getHeadingFoldRange(cm, start)
  } else if (listIndentation > -1) {
    return getListFoldRange(cm, start)
  }
})
