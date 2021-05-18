// This plugin applies specific line classes to markdown headings to enable you
// to enlargen them via CSS.

const CodeMirror = require('codemirror')

module.exports = function (editor) {
  let homeEndBehaviour = global.config.get('editor.homeEndBehaviour')
  let keymap = {}

  // Crossplatform shortcuts
  keymap['Enter'] = 'newlineAndIndentContinueMarkdownList'
  keymap['Tab'] = 'autoIndentMarkdownList'
  keymap['Shift-Tab'] = 'autoUnindentMarkdownList'
  keymap['Ctrl-Enter'] = (cm) => {
    // Implement middle-of-line insert line below behaviour (see #101)
    CodeMirror.commands['goLineEnd'](cm)
    CodeMirror.commands['newlineAndIndent'](cm)
  }
  keymap['Shift-Ctrl-Enter'] = (cm) => {
    // Implement middle-of-line insert line above behaviour (see #101)
    CodeMirror.commands['goLineUp'](cm)
    CodeMirror.commands['goLineEnd'](cm)
    CodeMirror.commands['newlineAndIndent'](cm)
  }

  // Swap lines in the editor (mostly useful for lists)
  keymap['Alt-Up'] = 'swapLineUp'
  keymap['Alt-Down'] = 'swapLineDown'

  // macOS only shortcuts
  if (process.platform === 'darwin') {
    keymap['Cmd-F'] = false // Disable the internal search
    keymap['Alt-B'] = false // Disable word-backwarding on macOS (handled by Alt+ArrowLeft)
    keymap['Alt-F'] = false // Disable word-forwarding on macOS (handled by Alt+ArrowRight)
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
    // If homeEndBehaviour is true, use defaults (paragraph start/end), if it's
    // false, use visible lines.
    keymap['Home'] = (homeEndBehaviour) ? 'goLineStart' : 'goLineLeftSmart'
    keymap['End'] = (homeEndBehaviour) ? 'golineEnd' : 'goLineRight'
    keymap['Ctrl-Alt-F'] = 'insertFootnote'
    keymap['Ctrl-T'] = 'markdownMakeTaskList'
    keymap['Shift-Ctrl-C'] = 'markdownComment'
    keymap['Shift-Ctrl-I'] = 'markdownImage'
    keymap['Ctrl-K'] = 'markdownLink'
    keymap['Ctrl-I'] = 'markdownItalic'
    keymap['Ctrl-B'] = 'markdownBold'
  }

  // Returns a CodeMirror keymap for the main editor, aware of potential settings.
  return CodeMirror.normalizeKeyMap(keymap)
}
