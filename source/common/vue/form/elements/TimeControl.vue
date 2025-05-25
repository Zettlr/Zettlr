<template>
  <div class="form-control">
    <label
      v-if="label"
      v-bind:for="fieldID"
      v-bind:class="{ disabled: disabled === true }"
      v-html="label"
    ></label>
    <input
      v-bind:id="fieldID"
      ref="input"
      v-bind:value="modelValue"
      v-bind:disabled="disabled === true"
      v-bind:class="{ inline: inline === true }"
      type="time"
      v-on:input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>

<script setup lang="ts">
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

import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  label?: string
  name?: string
  inline?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<(e: 'update:modelValue', value: string) => void>()

const fieldID = computed<string>(() => 'field-input-' + (props.name ?? ''))
</script>

<style lang="less">
input[type="time"] {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

body.darwin {
  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

    &.disabled {
      color: rgb(190, 190, 190);
    }
  }
}
</style>
