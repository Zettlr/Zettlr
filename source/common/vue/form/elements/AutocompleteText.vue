<template>
  <div v-bind:class="{ inline: inline === true, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldId" v-html="label"></label>
    <!-- AutocompleteText is being implemented as a search for easy emptying of the field -->
    <input
      v-bind:id="fieldId"
      ref="inputField"
      v-model="thisValue"
      type="search"
      v-bind:class="{ inline: inline === true }"
      v-bind:list="`${fieldId}-list`"
      v-bind:placeholder="placeholder"
    >

    <datalist v-bind:id="`${fieldId}-list`">
      <option
        v-for="(option, idx) in props.autocompleteValues"
        v-bind:key="idx"
        v-bind:value="option"
      >
        {{ option }}
      </option>
    </datalist>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AutocompleteText
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a text input with autocomplete functionality.
 *
 * END HEADER
 */

import { ref, computed, watch, toRef } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder: string
  label: string
  name: string
  inline?: boolean
  autocompleteValues: string[]
}>()

const emit = defineEmits<(e: 'update:modelValue', val: string) => void>()

/**
 * Value updating logic
 */
const thisValue = ref<string>(props.modelValue)

watch(toRef(props, 'modelValue'), (newVal) => {
  thisValue.value = newVal
})

watch(thisValue, () => {
  emit('update:modelValue', thisValue.value)
})

// Utilities
const inputField = ref<HTMLInputElement|null>(null)
const fieldId = computed<string>(() => 'field-input' + props.name)

function focus (): void {
  inputField.value?.focus()
}

function blur (): void {
  inputField.value?.blur()
}

function select (): void {
  inputField.value?.select()
}

defineExpose({ focus, blur, select })
</script>

<style lang="less">
body div.form-control label {
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}
</style>
