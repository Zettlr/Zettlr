<template>
  <div v-bind:class="{ 'inline': inline, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div v-if="reset" class="input-button-group">
      <input
        v-bind:id="fieldID"
        ref="input"
        v-bind:value="modelValue"
        v-bind:class="{ 'inline': inline }"
        v-bind:placeholder="placeholder"
        type="color"
        v-on:input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
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
      v-bind:value="modelValue"
      v-bind:class="{ 'inline': inline }"
      v-bind:placeholder="placeholder"
      type="color"
      v-on:input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Color
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays a generic color picker
 *
 * END HEADER
 */
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FieldColor',
  props: {
    modelValue: {
      type: String,
      default: ''
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
      type: String,
      default: ''
    },
    inline: {
      type: Boolean,
      default: false
    }
  },
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
      this.inputRef.value = this.reset
      this.$emit('update:modelValue', this.reset)
    }
  }
})
</script>

<style lang="less">
</style>
