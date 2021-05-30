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
      autoCloseBrackets: true,
      // Disable cursor blinking, as we apply a @keyframes animation
      cursorBlinkRate: 0
    })

    this.cmInstance.setValue(this.value)

    this.cmInstance.on('change', (event, changeObj) => {
      this.$emit('input', this.cmInstance.getValue())
    })
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
