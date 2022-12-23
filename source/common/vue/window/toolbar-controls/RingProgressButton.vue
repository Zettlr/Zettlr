<template>
  <button
    v-bind:id="`toolbar-${control.id}`"
    role="button"
    v-on:click="$emit('click')"
  >
    <RingProgress
      v-bind:ratio="progressPercent / 100"
      v-bind:color="trackColour"
    ></RingProgress>
    <span v-html="control.label"></span>
  </button>
</template>

<script lang="ts">
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
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'RingProgressControl',
  components: { RingProgress },
  props: {
    control: {
      type: Object,
      default: function () { return {} }
    },
    progressPercent: {
      type: Number,
      default: 0
    }
  },
  emits: ['click'],
  computed: {
    trackColour: function () {
      if (this.control.colour !== undefined) {
        return this.control.colour
      } else {
        return '#ff3388'
      }
    }
  }
})
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
