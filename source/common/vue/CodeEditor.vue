<template>
  <div class="code-editor-wrapper">
    <div v-bind:id="wrapperId"></div>
  </div>
</template>

<script setup lang="ts">
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

import { drawSelection, dropCursor, EditorView, lineNumbers } from '@codemirror/view'
import { onMounted, ref, toRef, watch } from 'vue'
import { closeBrackets } from '@codemirror/autocomplete'
import { bracketMatching, codeFolding, foldGutter, indentOnInput } from '@codemirror/language'
import { codeSyntaxHighlighter, markdownSyntaxHighlighter } from '@common/modules/markdown-editor/theme/syntax'
import { yaml } from '@codemirror/lang-yaml'
import { EditorState, type Extension } from '@codemirror/state'
import { cssLanguage } from '@codemirror/lang-css'
import markdownParser from '@common/modules/markdown-editor/parser/markdown-parser'
import { yamlLint } from '@common/modules/markdown-editor/linters/yaml-lint'
import { lintGutter } from '@codemirror/lint'
import { showStatusbarEffect, statusbar } from '@common/modules/markdown-editor/statusbar'
import { search } from '@codemirror/search'
import { history } from '@codemirror/commands'
import { snippetSyntaxExtension } from '@common/modules/markdown-utils/snippets-syntax-extension'
import { plainLinkHighlighter } from '@common/modules/markdown-utils/plain-link-highlighter'
import { useConfigStore } from 'source/pinia'
import { darkMode, darkModeEffect } from '../modules/markdown-editor/theme/dark-mode'
import { highlightWhitespace, highlightWhitespaceEffect } from '../modules/markdown-editor/plugins/highlight-whitespace'
import { defaultKeymap } from '../modules/markdown-editor/keymaps/default'

const configStore = useConfigStore()

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
    defaultKeymap(),
    search({ top: true }),
    codeFolding(),
    foldGutter(),
    history(),
    highlightWhitespace(configStore.config.editor.showWhitespace),
    drawSelection({ drawRangeCursor: false, cursorBlinkRate: 1000 }),
    dropCursor(),
    statusbar,
    EditorState.allowMultipleSelections.of(true),
    // Ensure the cursor never completely sticks to the top or bottom of the editor
    EditorView.scrollMargins.of(_view => { return { top: 30, bottom: 30 } }),
    lintGutter(),
    lineNumbers(),
    closeBrackets(),
    bracketMatching(),
    indentOnInput(),
    codeSyntaxHighlighter(), // This comes from the main editor component
    darkMode({ darkMode: configStore.config.darkMode }),
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
        yaml(),
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
        markdownParser({
          // NOTE: This is not reactive to configuration changes while the code
          // editor is on, but I can't imagine too many people making use of the
          // linkFormat explicitly, or changing it that often (they shouldn't,
          // after all). Should we ever need to add more configs, I can still
          // react to changes in the parser config.
          zknLinkParserConfig: { format: configStore.config.zkn.linkFormat }
        }), // Comes from the main editor
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

const emit = defineEmits<(e: 'update:modelValue', newContents: string) => void>()

// Switch the darkMode variable in the editor based on the config
configStore.$subscribe((_mutation, state) => {
  cmInstance.dispatch({
    effects: [
      darkModeEffect.of({ darkMode: state.config.darkMode }),
      highlightWhitespaceEffect.of(state.config.editor.showWhitespace)
    ]
  })
})

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
    .cm-scroller { overflow: auto; }
    .cm-content { cursor: text; }
    height: 100%;

    // margin: 20px 0px;
    // background-color: white;
    // border: 1px solid rgb(173, 173, 173);
    color: @base00;
    .cm-separator         { color: @base00; }
    .cm-punctuation       { color: @base00; }

    .cm-content-span      { color: @base0; }
    .cm-brace             { color: @base0; }
    .cm-square-bracket    { color: @base0; }

    .cm-comment           { color: @base1; }
    .cm-line-comment      { color: @base1; }
    .cm-block-comment     { color: @base1; }
    .cm-unit              { color: @base1; }

    .cm-string            { color: @green; }
    .cm-string-2          { color: @green; }
    .cm-keyword           { color: @green; }
    .cm-operator-keyword  { color: @green; }
    .cm-atom              { color: @green; }

    .cm-property-name     { color: @blue; }
    .cm-tag               { color: @blue; }
    .cm-qualifier         { color: @blue; }
    .cm-builtin           { color: @blue; }

    .cm-number            { color: @violet; }
    .cm-class-name        { color: @violet; }
    .cm-label-name        { color: @violet; }

    .cm-code-mark         { color: @magenta; }
    .cm-property          { color: @magenta; }

    .cm-variable-2        { color: @yellow; }
    .cm-variable          { color: @yellow; }

    .cm-tag-name          { color: @cyan; }
    .cm-deref-operator    { color: @cyan; }

    .cm-attribute         { color: @orange; }

    .cm-type              { color: @red; }

    .cm-gutters {
      background-color: @base2;
      color: @base1;
    }
  }

  &.dark {
    .code-editor-wrapper {
      border-color: rgb(100, 100, 100);
    }

    .cm-editor {
      background-color: rgb(65, 65, 65);
      color: @base3;
      .cm-comment    { color: @base00; }
      .cm-line-comment { color: @base00; }
      .cm-block-comment { color: @base00; }
      .cm-gutters {
        background-color: @base03;
        color: @base00;
        border-color: rgb(100, 100, 100);
      }
    }
  }
}
</style>
