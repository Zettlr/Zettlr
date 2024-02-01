<template>
  <div
    v-bind:class="{
      'form-control': true,
      inline: inline === true
    }"
  >
    <button
      v-bind:id="fieldId"
      v-bind:name="name"
      v-bind:disabled="disabled === true"
      v-bind:class="{ primary: primary === true }"
    >
      <cds-icon v-if="icon !== undefined" v-bind:shape="icon" v-bind:direction="direction"></cds-icon>
      {{ label }}
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Button
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Represents a generic button
 *
 * END HEADER
 */

import { computed } from 'vue'

const props = defineProps<{
  label?: string
  icon?: string
  direction?: string
  name?: string
  disabled?: boolean
  inline?: boolean
  primary?: boolean
}>()

const fieldId = computed<string>(() => `form-button${props.name}`)
</script>

<style lang="less">
</style>
