<template>
  <svg
    v-bind:aria-label="`${Math.round(ratio * 100)}%`"
    v-bind:title="`${Math.round(ratio * 100)}%`"
    class="progress-ring"
    v-bind:style="{
      width: circleSize ?? 20,
      height: circleSize ?? 20
    }"
    v-bind:view-box="`0 0 ${circleSize ?? 20} ${circleSize ?? 20}`"
  >
    <!-- Always-on circle -->
    <circle
      stroke="#aaaaaa"
      fill="transparent"
      v-bind:stroke-width="lineWidth ?? 2"
      v-bind:r="circleRadius"
      v-bind:cx="circleSize ?? 20 / 2"
      v-bind:cy="circleSize ?? 20 / 2"
    ></circle>
    <!-- Actual progress circle -->
    <circle
      v-bind:stroke="color ?? '#ff3388'"
      fill="transparent"
      v-bind:style="{
        'stroke-dasharray': `${circleCircumference} ${circleCircumference}`,
        'stroke-dashoffset': circleOffset,
        'transition': 'stroke-dashoffset 0.35s',
        'transform': 'rotate(-90deg)',
        'transform-origin': '50% 50%'
      }"
      v-bind:stroke-width="lineWidth ?? 2"
      v-bind:r="circleRadius"
      v-bind:cx="circleSize ?? 20 / 2"
      v-bind:cy="circleSize ?? 20 / 2"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  ratio: number
  color?: string
  circleSize?: number
  lineWidth?: number
}>()

const circleRadius = computed<number>(() => {
  return (props.circleSize ?? 20 / 2) - (props.lineWidth ?? 2 * 2)
})

const circleCircumference = computed<number>(() => {
  return circleRadius.value * 2 * Math.PI
})

const circleOffset = computed<number>(() => {
  return circleCircumference.value - props.ratio * circleCircumference.value
})
</script>

<style lang="css" scoped>
  svg.progress-ring {
    margin: 0;
  }
</style>
