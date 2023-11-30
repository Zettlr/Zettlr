<template>
  <div class="form-control">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <input
      v-bind:id="fieldID"
      ref="input"
      v-bind:value="modelValue"
      v-bind:class="{ 'inline': inline }"
      type="time"
      v-on:input="validateInput(($event.target as HTMLInputElement).value)"
    >
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Time
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Enables users to input a time
 *
 * END HEADER
 */

import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FieldText',
  props: {
    modelValue: {
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
    inline: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  computed: {
    fieldID: function () {
      return 'field-input-' + this.name
    },
    inputRef (): HTMLInputElement {
      return this.$refs.input as HTMLInputElement
    }
  },
  methods: {
    validateInput: function (value: string) {
      // Make sure it's a time
      if (!/^\d{2}:\d{2}$/.test(value)) {
        this.inputRef.classList.add('error')
      } else {
        // All good, emit!
        this.$emit('update:modelValue', value)
      }
    }
  }
})
</script>

<style lang="less">
input[type="time"] {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

body.darwin {
  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
}
</style>
