


/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Emphasis rendering plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin renders emphasis such as italics and bold
  *
  * END HEADER
  */

 import CodeMirror, { commands } from 'codemirror'
 import canRenderElement from './util/can-render-element'
//import count_codeblock from 'source/common/modules/markdown-editor/hooks/codeblock-classes'

 // const emphasisRE = /(?<![\\])(?<=\s|^)([*_]{1,3}|~{2})((?!\s)[^*_]+?(?<![\s\\]))(?:[*_]{1,3}|~{2})(?=\s|$)/g
 const emphasisRE = /(?<![\\\w])([*_]{1,3}|~{2})((?!\s)[^*_]+?(?![\s\\]))(?:[*_]{1,3}|~{2})(?![\\\w])/g
const clipboard = window.clipboard
 /**
  * Declare the markdownRenderEmphasis command
  *
  * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
  */
 ;(commands as any).markdownRenderCodeBlockButton = function (cm: CodeMirror.Editor) {
   // We'll only render the viewport
   const viewport = cm.getViewport()
   for (let i = viewport.from; i < viewport.to; i++) {
     if (cm.getModeAt({ line: i, ch: 0 }).name !== 'markdown-zkn') {
       continue
     }

     // First get the line and test if the contents contain a link
     const line = cm.getLine(i)

     // -------------- CODE TO CREATE BUTTON -------------------------------
     // At the moment this only gets the first code block (the array[0] part)
     // This can be fixed later by adding a for loop over all the elements with
     // the class name
     //export default function copy_button (var count_position): void {
     //}
     var count_codeblock = 0
     const codeBlockRE = /^(?:\s{0,3}`{3}|~{3}).*/
     const lineCount = cm.lineCount()
     var incodeblock = false
       var codesblocks = new Array()
       var codeblock = ''
     for (let j = 0; j<lineCount; j++){
         //console.log("in")
       const line = cm.getLine(j)
       if (codeBlockRE.test(line) && !incodeblock){
         count_codeblock = count_codeblock + 1
           codeblock = ''
           codeblock = codeblock + cm.getLine(++j) + '\n'
           incodeblock = true
       }
       else if (codeBlockRE.test(line) && incodeblock){
           codesblocks.push(codeblock)
           
           incodeblock = false
       }
       else if(!codeBlockRE.test(line) && incodeblock){
           codeblock = codeblock + cm.getLine(j) + '\n'
       }
     }
     //console.log(1)
     //console.log(blocks)
       console.log('codesblocks' + codesblocks[1])
       console.log('type' + typeof Number(count_codeblock))
       for (let i = 0; i < Number(count_codeblock); i++) {
           let codeBlock = document.getElementsByClassName("code-block-first-line")[i]

           // Create a button
           let copyButton = document.createElement("button")
           copyButton.className = "code-block-copy-button"
           copyButton.innerText = "Copy"
           if (codeBlock.querySelector(".code-block-copy-button") == null) {
               codeBlock.appendChild(copyButton)
           }
           copyButton.onclick = function() {
               clipboard.writeText(codesblocks[i])
           }
       }
   } // END for-loop
 }

