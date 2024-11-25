<template>
  <div v-bind:class="{ inline: inline === true, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <select
      v-bind:id="fieldID"
      v-model="inputValue"
      v-bind:disabled="props.disabled"
      v-bind:name="name"
      v-bind:class="{ inline: inline === true }"
    >
      <option
        v-for="(valueLabel, key) in options"
        v-bind:key="key"
        v-bind:value="key"
        v-bind:selected="key === modelValue"
      >
        {{ valueLabel }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
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

import { computed, ref, watch, toRef } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  inline?: boolean
  label?: string
  name?: string
  options: Record<string, string>
}>()

const inputValue = ref<string>(props.modelValue)

const emit = defineEmits<(e: 'update:modelValue', val: string) => void>()

watch(toRef(props, 'modelValue'), () => {
  inputValue.value = props.modelValue
})

watch(inputValue, () => {
  emit('update:modelValue', inputValue.value)
})

const fieldID = computed<string>(() => 'form-select-' + (props.name ?? ''))
</script>

<style lang="less">
</style>
