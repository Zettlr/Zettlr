// This plugin applies specific line classes to markdown headings to enable you
// to enlargen them via CSS.

const CodeMirror = require('codemirror')

module.exports = function (editor) {
  let homeEndBehaviour = global.config.get('editor.homeEndBehaviour')

  // Returns a CodeMirror keymap for the main editor, aware of potential settings.
  return CodeMirror.normalizeKeyMap({
    'Cmd-F': false, // Disable the internal search on macOS
    'Ctrl-F': false, // Disable the internal search on Windows + Linux
    'Alt-B': false, // Disable word-backwarding on macOS (handled by Alt+ArrowLeft)
    'Alt-F': false, // Disable word-forwarding on macOS (handled by Alt+ArrowRight)
    'Enter': 'newlineAndIndentContinueMarkdownList',
    'Tab': 'autoIndentMarkdownList',
    'Shift-Tab': 'autoUnindentMarkdownList',
    // If homeEndBehaviour is true, use defaults (paragraph start/end), if it's
    // false, use visible lines.
    'Home': (homeEndBehaviour) ? 'goLineStart' : 'goLineLeftSmart',
    'End': (homeEndBehaviour) ? 'golineEnd' : 'goLineRight',
    'Ctrl-Enter': (cm) => {
      // Implement middle-of-line insert line below behaviour (see #101)
      CodeMirror.commands['goLineEnd'](cm)
      CodeMirror.commands['newlineAndIndent'](cm)
    },
    'Shift-Ctrl-Enter': (cm) => {
      // Implement middle-of-line insert line above behaviour (see #101)
      CodeMirror.commands['goLineUp'](cm)
      CodeMirror.commands['goLineEnd'](cm)
      CodeMirror.commands['newlineAndIndent'](cm)
    },
    // We need to override the default behaviour
    'Ctrl-Shift-V': (cm) => {
      if (process.platform === 'darwin') return
      editor.pasteAsPlain()
    },
    'Cmd-Shift-V': (cm) => {
      editor.pasteAsPlain()
    }
  })
}
