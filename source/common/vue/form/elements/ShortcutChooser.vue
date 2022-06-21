<template>
  <div v-bind:class="{ 'inline': inline, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div v-if="reset !== false" class="input-button-group">
      <input
        v-bind:id="fieldID"
        ref="input"
        type="text"
        v-bind:value="modelValue"
        v-bind:class="{ 'inline': inline }"
        v-bind:placeholder="placeholder"
        v-bind:disabled="disabled"
        v-on:keypress.prevent.stop="onKeydown"
      >
      <button
        type="button"
        v-bind:title="resetLabel"
        v-on:click="resetValue"
      >
        <clr-icon shape="refresh"></clr-icon>
      </button>
    </div>
    <!-- Else: Normal input w/o reset button -->
    <input
      v-else
      v-bind:id="fieldID"
      ref="input"
      type="text"
      v-bind:value="modelValue"
      v-bind:class="{ 'inline': inline }"
      v-bind:placeholder="placeholder"
      v-bind:disabled="disabled"
      v-on:keydown.prevent.stop="onKeydown"
    >
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Text
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is a special text input that can be used to record
 *                  keyboard shortcuts. It's one of the necessary prerequisites
 *                  to allow users to customize their keyboard shortcuts.
 *                  NOTE: Currently unused since we first have to figure out how
 *                  Electron's menuItem Accelerator assignment works. However
 *                  this input already works quite nicely.
 *
 * END HEADER
 */
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FieldText',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    reset: {
      type: [ String, Boolean ],
      default: false
    },
    inline: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  computed: {
    fieldID: function (): string {
      return 'field-input-' + this.name
    },
    resetLabel: function (): string {
      return trans('gui.reset')
    },
    element: function (): HTMLInputElement {
      return this.$refs.input as HTMLInputElement
    }
  },
  methods: {
    resetValue: function () {
      if (this.reset === false || typeof this.reset !== 'string') {
        return
      }

      this.element.value = this.reset
      this.$emit('update:modelValue', this.reset)
    },
    focus: function () {
      this.element.focus()
    },
    onKeydown: function (event: KeyboardEvent) {
      // We are closely following Electron's accelerators:
      // https://www.electronjs.org/docs/latest/api/accelerator
      // Also kudos go to https://keycode.info/
      // NOTE: Currently this does not yield usable accelerators, since on
      // Windows and Linux, Electron performs some weird magic under the hood
      // and I can't for the love of God figure out how the mappings work.

      const MODS = [
        'Meta',
        'Alt',
        'Shift',
        'Control'
      ]

      if (MODS.includes(event.key)) {
        return // Only trigger when a non-modifier key is pressed
      }

      const macOS = process.platform === 'darwin'
      const win32 = process.platform === 'win32'

      // macOS only modifiers
      const cmd = (macOS) ? event.metaKey : false
      const option = (macOS) ? event.key === 'Alt' : false

      // Non-macOS only modifiers
      const meta = (!macOS) ? event.metaKey : false

      // General modifiers
      const ctrl = event.ctrlKey
      const alt = event.altKey
      const altGr = event.key === 'Alt' && event.code === 'AltRight'
      const shift = event.shiftKey

      // Special keys
      const plus = event.key === '+'
      const space = event.key === ' '
      const tab = event.key === 'Tab'
      const del = event.key === 'Backspace'

      // If this is true, we should't add the event.key
      const hasSpecial = plus || space || tab || del || /* Mods */ meta || alt || altGr

      // Now build the shortcut
      let shortcut = []
      if (cmd) {
        shortcut.push('Cmd')
      }
      if (ctrl) {
        shortcut.push('Ctrl')
      }
      if (alt && !option) {
        shortcut.push('Alt')
      } else if (!alt && option) {
        shortcut.push('Option')
      }
      if (altGr) {
        shortcut.push('AltGr')
      }
      if (shift) {
        shortcut.push('Shift')
      }
      if (meta) {
        shortcut.push('Meta')
      }
      if (plus) {
        shortcut.push('Plus')
      }
      if (space) {
        shortcut.push('Space')
      }
      if (tab) {
        shortcut.push('Tab')
      }
      if (del) {
        shortcut.push('Delete')
      }

      // On macOS and Linux, if you use Alt as a modifier
      const isRegularKey = /^(?:Key[A-Z])|(?:Digit[0-9])$/.test(event.code)

      if (isRegularKey && !win32 && alt) {
        // The user has pressed a regular key on macOS or Linux, and has
        // additionally pressed the Alt-key. This means that the OS has
        // populated event.key with the third-layer-value. I.e. pressing
        // Cmd+Alt+F would yield Ƒ, but we instead should record a regular "F"
        // here.
        shortcut.push(event.code[event.code.length - 1])
      } else if (!hasSpecial) {
        // Last but not least, add the actual pressed key
        shortcut.push(event.key.toUpperCase())
      }

      const rendered = shortcut.join('+')
      this.element.value = rendered
    }
  }
})
</script>

<style lang="less">
//
</style>
