/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror codeblock hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Adds Codeblock line classes where applicable.
 *
 * END HEADER
 */
import CodeMirror from 'codemirror'
const codeblockClass = 'code-block-line'
const codeblockClassOpen = 'code-block-first-line'
const codeblockClassClose = 'code-block-last-line'

/**
 * Hooks onto the change and swapDoc events to apply codeblock classes.
 *
 * @param   {CodeMirror.Editor}  cm  The instance
 */
export default function codeblockClassHook (cm: CodeMirror.Editor): void {
  cm.on('change', findCode)
  cm.on('swapDoc', findCode)
}

/**
 * Finds fenced code blocks and applies classes to the wrapper elements of the
 * lines in order to style the block as a whole (as opposed to inline styles
 * which we are limited to in the parser).
 *
 * @param   {CodeMirror.Editor}  cm  The instance
 */
function findCode (cm: CodeMirror.Editor): void {
  const lineCount = cm.lineCount()
  const codeBlockRE = /^(?:\s{0,3}`{3}|~{3}).*/

  let inCodeBlock = false

  cm.startOperation()

  // Check lines for code blocks
  for (let i = 0; i < lineCount; i++) {
    const line = cm.getLine(i)
    if (!inCodeBlock) {
      // Not a codeblock: Remove any class
      cm.removeLineClass(i, 'wrap', codeblockClass)
      cm.removeLineClass(i, 'wrap', codeblockClassOpen)
      cm.removeLineClass(i, 'wrap', codeblockClassClose)
      if (codeBlockRE.test(line)) {
        // Begin a codeblock
        inCodeBlock = true
        // Increment the lineCount and apply the code start line to that line
        cm.addLineClass(++i, 'wrap', codeblockClass)
        cm.addLineClass(i, 'wrap', codeblockClassOpen)
        // Remove a potential close class, in case we have just one line of
        // code block; found by @kyaso
        cm.removeLineClass(i, 'wrap', codeblockClassClose)
      }
    } else if (codeBlockRE.test(line) && inCodeBlock) {
      // End a codeblock: Remove any codeblock class
      cm.removeLineClass(i, 'wrap', codeblockClass)
      cm.removeLineClass(i, 'wrap', codeblockClassOpen)
      cm.removeLineClass(i, 'wrap', codeblockClassClose)
      // Apply the closer to the previous line
      cm.addLineClass(i - 1, 'wrap', codeblockClassClose)
      inCodeBlock = false
    } else if (inCodeBlock) {
      // Within a codeblock
      cm.addLineClass(i, 'wrap', codeblockClass)
      cm.removeLineClass(i, 'wrap', codeblockClassOpen)
      cm.removeLineClass(i, 'wrap', codeblockClassClose)
    }
  }

  cm.endOperation()
}
