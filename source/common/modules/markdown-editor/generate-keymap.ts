/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        generateKeymap
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin returns a keymap for CodeMirror
 *
 * END HEADER
 */

import { commands, KeyMap, normalizeKeyMap } from 'codemirror'
const clipboard = (window as any).clipboard

export default function (): KeyMap {
  let homeEndBehaviour = Boolean(global.config.get('editor.homeEndBehaviour'))
  const keymap: KeyMap = {}

  // Crossplatform shortcuts
  keymap['Enter'] = 'newlineAndIndentContinueMarkdownList'
  keymap['Tab'] = 'autoIndentMarkdownList'
  keymap['Shift-Tab'] = 'autoUnindentMarkdownList'
  keymap['Ctrl-Enter'] = (cm) => {
    // Implement middle-of-line insert line below behaviour (see #101)
    commands['goLineEnd'](cm)
    commands['newlineAndIndent'](cm)
  }
  keymap['Shift-Ctrl-Enter'] = (cm) => {
    // Implement middle-of-line insert line above behaviour (see #101)
    commands['goLineUp'](cm)
    commands['goLineEnd'](cm)
    commands['newlineAndIndent'](cm)
  }

  // Swap lines in the editor (mostly useful for lists)
  keymap['Alt-Up'] = 'swapLineUp'
  keymap['Alt-Down'] = 'swapLineDown'

  // If homeEndBehaviour is true, use defaults (paragraph start/end), if it's
  // false, use visible lines.
  keymap['Home'] = (homeEndBehaviour) ? 'goLineStart' : 'goLineLeftMarkdown'
  keymap['End'] = (homeEndBehaviour) ? 'golineEnd' : 'goLineRight'

  // macOS only shortcuts
  if (process.platform === 'darwin') {
    keymap['Cmd-F'] = false // Disable the internal search
    keymap['Alt-B'] = false // Disable word-backwarding on macOS (handled by Alt+ArrowLeft)
    keymap['Alt-F'] = false // Disable word-forwarding on macOS (handled by Alt+ArrowRight)
    // Disable the native indentLess and indentMore shortcuts, since we do that
    // via Tab and Shift-Tab and Cmd-[/Cmd-] are reserved for file back/forward
    keymap['Cmd-['] = false
    keymap['Cmd-]'] = false
    keymap['Cmd-Left'] = 'goLineLeftMarkdown'
    keymap['Cmd-Alt-R'] = 'insertFootnote'
    keymap['Cmd-T'] = 'markdownMakeTaskList'
    keymap['Shift-Cmd-C'] = 'markdownComment'
    keymap['Shift-Cmd-I'] = 'markdownImage'
    keymap['Cmd-K'] = 'markdownLink'
    keymap['Cmd-I'] = 'markdownItalic'
    keymap['Cmd-B'] = 'markdownBold'
  } else {
    // Windows/Linux/other shortcuts
    keymap['Ctrl-F'] = false // Disable the internal search
    // Disable the native indentLess and indentMore shortcuts, since we do that
    // via Tab and Shift-Tab and Cmd-[/Cmd-] are reserved for file back/forward
    keymap['Ctrl-['] = false
    keymap['Ctrl-]'] = false
    // NOTE: While on macOS, priority is given to the menu bar handlers, on
    // Windows a paste event with the shift key held will be handled normally
    // by the editor, which means that it will ALWAYS fire the beforeChange
    // handler (defined in match-style.js) and only afterwards trigger the
    // paste-as-plain method on the main editor instance. By re-mapping that key
    // here, we effectively intercept it and prevent CodeMirror from doing funky
    // stuff with it.
    keymap['Shift-Ctrl-V'] = function (cm) {
      const plainText = clipboard.readText()
      cm.replaceSelection(plainText)
    }
    keymap['Ctrl-Alt-F'] = 'insertFootnote'
    keymap['Ctrl-T'] = 'markdownMakeTaskList'
    keymap['Shift-Ctrl-C'] = 'markdownComment'
    keymap['Shift-Ctrl-I'] = 'markdownImage'
    keymap['Ctrl-K'] = 'markdownLink'
    keymap['Ctrl-I'] = 'markdownItalic'
    keymap['Ctrl-B'] = 'markdownBold'
  }

  // Returns a CodeMirror keymap for the main editor, aware of potential settings.
  return normalizeKeyMap(keymap)
}
