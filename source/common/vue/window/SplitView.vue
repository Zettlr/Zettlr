<template>
  <div ref="element" class="split-view">
    <div
      v-if="hasHiddenView !== 1"
      ref="view1"
      class="view"
      v-bind:style="{ width: `${view1Width}px` }"
    >
      <slot name="view1"></slot>
    </div>
    <div
      v-if="hasHiddenView === 0"
      class="horizontal-resizer"
      v-on:mousedown="beginViewResizing"
      v-on:dblclick="resetSize()"
    ></div> <!-- Enable resizing of the view -->
    <div
      v-if="hasHiddenView !== 2"
      ref="view2"
      v-bind:class="{
        view: true,
        'view-border': hasHiddenView === 0
      }"
      v-bind:style="{ width: `${view2Width}px` }"
    >
      <slot name="view2"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SplitView
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Implements split views (two horizontal panes with a movable
 *                  separator in the middle). Split views can also be hidden.
 *
 * END HEADER
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  split?: 'horizontal'|'vertical'
  // Never go below any of these sizes
  minimumSizePercent: [ number, number ]
  // What to preset the sizes with
  initialSizePercent: [ number, number ]
  // When the user double-clicks the resizer, go to this size
  resetSizePercent: [ number, number ]
}>()

const emit = defineEmits<(e: 'views-resized', sizes: [number, number]) => void>()

const availableSize = ref<number>(window.innerWidth)
const viewResizing = ref<boolean>(false)
const viewResizeX = ref<number>(0)
// Initial widths
const view1Width = ref<number>(availableSize.value * (props.initialSizePercent[0] / 100))
const view2Width = ref<number>(availableSize.value * (props.initialSizePercent[1] / 100))
// Minimum widths
const view1WidthMin = ref<number>(availableSize.value * (props.minimumSizePercent[0] / 100))
const view2WidthMin = ref<number>(availableSize.value * (props.minimumSizePercent[1] / 100))
// Properties necessary for hiding views programmatically
const originalViewWidth = ref<[number, number]>([ 0, 0 ])
const hasHiddenView = ref<0|1|2>(0) // Is 1 or 2 if one view is hidden
const observer = new ResizeObserver(recalculateSizes)

const element = ref<HTMLDivElement|null>(null)

function recalculateSizes (): void {
  if (element.value === null) {
    return
  }

  // Save the current ratios before applying the new widths
  const view1Percent = view1Width.value / availableSize.value
  const view2Percent = view2Width.value / availableSize.value
  availableSize.value = element.value.getBoundingClientRect().width

  if (hasHiddenView.value === 1) {
    // Give view 2 all of the available size
    view2Width.value = availableSize.value
  } else if (hasHiddenView.value === 2) {
    // Give view 1 all of the available size
    view1Width.value = availableSize.value
  } else { // Else: this.hasHiddenView === 0
    // Scale both proportionally
    view1Width.value = availableSize.value * view1Percent
    view2Width.value = availableSize.value * view2Percent
  }

  // Don't forget to also update the minimum widths
  view1WidthMin.value = availableSize.value * (props.minimumSizePercent[0] / 100)
  view2WidthMin.value = availableSize.value * (props.minimumSizePercent[1] / 100)

  // Notify parent
  const newWidth1Percent = view1Width.value / availableSize.value
  if (hasHiddenView.value === 0 && newWidth1Percent !== view1Percent) {
    const intWidth = Math.round(view1Percent * 100)
    emit('views-resized', [ intWidth, 100 - intWidth ])
  }
}

onMounted(() => {
  window.addEventListener('resize', recalculateSizes)
  recalculateSizes()
  if (element.value !== null) {
    observer.observe(element.value, { box: 'border-box' })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', recalculateSizes)
  if (element.value !== null) {
    observer.unobserve(element.value)
  }
})

function beginViewResizing (event: MouseEvent): void {
  viewResizing.value = true
  viewResizeX.value = event.clientX
  element.value?.addEventListener('mousemove', onViewResizing)
  element.value?.addEventListener('mouseup', endViewResizing)
}

function onViewResizing (event: MouseEvent): void {
  if (!viewResizing.value) {
    return
  }

  const oldView1Percent = view1Width.value / availableSize.value

  // x > 0 means: Direction -->
  // x < 0 means: Direction <--
  let offsetX = event.clientX - viewResizeX.value
  // Make sure the views don't get resized too much
  if (offsetX > 0 && view2Width.value > view2WidthMin.value) {
    // Increase view1 in size
    view1Width.value += offsetX
    view2Width.value = availableSize.value - view1Width.value
  } else if (offsetX < 0 && view1Width.value > view1WidthMin.value) {
    // Increase view2 in size
    view2Width.value -= offsetX
    view1Width.value = availableSize.value - view2Width.value
  }

  viewResizeX.value = event.clientX

  // Notify parent if applicable
  const view1Percent = view1Width.value / availableSize.value
  if (hasHiddenView.value === 0 && oldView1Percent !== view1Percent) {
    const intWidth = Math.round(view1Percent * 100)
    emit('views-resized', [ intWidth, 100 - intWidth ])
  }
}

function endViewResizing (_event: MouseEvent): void {
  viewResizing.value = false
  viewResizeX.value = 0
  element.value?.removeEventListener('mousemove', onViewResizing)
  element.value?.removeEventListener('mouseup', endViewResizing)
}

function hideView (viewNumber: 1|2): void {
  // Enables you to hide one of the views programmatically. First, we need
  // to un-hide any view if applicable. Then, we need to hide the view in
  // a second step.
  unhide()

  // Now no view is hidden at this point.
  hasHiddenView.value = viewNumber
  originalViewWidth.value = [
    view1Width.value / availableSize.value,
    view2Width.value / availableSize.value
  ]
  if (viewNumber === 1) {
    view2Width.value += view1Width.value
    view1Width.value = 0
  } else {
    view1Width.value += view2Width.value
    view2Width.value = 0
  }
}

function unhide (): void {
  if (hasHiddenView.value === 0) {
    return
  }
  // Un-hide
  view1Width.value = originalViewWidth.value[0] * availableSize.value
  view2Width.value = originalViewWidth.value[1] * availableSize.value
  hasHiddenView.value = 0
  // After we've unhidden the view, make sure to recalculate possibly
  // changed metrics in the meantime.
  recalculateSizes()
}

function resetSize (): void {
  view1Width.value = availableSize.value * (props.resetSizePercent[0] / 100)
  view2Width.value = availableSize.value * (props.resetSizePercent[1] / 100)
  emit('views-resized', [...props.resetSizePercent])
}

defineExpose({ hideView, unhide })
</script>

<style lang="less">
body div.split-view {
  display: flex;
  height: 100%;

  div.view {
    overflow: auto;
    &.view-border {
      border-left: 1px solid rgb(213, 213, 213);
      margin-left: -6px; // Account for resizer
    }

    &:not(.view-border) {
      margin-right: -5px; // Account for resizer
    }
  }

  div.horizontal-resizer {
    cursor: col-resize;
    width: 11px; // 1px width plus 5px margin to either side
    z-index: 1; // Make sure the resizers are always on top
    height: 100%;
  }
}

body.dark div.split-view {
  div.view.view-border {
    border-color: rgb(80, 80, 80);
  }
}
</style>
