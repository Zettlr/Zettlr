<template>
  <div class="vim-key-mapping-trainer">
    <table class="vim-mapping-table">
      <thead>
        <tr>
          <th>Vim Character</th>
          <th>Key Combination</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(mapping, vimChar) in modelValue" v-bind:key="vimChar">
          <td class="vim-char">
            <code>{{ mapping.vimChar }}</code>
          </td>
          <td class="key-combo">
            <div
              v-bind:class="{
                'key-combo-display': true,
                'capturing': capturingChar === vimChar,
                'empty': !mapping.code
              }"
              v-on:click="startCapture(vimChar)"
              v-bind:title="capturingChar === vimChar ? 'Press key combination...' : (mapping.code ? 'Click to change' : 'Click to set')"
            >
              <template v-if="capturingChar === vimChar">
                <span class="capturing-text">Press key combo...</span>
              </template>
              <template v-else-if="mapping.code">
                <span class="modifier-key" v-if="mapping.metaKey">⌘</span>
                <span class="modifier-key" v-if="mapping.ctrlKey">Ctrl</span>
                <span class="modifier-key" v-if="mapping.altKey">Alt</span>
                <span class="modifier-key" v-if="mapping.shiftKey">Shift</span>
                <span class="physical-key">{{ formatKeyCode(mapping.code) }}</span>
              </template>
              <template v-else>
                <span class="empty-text">Not mapped</span>
              </template>
            </div>
          </td>
          <td class="actions">
            <button
              v-if="mapping.code"
              v-bind:class="'clear-btn'"
              v-on:click="clearMapping(vimChar)"
              title="Clear mapping"
            >
              ×
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        VimKeyMappingTrainer
 * CVM-Role:        View
 * Maintainer:      Orwa Diraneyya
 * License:         GNU GPL v3
 *
 * Description:     Interactive key training UI for Vim fixed keyboard layout.
 *                  Allows users to click and capture key combinations for Vim
 *                  commands that require modifier keys on their keyboard layout.
 *
 * END HEADER
 */

import { ref } from 'vue'
import type { KeyMapping } from '@common/modules/markdown-editor/util/configuration'

const props = defineProps<{
  modelValue: Record<string, KeyMapping>
  name: string
}>()

const emit = defineEmits<(e: 'update:modelValue', newValue: Record<string, KeyMapping>) => void>()

// Track which character is currently being captured
const capturingChar = ref<string | null>(null)

/**
 * Start capturing a key combination for a specific Vim character
 */
function startCapture (vimChar: string): void {
  capturingChar.value = vimChar

  // Add global keydown listener
  document.addEventListener('keydown', handleCaptureKeydown, { capture: true })
}

/**
 * Handle keydown event during capture
 */
function handleCaptureKeydown (event: KeyboardEvent): void {
  // Prevent default behavior
  event.preventDefault()
  event.stopPropagation()

  // Ignore if no character is being captured
  if (capturingChar.value === null) {
    return
  }

  // Ignore modifier keys by themselves
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
    return
  }

  // Ignore Escape (used to cancel capture)
  if (event.key === 'Escape') {
    cancelCapture()
    return
  }

  // Capture the key combination
  const newMapping: KeyMapping = {
    vimChar: capturingChar.value,
    code: event.code,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey
  }

  // Update the model
  const newMappings = { ...props.modelValue }
  newMappings[capturingChar.value] = newMapping

  // Emit the update
  emit('update:modelValue', newMappings)

  // Stop capturing
  cancelCapture()
}

/**
 * Cancel the current capture
 */
function cancelCapture (): void {
  capturingChar.value = null
  document.removeEventListener('keydown', handleCaptureKeydown, { capture: true })
}

/**
 * Clear a key mapping
 */
function clearMapping (vimChar: string): void {
  const newMappings = { ...props.modelValue }
  newMappings[vimChar] = {
    vimChar,
    code: '',
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false
  }
  emit('update:modelValue', newMappings)
}

/**
 * Format a physical key code for display
 * Converts codes like 'Digit8' to '8', 'BracketLeft' to '[', etc.
 */
function formatKeyCode (code: string): string {
  // Handle digit keys
  if (code.startsWith('Digit')) {
    return code.replace('Digit', '')
  }

  // Handle letter keys
  if (code.startsWith('Key')) {
    return code.replace('Key', '')
  }

  // Handle bracket keys
  if (code === 'BracketLeft') return '['
  if (code === 'BracketRight') return ']'

  // Handle other special keys
  const specialKeys: Record<string, string> = {
    Minus: '-',
    Equal: '=',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backquote: '`'
  }

  return specialKeys[code] ?? code
}
</script>

<style lang="less">
.vim-key-mapping-trainer {
  margin: 10px 0;

  .vim-mapping-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid rgba(128, 128, 128, 0.3);
    }

    thead {
      background-color: rgba(0, 0, 0, 0.05);
      font-weight: bold;

      th {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    tbody tr:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .vim-char {
      width: 120px;
      font-weight: bold;

      code {
        font-size: 16px;
        padding: 2px 6px;
        background-color: rgba(0, 0, 0, 0.08);
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      }
    }

    .key-combo {
      width: 100%;
    }

    .key-combo-display {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border: 1px solid rgba(128, 128, 128, 0.4);
      border-radius: 4px;
      cursor: pointer;
      min-width: 200px;
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(128, 128, 128, 0.6);
        background-color: rgba(0, 0, 0, 0.02);
      }

      &.capturing {
        border-color: #007aff;
        background-color: rgba(0, 122, 255, 0.1);
        animation: pulse 1.5s infinite;
      }

      &.empty {
        border-style: dashed;
        color: rgba(128, 128, 128, 0.7);
      }

      .capturing-text {
        color: #007aff;
        font-style: italic;
      }

      .empty-text {
        font-style: italic;
        color: rgba(128, 128, 128, 0.7);
      }

      .modifier-key, .physical-key {
        padding: 2px 6px;
        background-color: rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 11px;
      }

      .modifier-key {
        background-color: rgba(255, 149, 0, 0.15);
        border-color: rgba(255, 149, 0, 0.3);
        font-weight: 600;
      }

      .physical-key {
        background-color: rgba(0, 0, 0, 0.08);
        border-color: rgba(0, 0, 0, 0.3);
        font-weight: 500;
      }
    }

    .actions {
      width: 80px;
      text-align: center;
    }

    .clear-btn {
      background: none;
      border: 1px solid rgba(255, 59, 48, 0.5);
      color: rgb(255, 59, 48);
      border-radius: 3px;
      padding: 2px 8px;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      transition: all 0.2s ease;

      &:hover {
        background-color: rgb(255, 59, 48);
        color: white;
      }
    }
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(0, 122, 255, 0);
    }
  }
}
</style>
