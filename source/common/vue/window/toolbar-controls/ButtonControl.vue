<template>
  <div class="toolbar-group">
    <button
      v-bind:id="`toolbar-${control.id ?? ''}`"
      role="button"
      v-bind:title="titleWithFallback"
    >
      <cds-icon
        v-if="control.icon"
        v-bind:shape="control.icon"
        v-bind:direction="control.direction"
      ></cds-icon>
      <template v-if="buttonText !== undefined">
        {{ buttonText }}
      </template>
    </button>
    <span v-if="showLabel === true" class="toolbar-label" v-html="labelWithFallback"></span>
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
 * Description:     This implements a generic button; mainly used on the toolbar
 *                  but can also be displayed elsewhere.
 *
 * END HEADER
 */
import { computed } from 'vue'

export interface ToolbarButtonControl {
  type: 'button'
  id?: string
  title?: string
  label?: string
  icon: string
  direction?: 'up'|'down'|'left'|'right'
  // Allow arbitrary properties that we ignore
  [key: string]: any
}

const props = defineProps<{
  control: ToolbarButtonControl
  showLabel?: boolean
  buttonText?: string
}>()

const titleWithFallback = computed<string>(() => {
  return props.control.title ?? props.control.label ?? ''
})

const labelWithFallback = computed<string>(() => {
  return props.control.label ?? props.control.title ?? ''
})
</script>

<style lang="less">
.toolbar-group button {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}
</style>
