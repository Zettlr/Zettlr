<template>
  <Teleport to="body">
    <div ref="popupArrow" class="popover-arrow"></div>
    <div ref="popupWrapper" class="popover">
      <slot></slot>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUpdated, ref, computed } from 'vue'

type Placement = 'above'|'below'|'left'|'right'

const props = defineProps<{
  target: HTMLElement
  placementPriorities?: Placement[]
}>()

const emit = defineEmits<(e: 'close') => void>()

const placementPriorities = computed<[Placement, Placement, Placement, Placement]>(() => {
  if (props.placementPriorities === undefined) {
    return [ 'below', 'right', 'above', 'left' ] as [Placement, Placement, Placement, Placement]
  }

  let placements = [...new Set(props.placementPriorities)]

  // Ensure it includes all elements once
  if (!placements.includes('below')) {
    placements.push('below')
  }
  if (!placements.includes('right')) {
    placements.push('right')
  }

  if (!placements.includes('above')) {
    placements.push('above')
  }

  if (!placements.includes('left')) {
    placements.push('left')
  }

  return placements as [Placement, Placement, Placement, Placement]
})

const popupWrapper = ref<HTMLDivElement|null>(null)
const popupArrow = ref<HTMLDivElement|null>(null)

const MAX_ARROW_SIZE = 20
const MIN_ARROW_SIZE = 5
const DOCUMENT_MARGIN = 10

onMounted(() => {
  document.addEventListener('mousedown', onClick)
  document.addEventListener('contextmenu', onClick)
  document.addEventListener('resize', onResize)

  place() // Initial placement
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClick)
  document.removeEventListener('contextmenu', onClick)
  document.removeEventListener('resize', onResize)
})

onUpdated(place)

function onClick (event: MouseEvent): void {
  const target = event.target as Node | null

  if (popupWrapper.value === null || target === null) {
    return
  }

  // Clicks on the popup itself are cool
  // and so are any clicks on elements within this.
  // Background for the following line:
  // https://github.com/Zettlr/Zettlr/issues/554
  if (popupWrapper.value.contains(target)) {
    return
  }

  // Ignore clicks on the popover's target element
  // so that clicking that closes the popover.
  if (props.target.contains(target)) {
    return
  }

  let x = event.clientX
  let y = event.clientY

  // Now determine where the popup is
  let minX = popupWrapper.value.offsetLeft
  let maxX = minX + popupWrapper.value.offsetWidth
  let minY = popupWrapper.value.offsetTop
  let maxY = minY + popupWrapper.value.offsetHeight

  if (x < minX || maxX < x || y < minY || maxY < y) {
    // Clicked outside the popup -> close it
    emit('close')
  }
}

function onResize (event: UIEvent): void {
  place()
}

/**
 * Places the popover correctly.
 */
function place (): void {
  if (popupWrapper.value === null || popupArrow.value === null) {
    return
  }

  const wrapper = popupWrapper.value
  const arrow = popupArrow.value

  // First, reset any applied styles to the elements
  wrapper.style.height = ''
  wrapper.style.width = ''
  wrapper.style.left = ''
  wrapper.style.top = ''

  arrow.style.left = ''
  arrow.style.top = ''
  arrow.style.display = ''
  arrow.style.borderWidth = ''
  arrow.classList.remove('up', 'down', 'left', 'right')

  // Windows doesn't have arrows on their popovers, just as they call them
  // "flyouts" instead of PopOvers. So on Windows we shouldn't show them.
  if (process.platform === 'win32') {
    arrow.style.display = 'none'
  }

  // Gather dimensions of window and target (which do not change here)
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  const targetRect = props.target.getBoundingClientRect()
  const targetTop = targetRect.top
  const targetLeft = targetRect.left
  const targetWidth = targetRect.width
  const targetHeight = targetRect.height
  const targetRight = targetLeft + targetWidth
  const targetBottom = targetTop + targetHeight

  // Dynamically calculate the arrow size, based on the shortest side of the popover.
  const shortSide = Math.min(wrapper.offsetHeight, wrapper.offsetWidth)
  const wantedArrowSize = Math.round(shortSide / 4)
  // Actual arrow size is constrained between min and max sizes.
  const arrowSize = Math.min(Math.max(wantedArrowSize, MIN_ARROW_SIZE), MAX_ARROW_SIZE)

  arrow.style.borderWidth = `${arrowSize}px`

  console.log({ wantedArrowSize, shortSide, arrowSize })

  // Safety checks: Here we adjust the popover dimensions if necessary
  // Ensure the popover is not higher or wider than the window itself
  if (wrapper.offsetHeight > windowHeight - 2 * DOCUMENT_MARGIN - 2 * arrowSize) {
    wrapper.style.height = `${windowHeight - 2 * DOCUMENT_MARGIN - 2 * arrowSize}px`
  }
  if (wrapper.offsetWidth > windowWidth - 2 * DOCUMENT_MARGIN - 2 * arrowSize) {
    wrapper.style.width = `${windowWidth - 2 * DOCUMENT_MARGIN - 2 * arrowSize}px`
  }

  // Now we can safely retrieve the popover dimensions
  const wrapperHeight = wrapper.offsetHeight
  const wrapperWidth = wrapper.offsetWidth

  const spaceAbove = targetTop
  const spaceBelow = windowHeight - targetBottom
  const spaceLeft = targetLeft
  const spaceRight = windowWidth - targetRight

  // Check where we can place the popover. Usually this will yield more than one
  // `true` value.
  const placementMargins = DOCUMENT_MARGIN + arrowSize
  const canPlaceBelow = spaceBelow > wrapperHeight + placementMargins && spaceLeft > placementMargins && spaceRight > placementMargins
  const canPlaceRight = spaceRight > wrapperWidth + placementMargins && spaceAbove > placementMargins && spaceBelow > placementMargins
  const canPlaceAbove = spaceAbove > wrapperHeight + placementMargins && spaceLeft > placementMargins && spaceRight > placementMargins
  const canPlaceLeft = spaceLeft > wrapperWidth + placementMargins && spaceAbove > placementMargins && spaceBelow > placementMargins

  // Fallback: below, if nothing actually fits.
  let actualPlacement: Placement = 'below'

  // First priority that can be fulfilled wins
  for (const prio of placementPriorities.value) {
    if (prio === 'above' && canPlaceAbove) {
      actualPlacement = 'above'
      break
    } else if (prio === 'below' && canPlaceBelow) {
      actualPlacement = 'below'
      break
    } else if (prio === 'left' && canPlaceLeft) {
      actualPlacement = 'left'
      break
    } else if (prio === 'right' && canPlaceRight) {
      actualPlacement = 'right'
      break
    }
  }

  // At this point, we know where we can and should place the popover. So assign
  // the correct top/left values and place the arrow accordingly. We do the same
  // for the arrow, albeit those values only take effect if the arrow is
  // actually shown.

  if (actualPlacement === 'below') {
    wrapper.style.top = `${targetBottom + arrowSize}px`
    wrapper.style.left = `${targetLeft + targetWidth / 2 - wrapperWidth / 2}px`

    arrow.classList.add('up')
    arrow.style.top = `${targetTop + targetHeight}px`
    arrow.style.left = `${targetLeft + targetWidth / 2 - arrow.offsetWidth / 2}px`
  } else if (actualPlacement === 'right') {
    wrapper.style.top = `${targetTop + targetHeight / 2 - wrapperHeight / 2}px`
    wrapper.style.left = `${targetRight + arrowSize}px`

    arrow.classList.add('left')
    arrow.style.top = `${targetTop + targetHeight / 2 - arrow.offsetHeight / 2}px`
    arrow.style.left = `${targetLeft + targetWidth}px`
  } else if (actualPlacement === 'above') {
    wrapper.style.top = `${targetTop - wrapperHeight - arrowSize}px`
    wrapper.style.left = `${targetLeft + targetWidth / 2 - wrapperWidth / 2}px`

    arrow.classList.add('down')
    arrow.style.top = `${targetTop - arrowSize}px`
    arrow.style.left = `${targetLeft + targetWidth / 2 - arrow.offsetWidth / 2}px`
  } else if (actualPlacement === 'left') {
    wrapper.style.top = `${targetTop + targetHeight / 2 - wrapperHeight / 2}px`
    wrapper.style.left = `${targetLeft - wrapperWidth - arrowSize}px`

    arrow.classList.add('right')
    arrow.style.top = `${targetTop + targetHeight / 2 - arrow.offsetHeight / 2}px`
    arrow.style.left = `${targetLeft + wrapperWidth}px`
  }

  // At this point, the popover is placed centrally next to the target in the
  // provided direction. This means that the first axis is now laid out. Next,
  // we need to check if we have to move the popover in the second axis. For
  // example, if we have placed the popover to the left of the target, but the
  // target is close to the top/bottom viewport border, we may have to move it
  // up/down to ensure the popover is shown completely.
  if (actualPlacement === 'right' || actualPlacement === 'left') {
    const { top, bottom } = wrapper.getBoundingClientRect() // Re-fetch the values
    if (top < 0) {
      wrapper.style.top = `${DOCUMENT_MARGIN}px`
    } if (bottom > windowHeight) {
      wrapper.style.top = `${windowHeight - DOCUMENT_MARGIN - wrapperHeight}px`
    }
  } else if (actualPlacement === 'above' || actualPlacement === 'below') {
    const { left, right } = wrapper.getBoundingClientRect() // Re-fetch the values
    if (left < 0) {
      wrapper.style.left = `${DOCUMENT_MARGIN}px`
    } if (right > windowWidth) {
      wrapper.style.left = `${windowWidth - DOCUMENT_MARGIN - wrapperWidth}px`
    }
  }
}
</script>

<style lang="less">
/* * * * * * * * * * * * * *
 *                         *
 *   BEGIN VARIABLES AREA  *
 *                         *
 * * * * * * * * * * * * * */

@size-share-buttons: 46px;
@size-icon-buttons:  25px;
@arrow-size: 20px;
@color-light: rgb(230, 230, 230);
@color-dark: rgb(30, 30, 30);
@border-color-light: rgb(213, 213, 213);
@border-color-dark: rgb(70, 70, 70);

/* * * * * * * * * * * * * *
 *                         *
 *    END VARIABLES AREA   *
 *                         *
 * * * * * * * * * * * * * */

body .popover-arrow {
  width: 0;
  height: 0;
  position: fixed;
  z-index: 10;

  &.up {
    border-left: @arrow-size solid transparent;
    border-right: @arrow-size solid transparent;
    border-bottom: @arrow-size solid @border-color-light;
  }
  &.down {
    border-left: @arrow-size solid transparent;
    border-right: @arrow-size solid transparent;
    border-top: @arrow-size solid @border-color-light;
  }
  &.left {
    border-top: @arrow-size solid transparent;
    border-bottom: @arrow-size solid transparent;
    border-right: @arrow-size solid @border-color-light;
  }
  &.right {
    border-top: @arrow-size solid transparent;
    border-bottom: @arrow-size solid transparent;
    border-left: @arrow-size solid @border-color-light;
  }
}

body .popover {
  background-color: @color-light;
  border: 1px solid @border-color-light;
  box-shadow: 0px 0px 40px 0px rgba(0, 0, 0, .4);
  border-radius: 8px;
  position: fixed;
  max-width: 350px; // Maximum width.
  max-height: 50vh; // Maximum height. If its too much simply scroll.
  overflow-y: auto;
  overflow-x: hidden;
  padding: 5px;
  // Make sure it overlays also CodeMirror elements, which have some z-indices
  // set. The highest (for panels) that I've seen so far was 300
  z-index: 300;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

  // TOC links
  a.toc-link {
    text-decoration: none;
    display: block;
    line-height: 150%;
    padding: 4px;
    overflow-x: hidden;
    white-space: nowrap;
  }

  hr {
    margin: 4px 10px;
    border: none;
    border-bottom: 1px solid rgb(180, 180, 180);
  }

  table {
    vertical-align: middle;

    td { padding: 4px; }
  }

  // Elements inside popups
  form {
    input {
      padding: 5px;
      font-size: 200%;
      display: block;
      border: none;
      width: 100%;
      text-align: center;

      &:focus { outline: 0; }

      &.small {
        font-size: 140%;
        text-align: left;
        width: 350px; // Single-input areas can be somewhat wider
      }
    }

    input[type="checkbox"] {
      display: inline-block;
      margin: 5px;
      width: auto;
    }

    label {
      display: inline-block;
      margin: 5px;
    }
  }

  // Share buttons
  .row { display: flex; } // Also used by the table generator
  .table-generator { padding: 5px; }
  .table-generator .row .cell {
    flex-grow: 1;
    width: 10px;
    height: 10px;
    margin: 1px;
  }
}

body.dark .popover-arrow {
  &.up { border-bottom-color: @border-color-dark; }
  &.down { border-top-color: @border-color-dark; }
  &.left { border-right-color: @border-color-dark; }
  &.right { border-left-color: @border-color-dark; }
}

body.dark .popover {
  background-color: @color-dark;
  border: 1px solid @border-color-dark;

  hr {
    border-color: @border-color-dark;
  }
}

body.win32 {
  .popover {
    border-radius: 2px;
    box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, .3);
    padding: 8px;
  }
}
</style>
