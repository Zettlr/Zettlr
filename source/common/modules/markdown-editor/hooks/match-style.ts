/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror match style hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Enables users to paste HTML contents and have them be
 *                  converted to Markdown.
 *
 * END HEADER
 */

import html2md from '@common/util/html-to-md'
import CodeMirror from 'codemirror'
const clipboard = window.clipboard

/**
 * Parses possible HTML clipboard content to Markdown to enable
 * "Paste and match style" functionality.
 *
 * @param   {CodeMirror.Editor}  cm  The instance
 */
export default function matchStyleHook (cm: CodeMirror.Editor): void {
  cm.on('beforeChange', (cm, changeObj) => {
    // If text is to be pasted, we may need to exchange some text.
    if (changeObj.origin !== 'paste' || changeObj.update === undefined) {
      return
    }

    const html = clipboard.readHTML()
    let plain = clipboard.readText()
    const explicitPaste = plain.replace(/\r/g, '') === changeObj.text.join('\n')

    // In case there is HTML-formatted text in the clipboard, we'll be sneaky
    // and simply exchange the plain text with the Markdown formatted version.
    // We need an additional check to make sure the HTML version is indeed
    // different than the plain text version, as some apps may write the same
    // plain text stuff into the HTML part of the clipboard, in which case
    // dragging it through the converter will result in unwanted behaviour
    // (including Electron). We have the problem that CodeMirror treats moving
    // text around and dropping links exactly the same as explicitly hitting
    // Cmd/Ctrl+V. The only way we can be sure is to make sure the changeObject
    // is the same as the plain text from the clipboard. ONLY in this instance
    // is it a regular, explicit paste. Else the text in the changeObject takes
    // precedence.
    if (html.length > 0 && (plain.length === 0 || html !== plain) && explicitPaste) {
      plain = html2md(html)
      // NOTE that we have to split the resulting string as the update method
      // expects an Array of lines, not a complete string with line breaks.
      changeObj.update(changeObj.from, changeObj.to, plain.split('\n'))
    }
  })
}
