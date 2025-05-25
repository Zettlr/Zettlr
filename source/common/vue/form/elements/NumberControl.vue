<template>
  <div v-bind:class="{ inline: inline === true, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div v-if="reset" class="input-button-group">
      <input
        v-bind:id="fieldID"
        v-model="value"
        v-bind:min="min"
        v-bind:max="max"
        v-bind:class="{ inline: inline === true }"
        v-bind:disabled="disabled === true"
        type="number"
        required
        v-on:update-modelValue="emit('update:modelValue', sanitizeValue(value))"
        v-on:input="emit('update:modelValue', sanitizeValue(value))"
        v-on:change="emit('update:modelValue', sanitizeValue(value))"
        v-on:keyup.enter="emit('confirm', sanitizeValue(value))"
        v-on:keyup.esc="emit('escape', sanitizeValue(value))"
        v-on:blur="emit('blur', sanitizeValue(value))"
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
      v-model="value"
      v-bind:min="min"
      v-bind:max="max"
      v-bind:class="{ inline: inline === true }"
      v-bind:disabled="disabled === true"
      type="number"
      required
      v-on:update-modelValue="emit('update:modelValue', sanitizeValue(value))"
      v-on:input="emit('update:modelValue', sanitizeValue(value))"
      v-on:change="emit('update:modelValue', sanitizeValue(value))"
      v-on:keyup.enter="emit('confirm', sanitizeValue(value))"
      v-on:keyup.esc="emit('escape', sanitizeValue(value))"
      v-on:blur="emit('blur', sanitizeValue(value))"
    >
  </div>
</template>

<script setup lang="ts">
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
import { computed, ref, toRef, watch } from 'vue'

const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
  label?: string
  name?: string
  reset?: number
  inline?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'confirm', value: number): void
  (e: 'escape', value: number): void
  (e: 'blur', value: number): void
}>()

const fieldID = computed<string>(() => 'field-input-' + (props.name ?? ''))

const value = ref<number|''>(props.modelValue)

const resetLabel = trans('Reset')

function resetValue (): void {
  if (props.reset === undefined) {
    return
  }
  value.value = props.reset
  emit('update:modelValue', props.reset ?? props.min ?? 0)
}

watch(value, (newValue) => {
  if (newValue === '') {
    value.value = props.reset ?? props.min ?? 0
  }
})

watch(toRef(props, 'modelValue'), () => {
  value.value = props.modelValue
})

function sanitizeValue (newValue: number|''): number {
  if (newValue === '') {
    return props.reset ?? props.min ?? 0
  } else if (props.min !== undefined && newValue < props.min) {
    return props.min
  } else if (props.max !== undefined && newValue > props.max) {
    return props.max
  } else {
    return newValue
  }
}
</script>

<style lang="less">
body.darwin {
  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
}
</style>
