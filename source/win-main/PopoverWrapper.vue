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
import { onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'

const props = defineProps<{ target: HTMLElement }>()

const emit = defineEmits<(e: 'close') => void>()

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

  const el = popupWrapper.value
  const arrow = popupArrow.value

  // First, reset any applied styles to the elements
  el.style.height = ''
  el.style.width = ''
  el.style.left = ''
  el.style.top = ''
  arrow.style.left = ''
  arrow.style.top = ''
  arrow.classList.remove('up', 'down', 'left', 'right')

  // Windows doesn't have arrows on their popovers, just as they call them
  // "flyouts" instead of PopOvers. So on Windows we shouldn't show them.
  const showArrow = process.platform !== 'win32'
  const arrowSize = (showArrow) ? ARROW_SIZE : 10 // Windows gets 10px margin

  const elemRect = props.target.getBoundingClientRect()

  let x = elemRect.left + elemRect.width / 2
  let y = elemRect.top + elemRect.height

  let height = el.offsetHeight
  let width = el.offsetWidth

  // First find on which side there is the most space.
  const top = elemRect.top
  const left = elemRect.left
  const right = window.innerWidth - left - elemRect.width
  const bottom = window.innerHeight - top - elemRect.height

  // 10px: arrow plus the safety-margin
  if (bottom > height + 10 || elemRect.top < 50) {
    // Below element
    arrow.classList.add('up')
    el.style.top = `${y + arrowSize}px` // 5px margin for arrow
    if ((x + width / 2) > (window.innerWidth - 10)) { // 10px margin to document
      el.style.left = `${window.innerWidth - width - 10}px` // 10px margin to document
    } else if (x - width / 2 < 10) { // 10px margin to document
      el.style.left = '10px' // 10px margin to document
    } else {
      el.style.left = `${x - width / 2}px` // Place centered under element
    }

    if (showArrow) {
      arrow.style.top = `${top + elemRect.height}px`
      arrow.style.left = `${left + elemRect.width / 2 - arrow.offsetWidth / 2}px`
    } else {
      arrow.style.display = 'none'
    }

    // Ensure the popup is completely visible (move inside the document if it's at an edge)
    if (el.offsetLeft + el.offsetWidth > window.innerWidth - 10) {
      el.style.left = `${window.innerWidth - el.offsetWidth - 10}px`
    } if (el.offsetLeft < 10) {
      el.style.left = '10px'
    }

    // Ensure the popup is not higher than the window itself
    if (height > window.innerHeight - 20 - y) {
      el.style.height = `${window.innerHeight - 20 - y}px`
      height = el.offsetHeight
    }
  } else if (right > width + 10 && height <= window.innerHeight - 20 - y) {
    // We can place it right of the element
    // Therefore re-compute x and y
    x = elemRect.left + elemRect.width
    y = elemRect.top + elemRect.height / 2
    el.style.left = `${x + arrowSize}px`
    if (y + height / 2 > window.innerHeight - arrowSize) {
      el.style.top = `${window.innerHeight - height - arrowSize}px`
    } else {
      el.style.top = `${y - height / 2}px`
    }

    if (showArrow) {
      arrow.classList.add('left')
      arrow.style.left = `${left + elemRect.width}px`
      arrow.style.top = `${top + elemRect.height / 2 - arrow.offsetHeight / 2}px`
    }

    // Ensure the popup is completely visible (move inside the document if it's at an edge)
    if (el.offsetTop + el.offsetHeight > window.innerHeight - 10) {
      el.style.top = `${window.innerHeight - el.offsetHeight - 10}px`
    } if (el.offsetTop < 10) {
      el.style.top = '10px'
    }
  } else {
    // Above
    // Therefore re-compute x and y
    x = elemRect.left + elemRect.width / 2
    y = elemRect.top
    el.style.top = `${y - height - arrowSize}px`
    if (x + width / 2 > window.innerWidth - arrowSize) {
      el.style.left = `${window.innerWidth - width - arrowSize}px`
    } else {
      el.style.left = `${x - width / 2}px`
    }

    if (showArrow) {
      arrow.classList.add('down')
      arrow.style.top = `${top - arrowSize}px`
      arrow.style.left = `${left + elemRect.width / 2 - arrow.offsetWidth / 2}px`
    }

    // Ensure the popup is completely visible (move inside the document if it's at an edge)
    if (el.offsetLeft + el.offsetWidth > window.innerWidth - 10) {
      el.style.left = `${window.innerWidth - el.offsetWidth - 10}px`
    } if (el.offsetLeft < 10) {
      el.style.left = '10px'
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

/* * * * * * * * * * * * * *
 *                         *
 *    END VARIABLES AREA   *
 *                         *
 * * * * * * * * * * * * * */

/* * * * * * * * * * * * * *
 *                         *
 *     BEGIN MIXIN AREA    *
 *                         *
 * * * * * * * * * * * * * */

// Makes a div flex, can be used to generate a grid style button set
.flex-button-mixin(@size) {
  flex-grow: 1;
  width: @size;
  height: @size;
  line-height: @size;
  text-align: center;
  transition: 0.2s all ease;
  cursor: default;
}

 /* * * * * * * * * * * * * *
  *                         *
  *      END MIXIN AREA     *
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
    border-bottom: @arrow-size solid @color-light;
  }
  &.down {
    border-left: @arrow-size solid transparent;
    border-right: @arrow-size solid transparent;
    border-top: @arrow-size solid @color-light;
  }
  &.left {
    border-top: @arrow-size solid transparent;
    border-bottom: @arrow-size solid transparent;
    border-right: @arrow-size solid @color-light;
  }
  &.right {
    border-top: @arrow-size solid transparent;
    border-bottom: @arrow-size solid transparent;
    border-left: @arrow-size solid @color-light;
  }
}

body .popover {
  background-color: @color-light;
  border: 1px solid rgb(213, 213, 213);
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

  .btn-share {
    .flex-button-mixin(@size-share-buttons);
    background-position: center center;
    background-size: contain;
    background-repeat: no-repeat;

    &.htm {
    //  background-image: url('../../img/html5.svg');
      &:hover {
        /* W3C color code */
        background-color: rgb(78, 175, 87);
      }
    }

    &.pdf {
    //  background-image: url('../../img/pdf.svg');
      &:hover {
        /* Adobe reader PDF color code */
        background-color: lighten(rgb(253, 48, 26), 10%);
      }
    }

    &.docx {
    //  background-image: url('../../img/docx.svg');
      &:hover {
        /* MS Word color code */
        background-color: lighten(rgb(45, 88, 151), 10%);
      }
    }

    &.odt {
    //  background-image: url('../../img/odt.svg');
    }

    &.odt, &.tex, &.plain {
      color: rgba(20, 20, 20, 1);
      &:hover { background-color: rgba(220, 220, 220, 1); color:black; }
    }

    &.revealjs {
      color: rgba(120, 120, 120, 1);
      &:hover { background-color: rgba( 40,  40,  40, 1); color: white; }
    }

    // revealJS theme buttons
    &.revealjs-beige {
      color: #333333;
      background-color: #f7f2d3;
      &:hover { background-color: darken(#f7f2d3, 20%); color: #333333; }
    }
    &.revealjs-black {
      color: #ffffff;
      background-color: #222222;
      &:hover { background-color: lighten(#222222, 20%); color: #ffffff; }
    }
    &.revealjs-league {
      color: #71e9f4;
      background-color: #555a5f;
      &:hover { background-color: lighten(#555a5f, 20%); color: lighten(#71e9f4, 20%); }
    }
    &.revealjs-moon {
      color: #268bd2;
      background-color: #002b36;
      &:hover { background-color: lighten(#002b36, 20%); color: lighten(#268bd2, 20%); }
    }
    &.revealjs-serif {
      color: #383d3d;
      background-color: #f0f1eb;
      &:hover { background-color: darken(#f0f1eb, 10%); color: #383d3d; }
    }
    &.revealjs-sky {
      color: #333333;
      background-color: #add9e4;
      &:hover { background-color: darken(#add9e4, 10%); color: #333333; }
    }
    &.revealjs-solarized {
      color: #657b83;
      background-color: #fdf6e3;
      &:hover { background-color: darken(#fdf6e3, 10%); color: #657b83; }
    }
    &.revealjs-white {
      color: #222222;
      background-color: white;
      &:hover { background-color: darken(white, 20%); color: #222222; }
    }
    // END revealJS theme buttons

    &.rst {
      color: rgb(28, 78, 98);
      &:hover { color: white; background-color: rgb(28, 78, 98); } // This is literally the first colour I found on the web for rst
    }

    &.rtf {
      color: rgb(223, 51, 68);
      &:hover { background-color: rgb(223, 51, 68); color: white; }
    }

    &.org {
      color: lighten(rgb(0, 42, 53), 10%);
      &:hover { background-color: rgb(0, 42, 53); color: white; }
    }

    &.textbundle {
      color: #00b58c;
      &:hover { background-color: #00b58c; color:white; }
    }

    &.textpack {
      color: lighten(#0b0080, 20%);
      &:hover { background-color: #0b0080; color: white; }
    }
  }

  // For the icon selector
  .icon-block {
    .flex-button-mixin(@size-icon-buttons);
    font-size: 10px; // The clarity icons are way too big
  }

  // The revealjs theme selector's visibility
  #reveal-themes {
    transition: 0.2s height ease;
    height: @size-share-buttons * 2;
    overflow: hidden;
    &.hidden { height: 0px; }
  }

  // Footnote edit popup
  .footnote-edit {
    textarea {
      min-height: 150px;
      border: none;
      width: 250px; // Maximum width

      &:focus { outline: 0; }
    }
  }
}

body.dark .popover-arrow {
  &.up { border-bottom-color: @color-dark; }
  &.down { border-top-color: @color-dark; }
  &.left { border-right-color: @color-dark; }
  &.right { border-left-color: @color-dark; }
}

body.dark .popover {
  background-color: @color-dark;
  border: 1px solid rgb(70, 70, 70);

  hr {
    border-color: rgb(70, 70, 70);
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
