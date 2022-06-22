<template>
  <div v-bind:class="{ 'inline': inline, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <select
      v-bind:id="fieldID"
      ref="input"
      v-bind:name="name"
      v-on:input="$emit('update:modelValue', selectInput.value)"
    >
      <option
        v-for="(value, key) in options"
        v-bind:key="key"
        v-bind:value="key"
        v-bind:selected="key === modelValue"
      >
        {{ value }}
      </option>
    </select>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Select
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays a generic dropdown.
 *
 * END HEADER
 */

import { defineComponent } from 'vue'

export default defineComponent({
  name: 'SelectControl',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    inline: {
      type: Boolean,
      default: false
    },
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    options: {
      type: Object as () => { [key: string]: string },
      default: function () { return {} }
    }
  },
  emits: ['update:modelValue'],
  computed: {
    fieldID: function (): string {
      return 'form-select-' + this.name
    },
    selectInput: function (): HTMLSelectElement {
      return this.$refs.input as HTMLSelectElement
    }
  }
})
</script>

<style lang="less">
</style>
