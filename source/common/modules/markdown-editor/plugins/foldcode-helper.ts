/**
 * THIS IS A FORK OF ADDON/FOLD/MARKDOWN-FOLD
 *
 * See: https://codemirror.net/addon/fold/markdown-fold.js
 *
 * This is necessary, because our mode basically _is_
 * Markdown, but it can't be named as such.
 */

import CodeMirror from 'codemirror'

const maxDepth = 100

function isHeader (cm: CodeMirror.Editor, lineNo: number): boolean {
  const tokentype = cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0))
  return tokentype !== null && /\bheader\b/.test(tokentype)
}

function headerLevel (cm: CodeMirror.Editor, lineNo: number, line: string, nextLine: string): number {
  let match = (typeof line === 'string') ? line.match(/^#+/) : null
  if (match !== null && isHeader(cm, lineNo)) {
    return match[0].length
  }

  match = (typeof nextLine === 'string') ? nextLine.match(/^[=-]+\s*$/) : null
  if (match !== null && isHeader(cm, lineNo + 1)) {
    return nextLine[0] === '=' ? 1 : 2
  }
  return maxDepth
}

CodeMirror.registerHelper('fold', 'markdown', function (cm: CodeMirror.Editor, start: ReturnType<typeof CodeMirror.Pos>) {
  const firstLine = cm.getLine(start.line)
  let nextLine = cm.getLine(start.line + 1)
  const level = headerLevel(cm, start.line, firstLine, nextLine)

  if (level === maxDepth) {
    return undefined
  }

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
})
