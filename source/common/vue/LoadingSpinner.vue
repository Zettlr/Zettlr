<template>
  <svg
    class="loading-spinner"
    v-bind:view-box="`0 0 ${SVG_SIZE} ${SVG_SIZE}`"
    v-bind:width="SVG_SIZE"
    v-bind:height="SVG_SIZE"
  >
    <g v-for="tick, i in ticks" v-bind:key="i">
      <path
        v-bind:d="tick"
        v-bind:stroke-width="String(LINE_WIDTH)"
        stroke="transparent"
      >
        <animate
          attributeName="stroke"
          v-bind:begin="`${i*ANIMATION_FPS}s`"
          v-bind:dur="`${duration}s`"
          v-bind:from="SVG_COLOR"
          to="transparent"
          repeatCount="indefinite"
        />
      </path>
    </g>
  </svg>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LoadingSpinner
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A simple SVG-based loading spinner to indicate something is
 *                  loading.
 *
 * END HEADER
 */
import { computed } from 'vue'

const props = defineProps<{
  /**
   * The size (in pixels) of this spinner. Default: 20.
   */
  spinnerSize?: number
  /**
   * The primary spinner CSS color. Default: 'currentColor'.
   */
  spinnerColor?: string
}>()

// The animation delay (="begin") and duration need to be matched and sped up to
// such an amount that the impression of a flowing motions occurs. That means we
// need at least 24 frames per second. Visually, a frame in this loading spinner
// will begin when the animation resets from transparent to the set color, which
// happens both at the start of the animation, and whenever one animation
// iteration ends. In other words, we can simply set the animation offset to the
// frames per second we want. NOTE that higher fps will make the animation
// appear more smoothly, but at the expense of speed. We shouldn't need to set
// anything higher than that, since the fade-effect should run on the GPU and
// have a higher refresh rate than this here.
const ANIMATION_FPS = 1/24

const SVG_SIZE = props.spinnerSize ?? 20
const SVG_COLOR = props.spinnerColor ?? 'currentColor'

const LINE_LENGTH = SVG_SIZE / 6
const LINE_WIDTH = SVG_SIZE / 12
const MAX_RAD = 2 * Math.PI
const OUTER_RADIUS = SVG_SIZE / 2 - LINE_LENGTH / 2

const ticks = computed(() => {
  // We want 12 ticks Each dial mark is a line pointing towards the origin of
  // the clock, and being line-width long. So we need one angle, and calculate
  // two points on two different circles
  const dialCount = 12

  const innerRadius = OUTER_RADIUS - LINE_LENGTH
  const rOuter = OUTER_RADIUS + LINE_LENGTH / 2
  const radPer = MAX_RAD / dialCount
  const translate = SVG_SIZE / 2

  const paths: string[] = []

  for (let i = 0; i < dialCount; i++) {
    const theta = i * radPer
    const [ x1, y1 ] = [ Math.cos(theta) * innerRadius + translate, -Math.sin(theta) * innerRadius + translate ]
    const [ x2, y2 ] = [ Math.cos(theta) * rOuter + translate, -Math.sin(theta) * rOuter + translate ]
    paths.push(`M ${x1} ${y1} L ${x2} ${y2}`)
  }

  // NOTE that the circle math outputs the ticks in a counter-clockwise fashion,
  // so `toReversed` ensures that the ensuing animation runs clockwise.
  return paths.toReversed()
})

const duration = computed(() => ticks.value.length * ANIMATION_FPS)
</script>

<style lang="less">
</style>
