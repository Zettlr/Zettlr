/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Codeblock copy button rendering plugin
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
   * Declare the  markdownRenderCodeBlockButton command
   *
   * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
*/
;(commands as any).markdownRenderCodeBlockButton = function (cm: CodeMirror.Editor) {
  cm.startOperation()

  let countCodeblock = 0
  const codeBlockRE = /^(?:\s{0,3}`{3}|~{3}).*/
  const lineCount = cm.lineCount()
  let incodeblock = false
  let codesblocks = new Array<string>()
  let codeblock = ''
  const codeblockClassOpen = 'code-block-first-line'
  const codeblockClassClose = 'code-block-last-line'
  const codeblocks = document.getElementsByClassName(codeblockClassOpen)

  // This loop is grab the code block's code and store as a list
  for (let j = 0; j < lineCount; j++) {
    const line = cm.getLine(j)
    if (codeBlockRE.test(line) && !incodeblock) {
      countCodeblock = countCodeblock + 1
      codeblock = codeblock + cm.getLine(++j) + '\n'
      incodeblock = true
    } else if (codeBlockRE.test(line) && incodeblock) {
      // Update the codes in code-block
      // Remove newline character after the last code line
      codeblock = codeblock.slice(0, -1)
      codesblocks.push(codeblock)
      codeblock = ''
      incodeblock = false
    } else if (incodeblock) {
      codeblock = codeblock + cm.getLine(j) + '\n'
    }
  }
  // This loop is update the copy buttons for each code block
  if (document.getElementsByClassName(codeblockClassClose).length === codeblocks.length) {
    for (let i = 0; i < codeblocks.length; i++) {
      const codeBlock = codeblocks[i]
      if (codeBlock === undefined) {
        continue
      }
      const codeBlockText = codesblocks[i]
      // Create a button
      if (codeBlock.hasChildNodes() && codeBlock.childNodes.length > 1) {
        codeBlock.childNodes[1].addEventListener('click', () => clipboard.writeText(codeBlockText))
      } else {
        // Add property for copy button
        let copyButton = document.createElement('button')
        copyButton.className = 'code-block-copy-button'
        copyButton.innerText = 'Copy'
        codeBlock.appendChild(copyButton)
        copyButton.addEventListener('click', () => clipboard.writeText(codeBlockText))
      }
    }
  }
  cm.endOperation()
}
