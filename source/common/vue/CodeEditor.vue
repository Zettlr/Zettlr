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

import { drawSelection, dropCursor, EditorView, keymap, lineNumbers } from '@codemirror/view'
import { onMounted, ref, toRef, watch } from 'vue'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { bracketMatching, codeFolding, foldGutter, indentOnInput, StreamLanguage } from '@codemirror/language'
import { codeSyntaxHighlighter, markdownSyntaxHighlighter } from '@common/modules/markdown-editor/theme/syntax'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { EditorState, Extension } from '@codemirror/state'
import { cssLanguage } from '@codemirror/lang-css'
import markdownParser from '@common/modules/markdown-editor/parser/markdown-parser'
import { yamlLint } from '@common/modules/markdown-editor/linters/yaml-lint'
import { lintGutter } from '@codemirror/lint'
import { showStatusbarEffect, statusbar } from '@common/modules/markdown-editor/statusbar'
import { search, searchKeymap } from '@codemirror/search'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { snippetSyntaxExtension } from '@common/modules/markdown-utils/snippets-syntax-extension'
import { plainLinkHighlighter } from '@common/modules/markdown-utils/plain-link-highlighter'

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

function getExtensions (mode: 'css'|'yaml'|'markdown-snippets'): Extension[] {
  const extensions = [
    keymap.of([
      ...defaultKeymap, // Minimal default keymap
      ...historyKeymap, // , // History commands (redo/undo)
      ...closeBracketsKeymap, // Binds Backspace to deletion of matching brackets
      ...searchKeymap // Search commands (Ctrl+F, etc.)
    ]),
    search({ top: true }),
    codeFolding(),
    foldGutter(),
    history(),
    drawSelection({ drawRangeCursor: false, cursorBlinkRate: 1000 }),
    dropCursor(),
    statusbar,
    EditorState.allowMultipleSelections.of(true),
    // Ensure the cursor never completely sticks to the top or bottom of the editor
    EditorView.scrollMargins.of(view => { return { top: 30, bottom: 30 } }),
    lintGutter(),
    lineNumbers(),
    closeBrackets(),
    bracketMatching(),
    indentOnInput(),
    codeSyntaxHighlighter(), // This comes from the main editor component
    plainLinkHighlighter,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        // Tell the main component that the contents have changed
        cleanFlag.value = false
        emit('update:modelValue', cmInstance.state.doc.toString())
      }
    })
  ]

  switch (mode) {
    case 'yaml':
      return [
        ...extensions,
        StreamLanguage.define(yaml),
        yamlLint
      ]
    case 'css':
      return [
        ...extensions,
        cssLanguage
      ]
    case 'markdown-snippets':
      return [
        ...extensions,
        snippetSyntaxExtension,
        markdownParser(), // Comes from the main editor
        markdownSyntaxHighlighter() // Comes from the main editor
      ]
  }
}

function setContents (contents: string, mode: 'css'|'yaml'|'markdown-snippets'): void {
  const state = EditorState.create({
    doc: contents,
    extensions: getExtensions(mode)
  })

  cmInstance.setState(state)
  // Immediately show the statusbar
  cmInstance.dispatch({ effects: showStatusbarEffect.of(true) })
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
    overflow: auto;
    height: 100%;
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
    }
  }
}
</style>
