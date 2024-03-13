<template>
  <div
    v-bind:class="{
      'spacer': true,
      'spacer-5x': props.control.size === '5x',
      'spacer-3x': props.control.size === '3x',
      'spacer-1x': props.control.size === '1x'
    }"
  ></div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Spacer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Does what it says on the can: Adds space to the toolbar.
 *
 * END HEADER
 */

export interface ToolbarSpacerControl {
  type: 'spacer'
  size: '5x'|'3x'|'1x'
  // Allow arbitrary properties that we ignore
  [key: string]: any
}

const props = defineProps<{ control: ToolbarSpacerControl }>()
</script>

<style lang="less">
body #toolbar .spacer {
  flex-grow: 1;
  &.spacer-5x { flex-grow: 5; }
  &.spacer-3x { flex-grow: 3; }
  &.spacer-1x { flex-grow: 1; }
}
</style>
