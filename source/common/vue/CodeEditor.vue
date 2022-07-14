<template>
  <textarea ref="editor"></textarea>
</template>

<script lang="ts">
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
import 'codemirror/mode/gfm/gfm'
import 'codemirror/addon/mode/overlay'

import { trans } from '@common/i18n-renderer'

import { defineComponent } from 'vue'

/**
 * We have to define the CodeMirror instance outside of Vue, since the Proxy-
 * fication messes with CodeMirror. Thus, we must prevent it from falling prey
 * to Vue's proxy
 *
 * @var {CodeMirror.Editor}
 */
let cmInstance: CodeMirror.Editor|null = null

/**
 * Define a snippets mode that extends the GFM mode with TextMate syntax.
 *
 * @param  {Object}       config     The original mode config
 * @param  {Object}       parsercfg  The parser config
 *
 * @return {OverlayMode}             The generated overlay mode
 */
CodeMirror.defineMode('markdown-snippets', function (config, parsercfg) {
  // Create the overlay and such
  // Only matches simple $0 or $14 tabstops
  const tabstopRE = /\$\d+/
  // Matches tabstops with defaults
  const placeholderRE = /\$\{\d+:.+?\}/
  // Matches only valid variables
  const onlyVarRE = /\$([A-Z_]+)/
  // Matches only valid variables plus their placeholder
  const variableRE = /\$\{([A-Z_]+):.+?\}/

  // NOTE: This array corresponds to whatever is defined in autocomplete.js
  const SUPPORTED_VARIABLES = [
    'CURRENT_YEAR',
    'CURRENT_YEAR_SHORT',
    'CURRENT_MONTH',
    'CURRENT_MONTH_NAME',
    'CURRENT_MONTH_NAME_SHORT',
    'CURRENT_DATE',
    'CURRENT_HOUR',
    'CURRENT_MINUTE',
    'CURRENT_SECOND',
    'CURRENT_SECONDS_UNIX',
    'UUID',
    'CLIPBOARD',
    'ZKN_ID',
    'CURRENT_ID',
    'FILENAME',
    'DIRECTORY',
    'EXTENSION'
  ]

  const markdownSnippets = {
    token: function (stream: CodeMirror.StringStream) {
      if (stream.match(tabstopRE) !== null) {
        return 'tm-tabstop'
      }

      if (stream.match(placeholderRE) !== null) {
        return 'tm-placeholder'
      }

      if (stream.match(onlyVarRE, false) !== null) {
        const variable = stream.match(onlyVarRE)[1]
        if (SUPPORTED_VARIABLES.includes(variable)) {
          return 'tm-variable'
        } else {
          return 'tm-false-variable'
        }
      }

      if (stream.match(variableRE, false) !== null) {
        const variable = stream.match(variableRE)[1]
        if (SUPPORTED_VARIABLES.includes(variable)) {
          return 'tm-variable-placeholder'
        } else {
          return 'tm-false-variable'
        }
      }

      // We didn't match anything, so try again next time.
      stream.next()
      return null
    }
  }

  const mode = CodeMirror.getMode(config, {
    name: 'gfm',
    highlightFormatting: true,
    gitHubSpice: false
  })
  return CodeMirror.overlayMode(mode, markdownSnippets, true)
})

/**
 * Small drop-in plugin that assigns 'cm-link'-classes to everything that looks
 * like a link. Those links must have a protocol and only contain alphanumerics,
 * plus ., -, #, %, and /.
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
function markLinks (cm: CodeMirror.Editor) {
  // Very small drop in that marks URLs inside the code editor
  for (let i = 0; i < cm.lineCount(); i++) {
    const line = String(cm.getLine(i))
    // Can contain a-z0-9, ., -, /, %, and #, but must end
    // with an alphanumeric, a slash or a hashtag.
    const match = /[a-z0-9-]+:\/\/[a-z0-9.-/#%]+[a-z0-9/#]/i.exec(line)
    if (match === null) {
      continue
    }

    const from = { line: i, ch: match.index }
    const to = { line: i, ch: match.index + match[0].length }

    // We can only have one marker at any given position at any given time
    if (cm.findMarks(from, to).length > 0) {
      continue
    }

    cm.markText(
      from, to,
      {
        className: 'cm-link',
        inclusiveLeft: false,
        inclusiveRight: true,
        attributes: { title: trans('gui.ctrl_click_to_open', match[0]) }
      }
    )
  }
}

/**
 * If applicable, follows a link from the editor.
 *
 * @param   {MouseEvent}  event  The triggering MouseEvent
 */
function maybeOpenLink (event: MouseEvent) {
  const t = event.target
  const cmd = process.platform === 'darwin' && event.metaKey
  const ctrl = process.platform !== 'darwin' && event.ctrlKey

  if (cmd === false && ctrl === false) {
    return
  }

  if (t === null || !(t instanceof Element)) {
    return
  }

  if (t.className.includes('cm-link') === true && t.textContent !== null) {
    window.location.assign(t.textContent)
  }
}

export default defineComponent({
  name: 'CodeEditor',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    mode: {
      type: String,
      default: 'css'
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  data: function () {
    return {
      cmInstance: null
    }
  },
  watch: {
    modelValue: function () {
      if (cmInstance === null) {
        return
      }

      const currentValue = cmInstance.getValue()

      if (currentValue !== this.modelValue) {
        const cur = Object.assign({}, cmInstance.getCursor())
        cmInstance.setValue(this.modelValue)
        cmInstance.setCursor(cur)
      }
    },
    readonly: function () {
      if (cmInstance === null) {
        return
      }

      if (this.readonly === true) {
        cmInstance.setOption('readOnly', 'nocursor')
      } else {
        cmInstance.setOption('readOnly', false)
      }
    }
  },
  mounted: function () {
    cmInstance = CodeMirror.fromTextArea(this.$refs['editor'] as HTMLTextAreaElement, {
      lineNumbers: true,
      theme: 'code-editor',
      mode: this.mode,
      cursorScrollMargin: 20,
      lineWrapping: true,
      autoCloseBrackets: true,
      readOnly: (this.readonly === true) ? 'nocursor' : false,
      extraKeys: {
        // Even though indentWithTabs is false, without remapping Tab to
        // indentation, it would insert a Tab rather than spaces. So we have
        // to rebind it here.
        Tab: (cm) => cm.execCommand('indentMore')
      }
    })

    cmInstance.setValue(this.modelValue)

    cmInstance.on('change', (event, changeObj) => {
      if (cmInstance === null) {
        return
      }

      this.$emit('update:modelValue', cmInstance.getValue())
    })

    // Detect links inside the source code and listen for clicks on these.
    cmInstance.on('cursorActivity', markLinks)
    cmInstance.getWrapperElement().addEventListener('mousedown', maybeOpenLink)
  },
  beforeUnmount: function () {
    if (cmInstance === null) {
      return
    }

    const cmWrapper = cmInstance.getWrapperElement()
    if (cmWrapper.parentNode === null) {
      return
    }

    // "Remove this from your tree to delete an editor instance."
    cmWrapper.parentNode.removeChild(cmWrapper)
  },
  methods: {
    setValue: function (newContents: string) {
      if (cmInstance === null) {
        return
      }

      cmInstance.setValue(newContents)
    },
    isClean: function () {
      if (cmInstance === null) {
        return true
      }

      return cmInstance.isClean()
    },
    markClean: function () {
      if (cmInstance === null) {
        return
      }

      cmInstance.markClean()
    }
  }
})
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

    // Additional styles only for the GFM snippets editor
    .cm-tm-tabstop { color: @cyan; }
    .cm-tm-placeholder { color: @cyan; }
    .cm-tm-variable { color: @yellow; }
    .cm-tm-variable-placeholder { color: @violet; }
    .cm-tm-false-variable { color: @red; }
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
