<template>
  <label v-bind:for="props.name">{{ props.label }}</label>
  <div class="shortcut-control-wrapper">
    <div
      v-bind:id="props.name"
      v-bind:class="{
        'shortcut-input': true,
        'is-set': modelValue !== ''
      }"
      tabindex="0"
      role="input"
      v-on:keydown.prevent.stop="handleKeydown"
      v-on:focus="startRecording"
      v-on:blur="stopRecording"
    >
      <span v-if="isCurrentlyRecording && isNewShortcutEmpty">
        {{ recordingLabel }}
      </span>
  
      <!-- We are currently recording -->
      <template v-if="isCurrentlyRecording">
        <ShortcutDisplay v-bind:shortcut="newShortcut"></ShortcutDisplay>
      </template>
  
      <!-- We are not recording, but the shortcut is present -->
      <template v-else-if="modelValue !== ''">
        <ShortcutDisplay v-bind:shortcut="explodeShortcut(modelValue)"></ShortcutDisplay>
      </template>
  
      <!-- We are not recording, and the shortcut is not set -->
      <template v-else>
        <span>{{ placeholderLabel }}</span>
        <!-- The placeholder will show something like "Default: " if there is a default shortcut -->
        <ShortcutDisplay
          v-if="props.defaultShortcut !== undefined" v-bind:shortcut="explodeShortcut(props.defaultShortcut)"
        ></ShortcutDisplay>
      </template>
    </div>

    <!-- Show the reset button -->
    <ButtonControl
      v-bind:label="resetLabel"
      v-on:click="resetShortcut"
    ></ButtonControl>
  </div>
  <ZtrAdmonition v-if="props.conflicts && props.conflicts.length > 0" v-bind:type="'warning'">
    {{ conflictsWarning }}
  </ZtrAdmonition>
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
import { computed, ref } from 'vue'
import { keyName, base } from 'w3c-keyname'
import ShortcutDisplay from '../../ShortcutDisplay.vue'
import ButtonControl from './ButtonControl.vue'
import ZtrAdmonition from '../../ZtrAdmonition.vue'

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
  conflicts?: string[]
  reset?: boolean|string
}>()

const placeholderLabel = computed(() => {
  const text = props.defaultShortcut === undefined ? trans('unassigned') : ''
  const message = trans('Default: %s', text)
  return message
})

const recordingLabel = trans('Recording…')
const resetLabel = trans('Reset')

const conflictsWarning = computed(() => {
  const conflicts = props.conflicts ?? []
  return trans('This shortcut conflicts with: %s', conflicts.join(', '))
})

// This is the "exploded" shortcut, so that we can display it
const newShortcut = ref<ExplodedShortcut>({
  altKey: false,
  shiftKey: false,
  modKey: false,
  ctrlKey: false,
  key: ''
})

const isNewShortcutEmpty = computed(() => {
  const e = newShortcut.value
  return !e.altKey && !e.ctrlKey && !e.modKey && !e.shiftKey && !e.key
})

function resetShortcut () {
  model.value = ''
}

function startRecording () {
  isCurrentlyRecording.value = true
  const e = newShortcut.value
  e.altKey = false
  e.ctrlKey = false
  e.modKey = false
  e.shiftKey = false
  e.key = ''
}

function stopRecording (event: KeyboardEvent|FocusEvent) {
  isCurrentlyRecording.value = false
  const e = newShortcut.value
  e.altKey = false
  e.ctrlKey = false
  e.modKey = false
  e.shiftKey = false
  e.key = ''

  if (event !== undefined && event.target !== null && event.target instanceof HTMLElement) {
    event.target.blur()
  }
}

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
  newShortcut.value.altKey = event.altKey
  newShortcut.value.shiftKey = event.shiftKey
  newShortcut.value.modKey = event.metaKey
  newShortcut.value.ctrlKey = event.ctrlKey
  newShortcut.value.key = key

  // If the user presses `Cmd+Shift+a`, the key will be A, but we want a.
  if (event.shiftKey && key !== key.toLowerCase()) {
    newShortcut.value.key = key.toLowerCase()
  }

  // The first non-terminal key is our sign that the recording can be stopped.
  if (!isNonTerminalKey) {
    isCurrentlyRecording.value = false
    model.value = implodeShortcut(newShortcut.value)
    console.log('Finished shortcut:', implodeShortcut(newShortcut.value))
    stopRecording(event)
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
.shortcut-control-wrapper {
  margin: 2px 0 8px 0;
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: space-between;

  .shortcut-input {
    flex-grow: 1;
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
  
    &.is-set {
      color: inherit;
    }
  
    &:focus {
      outline: 2px solid var(--system-accent-color);
    }
  }
}
</style>
