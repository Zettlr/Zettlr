<template>
  <label v-bind:for="props.name">{{ props.label }}</label>
  <div
    v-bind:id="props.name"
    class="shortcut-input"
    tabindex="0"
    role="input"
    v-on:keydown.prevent.stop="handleKeydown"
    v-on:focus="isCurrentlyRecording = true"
    v-on:blur="isCurrentlyRecording = false"
  >
    <span v-if="isCurrentlyRecording && isExplodedShortcutEmpty">
      {{ recordingLabel }}
    </span>

    <template v-if="isCurrentlyRecording">
      <template v-if="explodedShortcut.altKey">
        <kbd>{{ altKeySymbol }}</kbd>
      </template>
      <template v-if="explodedShortcut.ctrlKey">
        <kbd>{{ ctrlKeySymbol }}</kbd>
      </template>
      <template v-if="explodedShortcut.modKey">
        <kbd>{{ modKeySymbol }}</kbd>
      </template>
      <template v-if="explodedShortcut.shiftKey">
        <kbd>⇧</kbd>
      </template>
      <template v-if="explodedShortcut.key">
        <kbd>{{ explodedShortcut.key }}</kbd>
      </template>
    </template>

    <span v-else>
      {{ placeholderLabel }}
    </span>
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
import { computed, ref, watch } from 'vue'
import { keyName, base } from 'w3c-keyname'

interface ExplodedShortcut {
  altKey: boolean
  shiftKey: boolean
  modKey: boolean,
  ctrlKey: boolean,
  key: string
}

const model = defineModel<string>({ required: true })

const isCurrentlyRecording = ref(false)

const props = defineProps<{
  name?: string
  label?: string
  defaultShortcut?: string
}>()

// Determine the mod key based on the platform
const modKeySymbol = process.platform === 'darwin' ? '⌘' : '⊞'
const altKeySymbol = process.platform === 'darwin' ? '⎇' : 'Alt'
const ctrlKeySymbol = process.platform === 'darwin' ? '⌃' : 'Ctrl'

const placeholderLabel = props.defaultShortcut !== undefined
  ? trans('Default: %s', props.defaultShortcut)
  : trans('Default: unassigned')
const recordingLabel = trans('Recording…')

// This is the "exploded" shortcut, so that we can display it
const explodedShortcut = ref(explodeShortcut(model.value ?? ''))
const isExplodedShortcutEmpty = computed(() => {
  const e = explodedShortcut.value
  return !e.altKey && !e.ctrlKey && !e.modKey && !e.shiftKey && !e.key
})

watch(model, () => {
  explodedShortcut.value = explodeShortcut(model.value ?? '')
})

function handleKeydown (event: KeyboardEvent): void {
  if (event.key === 'Unidentified') {
    return
  }

  const isNonTerminalKey = [ 'Alt', 'Shift', 'Meta', 'Control', 'Dead' ].includes(event.key)

  // On both macOS and Linux, the key might be different from what is registered
  // as the `event.key` due to their layer-2 key associations, which allow users
  // to type, e.g., µ, ∂, or … without the use of weird tricks.
  const isLayer3 = event.altKey && process.platform !== 'win32'

  const key = isNonTerminalKey
    ? ''
    : isLayer3 ? base[event.keyCode] : keyName(event)


  // The order of these is determined by `normalizeKeyName` in
  // https://github.com/codemirror/view/blob/main/src/keymap.ts
  explodedShortcut.value.altKey = event.altKey
  explodedShortcut.value.shiftKey = event.shiftKey
  explodedShortcut.value.modKey = event.metaKey
  explodedShortcut.value.ctrlKey = event.ctrlKey
  explodedShortcut.value.key = key

  // The first non-terminal key is our sign that the recording can be stopped.
  if (!isNonTerminalKey) {
    isCurrentlyRecording.value = false
    model.value = implodeShortcut(explodedShortcut.value)
    console.log('Finished shortcut:', implodeShortcut(explodedShortcut.value))
    if (event.target !== null && event.target instanceof HTMLElement) {
      event.target.blur()
    }
  }
}

function explodeShortcut (shortcut: string): ExplodedShortcut {
  const keys = shortcut.toLowerCase().split(/-/)
  const altKey = keys.includes('alt') || keys.includes('option')
  const shiftKey = keys.includes('shift')
  const modKey = keys.includes('mod') || process.platform === 'darwin' && keys.includes('cmd') || process.platform !== 'darwin' && keys.includes('mod')
  const ctrlKey = keys.includes('ctrl')
  return {
    altKey,
    shiftKey,
    modKey,
    ctrlKey,
    key: keys[keys.length - 1]
  }
}

function implodeShortcut (shortcut: ExplodedShortcut): string {
  let returnVal = shortcut.key

  if (shortcut.altKey) {
    returnVal = `Alt-${returnVal}`
  }
  if (shortcut.shiftKey) {
    returnVal = `Shift-${returnVal}`
  }
  if (shortcut.modKey) {
    returnVal = `Mod-${returnVal}`
  }
  if (shortcut.ctrlKey) {
    returnVal = `Ctrl-${returnVal}`
  }

  return returnVal
}
</script>

<style lang="css" scoped>
.shortcut-input {
  /* Broadly mimics the inputs */
  font-family: system-ui, sans-serif;
  color: rgb(180, 180, 180);
  font-size: 13px;
  height: 26px; /* Fixed calculation of the paddings and font size */
  border: 1px solid rgb(180, 180, 180);
  border-radius: 6px;
  padding: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  cursor: text;

  &:focus {
    outline: 2px solid var(--system-accent-color);
  }

  kbd {
    font-family: inherit;
    text-transform: uppercase;
    font-size: 10px;
    border: 1px solid rgb(180, 180, 180);
    border-radius: 4px;
    border-top-width: 2px;
    border-left-width: 2px;
    padding: 2px 4px;
  }
}
</style>
