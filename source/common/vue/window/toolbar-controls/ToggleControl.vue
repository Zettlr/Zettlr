<template>
  <div class="toolbar-group">
    <button
      v-bind:id="`toolbar-${control.id}`"
      role="button"
      v-bind:aria-pressed="isActive"
      v-bind:class="{
        toggle: true,
        active: isActive
      }"
      v-bind:title="titleWithFallback"
      v-on:click="toggle"
    >
      <cds-icon v-if="control.icon" v-bind:shape="control.icon"></cds-icon>
      <span v-if="showLabel === true" class="toolbar-label" v-html="labelWithFallback"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Toggle
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A button that supports an "on" state.
 *
 * END HEADER
 */

import { watch, toRef, ref, computed } from 'vue'

export interface ToolbarToggleControl {
  type: 'toggle'
  id?: string
  icon?: string
  title?: string
  label?: string
  initialState: boolean
  // Allow arbitrary properties that we ignore
  [key: string]: any
}

const props = defineProps<{ control: ToolbarToggleControl, showLabel?: boolean }>()

const emit = defineEmits<(e: 'toggle', isActive: boolean) => void>()

const titleWithFallback = computed<string>(() => {
  return props.control.title ?? props.control.label ?? ''
})

const labelWithFallback = computed<string>(() => {
  return props.control.label ?? props.control.title ?? ''
})

const isActive = ref<boolean>(props.control.initialState)

watch(toRef(props, 'control'), () => {
  isActive.value = props.control.initialState
})

function toggle (): void {
  isActive.value = !isActive.value
  emit('toggle', isActive.value)
}
</script>

<style lang="less">
body.darwin div#toolbar {
  button.toggle {
    &.active {
      background-color: rgb(200, 200, 200);
    }
  }
}

body.darwin.dark div#toolbar {
  button.toggle.active {
    background-color: rgb(40, 40, 40);
  }
}
</style>
