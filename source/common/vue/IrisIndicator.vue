<template>
  <button v-bind:id="`toolbar-${props.id}`" class="iris-indicator">
    <canvas ref="indicatorCanvas"></canvas>
  </button>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import { IrisIndicator, type BuiltInColor, type Vec4 } from './iris-indicator-utils/iris-indicator'

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
  segmentCounts: Vec4
  // Allow arbitrary properties that we ignore
  [key: string]: unknown
}

const indicatorCanvas = ref<HTMLCanvasElement|null>(null)
let indicator: IrisIndicator|undefined

// All settings optional, EXCEPT the segment counts.
const props = defineProps<{
  /**
   * The control ID
   */
  id: string
  fpsLimit?: number
  enableFpsLimit?: boolean,
  segmentColors?: Vec4<BuiltInColor>
  segmentCounts: Vec4
  segmentAdjustmentStepDuration?: number
  rotationSpeed?: number
  raySpeed?: number
  bloomEnabled?: boolean
  bloomIntensity?: 1|2|4|8
  enableMSAA?: boolean
  renderingResolution?: number
}>()

watch(toRef(props, 'segmentCounts'), () => {
  if (indicator !== undefined) {
    indicator.setSegmentCounts(props.segmentCounts)
  }
})

onMounted(() => {
  if (indicatorCanvas.value === null) {
    console.log('Canvas null')
    return
  }

  indicator = setupIrisIndicator(indicatorCanvas.value)
})

onBeforeUnmount(() => {
  if (indicator !== undefined) {
    indicator.pauseRendering()
  }
})

// We derive the rendering resolution from the device pixel ratio (which often
// is either 1 or 2). To make it a bit simpler to see, we only allow powers of
// two.
function normalizedDPR (): 1|2|4|8|16 {
  let dpr = Math.ceil(window.devicePixelRatio)
  if ([ 1, 2, 4, 8, 16 ].includes(dpr)) {
    return dpr as 1|2|4|8|16
  }

  if (dpr > 16) {
    return 16
  } else if (dpr > 8) {
    return 8
  } else if (dpr > 4) {
    return 4
  } else if (dpr > 2) {
    return 2
  } else {
    return 1
  }
}

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
  indicator.setBloomEnabled(props.bloomEnabled ?? true)
  indicator.setBloomIntensity(props.bloomIntensity ?? 2)
  indicator.setFpsLimitEnabled(props.enableFpsLimit ?? true)
  indicator.setMSAAEnabled(props.enableMSAA ?? true)
  indicator.setFpsLimit(props.fpsLimit ?? 30)
  indicator.setRayMovementSpeed(props.raySpeed ?? 5)
  indicator.setTextureSizeModifier(props.renderingResolution ?? normalizedDPR())
  indicator.setRotationSpeed(props.rotationSpeed ?? 240)
  indicator.setColors(props.segmentColors ?? DEFAULT_COLORS)
  indicator.setSegmentCounts(props.segmentCounts)
  indicator.setSegmentAdjustmentStepDuration(props.segmentAdjustmentStepDuration ?? 200)

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
