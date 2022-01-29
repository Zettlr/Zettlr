<template>
  <button
    v-bind:id="`toolbar-${control.id}`"
    role="button"
    v-on:click="$emit('click')"
  >
    <svg
      class="progress-ring"
      v-bind:style="{
        width: circleSize,
        height: circleSize
      }"
    >
      <!-- Always-on circle -->
      <circle
        stroke="#aaaaaa"
        fill="transparent"
        v-bind:stroke-width="lineWidth"
        v-bind:r="circleRadius"
        v-bind:cx="circleSize / 2"
        v-bind:cy="circleSize / 2"
      ></circle>
      <!-- Actual progress circle -->
      <circle
        v-bind:stroke="trackColour"
        fill="transparent"
        v-bind:style="{
          'stroke-dasharray': `${circleCircumference} ${circleCircumference}`,
          'stroke-dashoffset': circleOffset,
          'transition': 'stroke-dashoffset 0.35s',
          'transform': 'rotate(-90deg)',
          'transform-origin': '50% 50%'
        }"
        v-bind:stroke-width="lineWidth"
        v-bind:r="circleRadius"
        v-bind:cx="circleSize / 2"
        v-bind:cy="circleSize / 2"
      />
    </svg>
    <span v-html="control.label"></span>
  </button>
</template>

<script>
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

export default {
  name: 'RingProgressControl',
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
    lineWidth: function () {
      return 2
    },
    circleSize: function () {
      return 20
    },
    circleCircumference: function () {
      return this.circleRadius * 2 * Math.PI
    },
    circleRadius: function () {
      return (this.circleSize / 2) - (this.lineWidth * 2)
    },
    circleOffset: function () {
      return this.circleCircumference - this.progressPercent / 100 * this.circleCircumference
    },
    trackColour: function () {
      if (this.control.colour !== undefined) {
        return this.control.colour
      } else {
        return '#ff3388'
      }
    }
  }
}
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
