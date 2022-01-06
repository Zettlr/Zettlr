/**
 * THIS IS A FORK OF ADDON/FOLD/MARKDOWN-FOLD
 *
 * See: https://codemirror.net/addon/fold/markdown-fold.js
 *
 * This is necessary, because our mode basically _is_
 * Markdown, but it can't be named as such.
 */

import CodeMirror from 'codemirror'

CodeMirror.registerHelper('fold', 'markdown', function (cm, start) {
  const maxDepth = 100

  function isHeader (lineNo) {
    const tokentype = cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0))
    return tokentype && /\bheader\b/.test(tokentype)
  }

  function headerLevel (lineNo, line, nextLine) {
    let match = line && line.match(/^#+/)
    if (match && isHeader(lineNo)) return match[0].length
    match = nextLine && nextLine.match(/^[=-]+\s*$/)
    if (match && isHeader(lineNo + 1)) return nextLine[0] === '=' ? 1 : 2
    return maxDepth
  }

  const firstLine = cm.getLine(start.line)
  let nextLine = cm.getLine(start.line + 1)
  const level = headerLevel(start.line, firstLine, nextLine)
  if (level === maxDepth) return undefined

  const lastLineNo = cm.lastLine()
  let end = start.line
  let nextNextLine = cm.getLine(end + 2)
  while (end < lastLineNo) {
    if (headerLevel(end + 1, nextLine, nextNextLine) <= level) break
    ++end
    nextLine = nextNextLine
    nextNextLine = cm.getLine(end + 2)
  }

  return {
    from: CodeMirror.Pos(start.line, firstLine.length),
    to: CodeMirror.Pos(end, cm.getLine(end).length)
  }
})
