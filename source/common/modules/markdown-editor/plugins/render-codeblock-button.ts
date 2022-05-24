/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        copy-to-clipboard button rendering plugin
 * CVM-Role:        CodeMirror Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin renders copy-to-clipboard button
 *
 * END HEADER
 */

import CodeMirror, { commands } from 'codemirror'

const clipboard = window.clipboard
/**
   * Declare the markdownRenderEmphasis command
   *
   * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
*/
;(commands as any).markdownRenderCodeBlockButton = function (cm: CodeMirror.Editor) {
  cm.startOperation()
  let countCodeblock = 0
  const codeBlockRE = /^(?:\s{0,3}`{3}|~{3}).*/
  const lineCount = cm.lineCount()
  let incodeblock = false
  let codesblocks = new Array()
  let codeblock = ''
  for (let j = 0; j < lineCount; j++) {
    const line = cm.getLine(j)
    if (codeBlockRE.test(line) && !incodeblock) {
      countCodeblock = countCodeblock + 1
      codeblock = codeblock + cm.getLine(++j) + '\n'
      incodeblock = true
    } else if (codeBlockRE.test(line) && incodeblock) {
      codesblocks.push(codeblock)
      codeblock = ''
      incodeblock = false
    } else if (incodeblock) {
      codeblock = codeblock + cm.getLine(j) + '\n'
    }
  }

  for (let i = 0; i < Number(countCodeblock); i++) {
    const codeBlock1 = document.getElementsByClassName('cm-formatting-code-block-open')[i]
    console.log(i)
    if (codeBlock1.hasChildNodes()) {
      if (codeBlock1.childNodes.length > 1) {
        codeBlock1.removeChild(codeBlock1.childNodes[1])
      }
    }
  }
  for (let i = 0; i < Number(countCodeblock); i++) {
    const codeBlock = document.getElementsByClassName('cm-formatting-code-block-open')[i]
    // Create a button
    const copyButton = document.createElement('button')
    copyButton.className = 'code-block-copy-button'
    copyButton.innerText = 'Copy'
    codeBlock.appendChild(copyButton)
    copyButton.onclick = function () {
      console.log('in')
      clipboard.writeText(codesblocks[i])
    }
  }
  cm.endOperation()
}
