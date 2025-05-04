<template>
  <input
    ref="inputElement"
    v-model="shortcut"
    type="text"
    v-bind:placeholder="placeholderLabel"
    v-on:keydown.prevent.stop="handleKeydown"
    v-on:focus="handleFocus"
  >
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ShortcutCaptureControl
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This small component allows to capture keyboard shortcuts in
 *                  the correct format for CodeMirror.
 *
 * END HEADER
 */
import { trans } from 'source/common/i18n-renderer'
import { ref } from 'vue'
import { keyName } from 'w3c-keyname'

const model = defineModel<string>()

const placeholderLabel = trans('Click to set your shortcut')

const shortcut = ref(model.value)
const inputElement = ref<HTMLInputElement|null>(null)

function handleFocus (event: FocusEvent) {
  shortcut.value = ''
}

function handleKeydown (event: KeyboardEvent): void {
  if (event.key === 'Unidentified') {
    return
  }

  const isNonTerminalKey = [ 'Alt', 'Shift', 'Meta', 'Control', 'Dead' ].includes(event.key)

  let key = isNonTerminalKey ? '' : keyName(event)

  // The order of these is determined by `normalizeKeyName` in
  // https://github.com/codemirror/view/blob/main/src/keymap.ts
  if (event.altKey) {
    key = 'Alt-' + key
  }

  if (event.ctrlKey) {
    key = 'Ctrl-' + key
  }

  if (event.metaKey && process.platform === 'darwin') {
    key = 'Cmd-' + key
  }

  if (event.shiftKey) {
    key = 'Shift-' + key
  }

  shortcut.value = key

  if (!isNonTerminalKey && !key.endsWith('-')) {
    model.value = key
    inputElement.value!.blur() // Unfocus the element to finish the assignment
  }
}
</script>

<style lang="css" scoped>
</style>
