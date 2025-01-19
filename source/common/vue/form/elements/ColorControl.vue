<template>
  <div v-bind:class="{ inline: inline === true, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div v-if="reset !== undefined" class="input-button-group">
      <input
        v-bind:id="fieldID"
        v-model="value"
        v-bind:class="{ inline: inline === true }"
        v-bind:placeholder="placeholder ?? ''"
        type="color"
        v-on:change="emit('update:modelValue', value)"
      >
      <button
        type="button"
        v-bind:title="resetLabel"
        v-on:click="value = reset"
      >
        <cds-icon shape="refresh"></cds-icon>
      </button>
    </div>
    <!-- Else: Normal input w/o reset button -->
    <input
      v-else
      v-bind:id="fieldID"
      v-model="value"
      v-bind:class="{ inline: inline === true }"
      v-bind:placeholder="placeholder ?? ''"
      type="color"
      v-on:change="emit('update:modelValue', value)"
    >
  </div>
</template>

<script setup lang="ts">
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
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  label?: string
  name?: string
  reset?: string
  inline?: boolean
}>()

const emit = defineEmits<(e: 'update:modelValue', val: string) => void>()

const value = ref<string>(props.modelValue)

const fieldID = computed<string>(() => {
  return 'field-input-' + (props.name ?? '')
})

const resetLabel = trans('Reset')
</script>

<style lang="less">
</style>
