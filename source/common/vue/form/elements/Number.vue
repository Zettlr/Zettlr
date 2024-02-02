<template>
  <div v-bind:class="{ 'inline': inline, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div v-if="reset" class="input-button-group">
      <input
        v-bind:id="fieldID"
        ref="input"
        v-bind:min="min"
        v-bind:max="max"
        v-bind:value="modelValue"
        v-bind:class="{ 'inline': inline }"
        v-bind:disabled="disabled"
        type="number"
        v-on:input="$emit('update:modelValue', sanitize(($event.target as HTMLInputElement).value))"
        v-on:keyup.enter="$emit('confirm', sanitize(($event.target as HTMLInputElement).value))"
        v-on:keyup.esc="$emit('escape', sanitize(($event.target as HTMLInputElement).value))"
        v-on:blur="$emit('blur', sanitize(($event.target as HTMLInputElement).value))"
      >
      <button
        type="button"
        v-bind:title="resetLabel"
        v-on:click="resetValue"
      >
        <cds-icon shape="refresh"></cds-icon>
      </button>
    </div>
    <!-- Else: Normal input w/o reset button -->
    <input
      v-else
      v-bind:id="fieldID"
      ref="input"
      v-bind:min="min"
      v-bind:max="max"
      v-bind:value="modelValue"
      v-bind:class="{ 'inline': inline }"
      v-bind:disabled="disabled"
      type="number"
      v-on:input="$emit('update:modelValue', sanitize(($event.target as HTMLInputElement).value))"
      v-on:keyup.enter="$emit('confirm', sanitize(($event.target as HTMLInputElement).value))"
      v-on:keyup.esc="$emit('escape', sanitize(($event.target as HTMLInputElement).value))"
      v-on:blur="$emit('blur', sanitize(($event.target as HTMLInputElement).value))"
    >
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Number
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component represents a generic number input
 *
 * END HEADER
 */
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FieldNumber',
  props: {
    modelValue: {
      type: Number,
      default: 0
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 10 ** 12
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
      type: Number,
      default: 0
    },
    inline: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: [ 'update:modelValue', 'confirm', 'escape', 'blur' ],
  computed: {
    fieldID: function () {
      return 'field-input-' + this.name
    },
    resetLabel: function () {
      return trans('Reset')
    },
    inputRef (): HTMLInputElement {
      return this.$refs.input as HTMLInputElement
    }
  },
  methods: {
    resetValue: function () {
      this.inputRef.value = String(this.reset)
      this.$emit('update:modelValue', this.reset)
    },
    sanitize: function (value: string): number {
      const numberVal = parseInt(value, 10)
      // If the user completely empties the field, make sure a number is being returned
      if (value === '') {
        return this.min
      } else if (numberVal < this.min) {
        return this.min
      } else if (numberVal > this.max) {
        return this.max
      } else {
        return numberVal
      }
    }
  }
})
</script>

<style lang="less">
body.darwin {
  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
}
</style>
