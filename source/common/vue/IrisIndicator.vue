<template>
  <button
    v-if="hasWebGLIndicator"
    v-bind:id="`toolbar-${props.id}`"
    class="iris-indicator"
    v-on:click="emit('click')"
  >
    <canvas ref="indicatorCanvas"></canvas>
  </button>
  <ButtonControl
    v-else
    v-bind:control="fallbackButtonItem"
    v-bind:show-label="false"
    v-bind:button-text="''"
    v-on:click="emit('click')"
  ></ButtonControl>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IrisIndicator, type BuiltInColor, type Vec4 } from './iris-indicator-utils/iris-indicator'
import ButtonControl, { type ToolbarButtonControl } from './window/toolbar-controls/ButtonControl.vue'
import { trans } from '../i18n-renderer'

// Should correspond to the indices of the semantic task meanings
const DEFAULT_COLORS: Vec4<BuiltInColor> = [ 'red', 'green', 'blue', 'purple' ]

export interface IrisIndicatorControl {
  type: 'iris-indicator'
  id: string
  /**
   * Current segment counts. By default, the ordering should be (so that tasks
   * correspond to colors):
   *
   * 1. `red`
   * 2. `green`
   * 3. `blue`
   * 4. `purple`
   */
  tasksInProgress: number
  tasksFailed: number
  tasksSuccess: number
  tasksAborted: number
  // Allow arbitrary properties that we ignore
  [key: string]: unknown
}

const emit = defineEmits<{ (e: 'click'): void }>()

const indicatorCanvas = ref<HTMLCanvasElement|null>(null)
let indicator: IrisIndicator|undefined

const hasWebGLIndicator = ref(true) // Necessary to make the canvas render initially

// Fallback button Item that will be shown if we have no indicator
const fallbackButtonItem: ToolbarButtonControl = {
  type: 'button',
  title: trans('Show tasks'),
  icon: 'tasks',
  badge: true
}

const segmentCounts = computed<Vec4>(() => ([
  props.tasksFailed, props.tasksSuccess, props.tasksInProgress, props.tasksAborted
]))

// All settings optional, EXCEPT the segment counts.
const props = defineProps<{
  /**
   * The control ID
   */
  id: string
  tasksInProgress: number
  tasksFailed: number
  tasksSuccess: number
  tasksAborted: number
}>()

watch(segmentCounts, () => {
  if (indicator !== undefined) {
    indicator.setSegmentCounts(segmentCounts.value)
  }
})

onMounted(() => {
  if (indicatorCanvas.value === null) {
    return
  }

  try {
    indicator = setupIrisIndicator(indicatorCanvas.value)
  } catch (err: unknown) {
    console.error('Could not instantiate WebGL indicator. Falling back to regular.')
    hasWebGLIndicator.value = false
  }
})

onBeforeUnmount(() => {
  if (indicator !== undefined) {
    indicator.pauseRendering()
  }
})

/**
 * Creates a new iris indicator to render within the provided Canvas element.
 *
 * @param   {HTMLCanvasElement}  canvas  The target canvas element
 */
function setupIrisIndicator (canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true })

  if (gl === null) {
    throw new Error('Unable to initialize WebGL.')
  }

  const indicator = new IrisIndicator(gl)

  // Initialize state
  indicator.setBloomEnabled(false)
  indicator.setBloomIntensity(2)
  indicator.setMSAAEnabled(true)
  indicator.setFpsLimitEnabled(true)
  indicator.setFpsLimit(30)
  indicator.setRayMovementSpeed(5)
  indicator.setTextureSizeModifier(window.devicePixelRatio)
  indicator.setRotationSpeed(240)
  indicator.setColors(DEFAULT_COLORS)
  indicator.setSegmentCounts(segmentCounts.value)
  indicator.setSegmentAdjustmentStepDuration(200)

  // Start the rendering
  indicator.enterRenderingLoop()

  return indicator
}
</script>

<style lang="css" scoped>
button.iris-indicator canvas {
  --charcoal-black: rgb(77, 77, 102);
  display: block;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  background-color: var(--charcoal-black);
  box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, .5);
}
</style>
