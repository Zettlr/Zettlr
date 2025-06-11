<template>
  <div
    v-bind:class="{ inline: props.inline, 'form-control': true, 'shortcut-line': true }"
  >
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div
      v-bind:class="{
        'input-text-button-group': true,
        'has-reset': reset !== undefined
      }"
      style="display: inline-grid"
    >
      <input
        ref="inputElement"
        v-model="shortcut"
        type="text"
        v-bind:placeholder="placeholderLabel"
        v-on:keydown.prevent.stop="handleKeydown"
        v-on:focus="handleFocus"
        v-on:blur="handleBlur"
      >
      <button
        v-if="reset !== undefined"
        type="button"
        class="input-reset-button"
        v-bind:title="resetLabel"
        v-on:click.prevent="typeof reset === 'boolean' ? model = '' : model = reset"
      >
        <cds-icon shape="times"></cds-icon>
      </button>
    </div>
    <p v-if="props.info !== undefined" class="info" v-html="props.info"></p>
  </div>
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
import { ref, computed, watch } from 'vue'
import { keyName } from 'w3c-keyname'

const props = defineProps<{
  disabled?: boolean
  placeholder?: string
  label?: string
  name?: string
  reset?: string|boolean
  inline?: boolean
  info?: string
}>()

const model = defineModel<string>()

watch(model, () => { shortcut.value = model.value ?? '' })

const placeholderLabel = trans('Click to set your shortcut')
const resetLabel = trans('Reset')

const shortcut = ref<string>(model.value ?? '')
const inputElement = ref<HTMLInputElement|null>(null)

const fieldID = computed<string>(() => 'field-input-' + (props.name ?? ''))

function handleFocus (event: FocusEvent) {
  shortcut.value = ''
}

function handleBlur (event: FocusEvent) {
  shortcut.value = model.value ?? ''
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
.shortcut-line {
  display: grid;
  align-items: center;
  grid-template-columns: 50% 50%;
}
</style>
