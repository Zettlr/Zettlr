<template>
  <textarea ref="editor"></textarea>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeEditor
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Renders a small CodeMirror instance. This component can be
 *                  used wherever we need a code editor rather than the complex,
 *                  big main editor instance that is used in the main window.
 *
 * END HEADER
 */

import CodeMirror from 'codemirror'
import 'codemirror/addon/edit/closebrackets'

import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/css/css'
import 'codemirror/mode/yaml/yaml'

/**
 * Small drop-in plugin that assigns 'cm-link'-classes to everything that looks
 * like a link. Those links must have a protocol and only contain alphanumerics,
 * plus ., -, #, %, and /.
 *
 * @param   {CodeMirror}  cm  The CodeMirror instance
 */
function markLinks (cm) {
  // Very small drop in that marks URLs inside the code editor
  for (let i = 0; i < cm.doc.lineCount(); i++) {
    const line = String(cm.doc.getLine(i))
    // Can contain a-z0-9, ., -, /, %, and #, but must end
    // with an alphanumeric, a slash or a hashtag.
    const match = /[a-z0-9-]+:\/\/[a-z0-9.-/#%]+[a-z0-9/#]/i.exec(line)
    if (match === null) {
      continue
    }

    const from = { line: i, ch: match.index }
    const to = { line: i, ch: match.index + match[0].length }

    // We can only have one marker at any given position at any given time
    if (cm.doc.findMarks(from, to).length > 0) {
      continue
    }

    cm.doc.markText(
      from, to,
      {
        className: 'cm-link',
        inclusiveLeft: false,
        inclusiveRight: true,
        attributes: { title: `Cmd/Ctrl+Click to open ${match[0]}` } // TODO: Translate
      }
    )
  }
}

/**
 * If applicable, follows a link from the editor.
 *
 * @param   {MouseEvent}  event  The triggering MouseEvent
 */
function maybeOpenLink (event) {
  const t = event.target
  const cmd = process.platform === 'darwin' && event.metaKey
  const ctrl = process.platform !== 'darwin' && event.ctrlKey

  if (!cmd && !ctrl) {
    return
  }

  if (t.className.includes('cm-link') === true) {
    window.location.assign(t.textContent)
  }
}

export default {
  name: 'CodeEditor',
  props: {
    value: {
      type: String,
      default: ''
    },
    mode: {
      type: String,
      default: 'css'
    }
  },
  data: function () {
    return {
      cmInstance: null
    }
  },
  watch: {
    value: function () {
      if (this.cmInstance !== null) {
        const cur = Object.assign({}, this.cmInstance.getCursor())
        this.cmInstance.setValue(this.value)
        this.cmInstance.setCursor(cur)
      }
    }
  },
  mounted: function () {
    this.cmInstance = CodeMirror.fromTextArea(this.$refs['editor'], {
      lineNumbers: true,
      theme: 'code-editor',
      mode: this.mode,
      cursorScrollMargin: 20,
      lineWrapping: true,
      autoCloseBrackets: true
    })

    this.cmInstance.setValue(this.value)

    this.cmInstance.on('change', (event, changeObj) => {
      this.$emit('input', this.cmInstance.getValue())
    })

    // Detect links inside the source code and listen for clicks on these.
    this.cmInstance.on('cursorActivity', markLinks)
    this.cmInstance.getWrapperElement().addEventListener('mousedown', maybeOpenLink)
  },
  beforeDestroy: function () {
    const cmWrapper = this.cmInstance.getWrapperElement()
    // "Remove this from your tree to delete an editor instance."
    cmWrapper.parentNode.removeChild(cmWrapper)
  },
  methods: {
    setValue: function (newContents) {
      this.cmInstance.setValue(newContents)
    },
    isClean: function () {
      return this.cmInstance.isClean()
    },
    markClean: function () {
      this.cmInstance.markClean()
    }
  }
}
</script>

<style lang="less">
// We're using this solarized theme here: https://ethanschoonover.com/solarized/
@base03:    #002b36;
@base02:    #073642;
@base01:    #586e75;
@base00:    #657b83;
@base0:     #839496;
@base1:     #93a1a1;
@base2:     #eee8d5;
@base3:     #fdf6e3;
@yellow:    #b58900;
@orange:    #cb4b16;
@red:       #dc322f;
@magenta:   #d33682;
@violet:    #6c71c4;
@blue:      #268bd2;
@cyan:      #2aa198;
@green:     #859900;

body {
  .CodeMirror.cm-s-code-editor {
    margin: 20px 0px;
    background-color: white;
    border: 1px solid rgb(173, 173, 173);
    color: @base01;
    .cm-string     { color: @green; }
    .cm-string-2   { color: @green; }
    .cm-keyword    { color: @green; }
    .cm-atom       { color: @green; }
    .cm-tag        { color: @blue; }
    .cm-qualifier  { color: @blue; }
    .cm-builtin    { color: @blue; }
    .cm-variable-2 { color: @yellow; }
    .cm-variable   { color: @yellow; }
    .cm-comment    { color: @base1; }
    .cm-attribute  { color: @orange; }
    .cm-property   { color: @magenta; }
    .cm-type       { color: @red; }
    .cm-number     { color: @violet; }
    .CodeMirror-gutters { background-color: @base1; }
    .CodeMirror-linenumber { color: @base00; }
  }

  &.dark {
    .CodeMirror.cm-s-code-editor {
      background-color: rgb(65, 65, 65);
      border-color: rgb(100, 100, 100);
      color: @base01;
      .cm-string     { color: @red; }
      .cm-string-2   { color: @red; }
      .cm-keyword    { color: @red; }
      .cm-atom       { color: @red; }
      .cm-tag        { color: @blue; }
      .cm-qualifier  { color: @blue; }
      .cm-builtin    { color: @blue; }
      .cm-variable-2 { color: @yellow; }
      .cm-variable   { color: @yellow; }
      .cm-comment    { color: @base1; }
      .cm-attribute  { color: @orange; }
      .cm-property   { color: @magenta; }
      .cm-type       { color: @green; }
      .cm-number     { color: @violet; }
      .CodeMirror-gutters { background-color: @base01; }
      .CodeMirror-linenumber { color: @base1; }
    }
  }
}
</style>
