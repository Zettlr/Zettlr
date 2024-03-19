<template>
  <div class="toolbar-group">
    <button
      v-bind:id="`toolbar-${props.control.id ?? ''}`"
      role="button"
      v-on:click="emit('click')"
    >
      <RingProgress
        v-bind:ratio="props.control.progressPercent / 100"
        v-bind:color="props.control.trackColour"
      ></RingProgress>
      <span v-html="props.control.label"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RingProgressButton
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The combination of a progress bar with a button. This
 *                  component basically allows you to display a button with a
 *                  ring-shaped progress bar inside. NOTE that this component
 *                  has a lot of specific styling for the toolbar, so it's
 *                  probably not going to work elsewhere.
 *
 * END HEADER
 */

import RingProgress from './RingProgress.vue'

export interface RingProgressButtonControl {
  type: 'ring'
  id?: string
  progressPercent: number
  trackColour?: string
  label?: string
  // Allow arbitrary properties that we ignore
  [key: string]: any
}

const props = defineProps<{
  control: RingProgressButtonControl
}>()

const emit = defineEmits<(e: 'click') => void>()
</script>

<style lang="less">
body button svg.progress-ring {
  margin: 0;
  padding: 0;
}

body.linux button svg.progress-ring {
  margin: 1px; // Center the SVG on the middle of the button, see also Toolbar.vue
}
</style>
