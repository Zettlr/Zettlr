<template>
  <div class="code-editor-wrapper">
    <div v-bind:id="wrapperId"></div>
  </div>
</template>

<script lang="ts" setup>
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

// import { trans } from '@common/i18n-renderer'

import { Decoration, EditorView, lineNumbers, MatchDecorator, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { onMounted, ref, toRef, watch } from 'vue'
import { autocompletion, closeBrackets, CompletionContext } from '@codemirror/autocomplete'
import { bracketMatching, indentOnInput, StreamLanguage } from '@codemirror/language'
import { codeSyntaxHighlighter, markdownSyntaxHighlighter } from '@common/modules/markdown-editor/theme/syntax'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { EditorState } from '@codemirror/state'
import { cssLanguage } from '@codemirror/lang-css'
import markdownParser from '@common/modules/markdown-editor/parser/markdown-parser'

/**
 * We have to define the CodeMirror instance outside of Vue, since the Proxy-
 * fication messes with CodeMirror. Thus, we must prevent it from falling prey
 * to Vue's proxy
 *
 * @var {CodeMirror.Editor}
 */
const cmInstance = new EditorView()

// TODO: This could break if we ever have more than one code editor on the same page
const wrapperId = ref<string>('code-editor')

const cleanFlag = ref<boolean>(true)

const tabstopDeco = Decoration.mark({ class: 'cm-tm-tabstop' })
const placeholderDeco = Decoration.mark({ class: 'cm-tm-placeholder' })
const varDeco = Decoration.mark({ class: 'cm-tm-variable' })
const invalidVarDeco = Decoration.mark({ class: 'cm-tm-false-variable' })
const varPlaceholderDeco = Decoration.mark({ class: 'cm-tm-variable-placeholder' })

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

const snippetsDecorator = new MatchDecorator({
  // tabstops|tabstops with default|variables|variable with default
  regexp: /(?<tabstop>\$\d+)|(?<tabstopDefault>\$\{\d+:.+?\})|\$(?<var>[A-Z_]+)|\$\{(?<varDefault>[A-Z_]+):.+?\}/g,
  // tabstop and tabstopDefault -> valid tabstop
  // var and varDefault --> check the corresponding group if variable is correct
  decoration: m => {
    if (m.groups?.tabstop !== undefined) {
      return tabstopDeco
    } else if (m.groups?.tabstopDefault !== undefined) {
      return placeholderDeco
    } else if (m.groups?.var !== undefined) {
      if (SUPPORTED_VARIABLES.includes(m.groups.var)) {
        return varDeco
      } else {
        return invalidVarDeco
      }
    } else if (m.groups?.varDefault !== undefined) {
      if (SUPPORTED_VARIABLES.includes(m.groups.varDefault)) {
        return varPlaceholderDeco
      } else {
        return invalidVarDeco
      }
    } else {
      return invalidVarDeco // Default: invalid
    }
  }
})

const snippetsHighlight = ViewPlugin.define(view => ({
  decorations: snippetsDecorator.createDeco(view),
  update (u: ViewUpdate) {
    this.decorations = snippetsDecorator.updateDeco(u, this.decorations)
  }
}), { decorations: v => v.decorations })

function snippetsAutocomplete (context: CompletionContext) {
  const match = context.matchBefore(/\$[\da-z_]*$/i)
  if (match === null) {
    return null
  } else {
    const existingVarContents = match.text.toLowerCase().substring(1) // Ignore the $
    return {
      from: match.from,
      options: SUPPORTED_VARIABLES
        .filter(variable => variable.toLowerCase().startsWith(existingVarContents))
        .map(variable => { return { label: '$' + variable, type: 'keyword' } })
    }
  }
}

/**
 * Small drop-in plugin that assigns 'cm-link'-classes to everything that looks
 * like a link. Those links must have a protocol and only contain alphanumerics,
 * plus ., -, #, %, and /.
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
// function markLinks (cm: CodeMirror.Editor) {
//   // Very small drop in that marks URLs inside the code editor
//   for (let i = 0; i < cm.lineCount(); i++) {
//     const line = String(cm.getLine(i))
//     // Can contain a-z0-9, ., -, /, %, and #, but must end
//     // with an alphanumeric, a slash or a hashtag.
//     const match = /[a-z0-9-]+:\/\/[a-z0-9.-/#%]+[a-z0-9/#]/i.exec(line)
//     if (match === null) {
//       continue
//     }

//     const from = { line: i, ch: match.index }
//     const to = { line: i, ch: match.index + match[0].length }

//     // We can only have one marker at any given position at any given time
//     if (cm.findMarks(from, to).length > 0) {
//       continue
//     }

//     cm.markText(
//       from, to,
//       {
//         className: 'cm-link',
//         inclusiveLeft: false,
//         inclusiveRight: true,
//         attributes: { title: trans('Cmd/Ctrl+Click to open %s', match[0]) }
//       }
//     )
//   }
// }

/**
 * If applicable, follows a link from the editor.
 *
 * @param   {MouseEvent}  event  The triggering MouseEvent
 */
function maybeOpenLink (event: MouseEvent, view: EditorView) {
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

const extensions = [
  lineNumbers(),
  closeBrackets(),
  bracketMatching(),
  indentOnInput(),
  codeSyntaxHighlighter(), // This comes from the main editor component
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      // Tell the main component that the contents have changed
      cleanFlag.value = false
      emit('update:modelValue', cmInstance.state.doc.toString())
    }
  }),
  EditorView.domEventHandlers({
    mousedown: maybeOpenLink
  })
]

const yamlExtensions = [
  ...extensions,
  StreamLanguage.define(yaml)
]

const cssExtensions = [
  ...extensions,
  cssLanguage
]

const mdExtensions = [
  ...extensions,
  // Enable the user to autocomplete the snippets
  autocompletion({
    activateOnTyping: true, // Always show immediately
    selectOnOpen: false, // But never pre-select anything
    closeOnBlur: true,
    maxRenderedOptions: 20,
    override: [snippetsAutocomplete]
  }),
  markdownParser(), // Comes from the main editor
  markdownSyntaxHighlighter(), // Comes from the main editor
  snippetsHighlight
]

function setContents (contents: string, mode: 'css'|'yaml'|'markdown-snippets'): void {
  const state = EditorState.create({
    doc: contents,
    extensions: (mode === 'css') ? cssExtensions : (mode === 'yaml') ? yamlExtensions : mdExtensions
  })

  cmInstance.setState(state)
}

interface Props {
  modelValue: string
  mode: 'css'|'markdown-snippets'|'yaml'
  readonly?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{(e: 'update:modelValue', newContents: string): void}>()

watch(toRef(props, 'modelValue'), () => {
  // Assign new contents, but only if not the same as the current contents
  if (cmInstance.state.doc.toString() !== props.modelValue) {
    setContents(props.modelValue, props.mode)
  }
})

onMounted(() => {
  const wrapper = document.getElementById(wrapperId.value)

  if (wrapper !== null) {
    wrapper.replaceWith(cmInstance.dom)
  }

  setContents(props.modelValue, props.mode)
})

// Utility functions for those accessing this module
function isClean (): boolean {
  return cleanFlag.value
}

function markClean (): void {
  cleanFlag.value = true
}

defineExpose({ markClean, isClean })
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
  .code-editor-wrapper {
    height: 100%;
    position: relative;
    overflow: auto;
    margin: 20px 0px;
    background-color: white;
    border: 1px solid rgb(173, 173, 173);
  }

  .cm-editor.cm-focused {
    outline: none !important;
  }

  .cm-editor {
    cursor: text;
    .cm-scroller { overflow: auto; }
    height: 100%;

    // margin: 20px 0px;
    // background-color: white;
    // border: 1px solid rgb(173, 173, 173);
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
    .cm-gutters {
      background-color: @base1;
      color: @base00;
    }

    // Additional styles only for the GFM snippets editor
    .cm-tm-tabstop { color: @cyan; }
    .cm-tm-placeholder { color: @cyan; }
    .cm-tm-variable { color: @yellow; }
    .cm-tm-variable-placeholder { color: @violet; }
    .cm-tm-false-variable { color: @red; }

    // Applies to all tooltips
    .cm-tooltip-hover,
    .cm-tooltip-autocomplete,
    .cm-tooltip {
      border: none;
      padding: 5px;
      border-radius: 4px;
      box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, .25);
    }
  }

  &.dark {
    .cm-editor {
      background-color: rgb(65, 65, 65);
      border-color: rgb(100, 100, 100);
      color: @base3;
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
      .cm-gutters {
        background-color: @base01;
        color: @base1;
      }

      .cm-tooltip-hover,
      .cm-tooltip-autocomplete,
      .cm-tooltip {
        background-color: rgb(40, 40, 40);
        border: 1px solid rgb(80, 80, 80);
      }
    }
  }
}
</style>
