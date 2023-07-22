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
        v-on:input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        v-on:keyup.enter="$emit('confirm', ($event.target as HTMLInputElement).value)"
        v-on:keyup.esc="$emit('escape', ($event.target as HTMLInputElement).value)"
        v-on:blur="$emit('blur', ($event.target as HTMLInputElement).value)"
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
      type="text"
      v-bind:value="modelValue"
      v-bind:class="{ 'inline': inline }"
      v-bind:placeholder="placeholder"
      v-bind:disabled="disabled"
      v-on:input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      v-on:keyup.enter="$emit('confirm', ($event.target as HTMLInputElement).value)"
      v-on:keyup.esc="$emit('escape', ($event.target as HTMLInputElement).value)"
      v-on:blur="$emit('blur', ($event.target as HTMLInputElement).value)"
    >
    <p v-if="info !== ''" class="info" v-html="info"></p>
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
 * Description:     A text input.
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
    },
    info: {
      type: String,
      default: ''
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
      this.inputRef.value = typeof this.reset === 'string' ? this.reset : ''
      this.$emit('update:modelValue', this.reset)
    },
    focus: function () {
      this.inputRef.focus()
    },
    select: function () {
      this.inputRef.select()
    }
  }
})
</script>

<style lang="less">
body div.form-control p.info {
  font-size: 70%;
  opacity: 0.8;
}
</style>
