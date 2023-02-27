<template>
  <span
    v-bind:aria-label="`${Math.round(ratio * 100)}%`"
    v-bind:title="`${Math.round(ratio * 100)}%`"
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
        v-bind:stroke="color"
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
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'RingProgress',
  props: {
    ratio: {
      type: Number,
      required: true
    },
    color: {
      type: String,
      default: '#ff3388'
    },
    circleSize: {
      type: Number,
      default: 20
    },
    lineWidth: {
      type: Number,
      default: 2
    }
  },
  computed: {
    circleCircumference: function () {
      return this.circleRadius * 2 * Math.PI
    },
    circleRadius: function () {
      return (this.circleSize / 2) - (this.lineWidth * 2)
    },
    circleOffset: function () {
      return this.circleCircumference - this.ratio * this.circleCircumference
    }
  }
})
</script>

<style lang="less">
</style>
