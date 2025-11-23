<template>
  <Teleport to="body">
    <div ref="popupArrow" class="popover-arrow"></div>
    <div ref="popupWrapper" class="popover">
      <!-- TODO -->
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

const ARROW_SIZE = 20 // in pixels

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
  arrow.classList.remove('up', 'down', 'left', 'right')

  // Windows doesn't have arrows on their popovers, just as they call them
  // "flyouts" instead of PopOvers. So on Windows we shouldn't show them.
  const showArrow = process.platform !== 'win32'
  const arrowSize = (showArrow) ? ARROW_SIZE : 10 // Windows gets 10px margin
  const MARGIN = 10 // 10px margins to the document

  const targetRect = props.target.getBoundingClientRect()
  const targetTop = targetRect.top
  const targetLeft = targetRect.left
  const targetWidth = targetRect.width
  const targetHeight = targetRect.height

  // Where we should align the Popover to
  let x = targetLeft + targetWidth / 2
  let y = targetTop + targetHeight

  // Popover width and height
  const wrapperHeight = wrapper.offsetHeight
  const wrapperWidth = wrapper.offsetWidth
  const wrapperLeft = wrapper.offsetLeft
  const wrapperTop = wrapper.offsetTop

  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  // First find on which side there is the most space. We cannot use the
  // targetRect right/bottom properties, as those also take into account the
  // rest of the DOM tree, and not the actual visible space.
  const targetRight = windowWidth - targetLeft - targetWidth
  const targetBottom = windowHeight - targetTop -targetHeight

  const canPlaceBelow = targetBottom > wrapperHeight + MARGIN || targetTop < 50
  const canPlaceRight = targetRight > wrapperWidth + MARGIN && wrapperHeight <= windowHeight - 2 * MARGIN - y
  const canPlaceAbove = targetTop > wrapperHeight + MARGIN
  const canPlaceLeft = targetLeft + MARGIN < wrapperWidth && wrapperHeight <= windowHeight - 2 * MARGIN - y

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

  if (actualPlacement === 'below') {
    // Below element
    arrow.classList.add('up')
    wrapper.style.top = `${y + arrowSize}px` // 5px margin for arrow
    if ((x + wrapperWidth / 2) > (windowWidth - MARGIN)) {
      wrapper.style.left = `${windowWidth - wrapperWidth - MARGIN}px`
    } else if (x - wrapperWidth / 2 < MARGIN) {
      wrapper.style.left = `${MARGIN}px`
    } else {
      wrapper.style.left = `${x - wrapperWidth / 2}px` // Place centered under element
    }

    if (showArrow) {
      arrow.style.top = `${targetTop + targetHeight}px`
      arrow.style.left = `${targetLeft + targetWidth / 2 - arrow.offsetWidth / 2}px`
    } else {
      arrow.style.display = 'none'
    }

    // Ensure the popup is completely visible (move inside the document if it's at an edge)
    if (wrapperLeft + wrapperWidth > windowWidth - MARGIN) {
      wrapper.style.left = `${windowWidth - wrapperWidth - MARGIN}px`
    } if (wrapperLeft < MARGIN) {
      wrapper.style.left = `${MARGIN}px`
    }

    // Ensure the popup is not higher than the window itself
    if (wrapperHeight > windowHeight - 2 * MARGIN - y) {
      wrapper.style.height = `${windowHeight - 2 * MARGIN - y}px`
    }
  } else if (actualPlacement === 'right') {
    // We can place it right of the element
    // Therefore re-compute x and y
    x = targetLeft + targetWidth
    y = targetTop + targetHeight / 2
    wrapper.style.left = `${x + arrowSize}px`
    if (y + wrapperHeight / 2 > windowHeight - arrowSize) {
      wrapper.style.top = `${windowHeight - wrapperHeight - arrowSize}px`
    } else {
      wrapper.style.top = `${y - wrapperHeight / 2}px`
    }

    if (showArrow) {
      arrow.classList.add('left')
      arrow.style.left = `${targetLeft + targetWidth}px`
      arrow.style.top = `${targetTop + targetHeight / 2 - arrow.offsetHeight / 2}px`
    }

    // Ensure the popup is completely visible (move inside the document if it's at an edge)
    if (wrapperTop + wrapperHeight > windowHeight - MARGIN) {
      wrapper.style.top = `${windowHeight - wrapperHeight - MARGIN}px`
    } if (wrapperTop < MARGIN) {
      wrapper.style.top = `${MARGIN}px`
    }
  } else if (actualPlacement === 'above') {
    // Above
    // Therefore re-compute x and y
    x = targetLeft + targetWidth / 2
    y = targetTop
    wrapper.style.top = `${y - wrapperHeight - arrowSize}px`
    if (x + wrapperWidth / 2 > windowWidth - arrowSize) {
      wrapper.style.left = `${windowWidth - wrapperWidth - arrowSize}px`
    } else {
      wrapper.style.left = `${x - wrapperWidth / 2}px`
    }

    if (showArrow) {
      arrow.classList.add('down')
      arrow.style.top = `${targetTop - arrowSize}px`
      arrow.style.left = `${targetLeft + targetWidth / 2 - arrow.offsetWidth / 2}px`
    }

    // Ensure the popup is completely visible (move inside the document if it's at an edge)
    if (wrapperLeft + wrapperWidth > windowWidth - MARGIN) {
      wrapper.style.left = `${windowWidth - wrapperWidth - MARGIN}px`
    } if (wrapperLeft < MARGIN) {
      wrapper.style.left = `${MARGIN}px`
    }
  } else if (actualPlacement === 'left') {
    // We can place it left of the element
    x = targetLeft - wrapperWidth
    y = targetTop + targetHeight / 2
    wrapper.style.left = `${x - arrowSize}px`
    if (y + wrapperHeight / 2 > windowHeight - arrowSize) {
      wrapper.style.top = `${windowHeight - wrapperHeight - arrowSize}px`
    } else {
      wrapper.style.top = `${y - wrapperHeight / 2}px`
    }

    if (showArrow) {
      arrow.classList.add('right')
      arrow.style.left = `${targetLeft + wrapperWidth}px`
      arrow.style.top = `${targetTop + targetHeight / 2 - arrow.offsetHeight / 2}px`
    }

    // Ensure the popup is completely visible (move inside the document if it's at an edge)
    if (wrapperTop + wrapperHeight > windowHeight - MARGIN) {
      wrapper.style.top = `${windowHeight - wrapperHeight - MARGIN}px`
    } if (wrapperTop < MARGIN) {
      wrapper.style.top = `${MARGIN}px`
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
