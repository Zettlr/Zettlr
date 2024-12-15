<template>
  <div class="image-viewer-container">
    <div class="image-toolbar">
      <SelectControl
        v-model="viewMode"
        v-bind:options="viewModeSelectOptins"
        v-bind:inline="true"
      ></SelectControl>
      <ButtonControl
        v-bind:label="'+'"
        v-bind:disabled="viewMode !== 'zoom'"
        v-bind:inline="true"
        v-on:click="zoomLevel += ZOOM_STEP"
      ></ButtonControl>
      <NumberControl
        v-model="zoomLevel"
        v-bind:inline="true"
        v-bind:disabled="viewMode !== 'zoom'"
        v-bind:min="MINIMUM_ZOOM"
      ></NumberControl>
      <ButtonControl
        v-bind:label="'-'"
        v-bind:disabled="viewMode !== 'zoom'"
        v-bind:inline="true"
        v-on:click="zoomLevel = Math.max(zoomLevel - ZOOM_STEP, MINIMUM_ZOOM)"
      ></ButtonControl>
      <!-- Background controls -->
      <!-- Transparent -->
      <div
        v-bind:class="{
          'background-button': true,
          'bg-transparent': true,
          active: backgroundPattern === 'transparent'
        }"
        v-on:click="backgroundPattern = 'transparent'"
      ></div>
      <!-- White -->
      <div
        v-bind:class="{
          'background-button': true,
          'bg-white': true,
          active: backgroundPattern === 'white'
        }"
        v-on:click="backgroundPattern = 'white'"
      ></div>
      <!-- Black -->
      <div
        v-bind:class="{
          'background-button': true,
          'bg-black': true,
          active: backgroundPattern === 'black'
        }"
        v-on:click="backgroundPattern = 'black'"
      ></div>
      <!-- Checkerboard -->
      <div
        v-bind:class="{
          'background-button': true,
          'bg-checker': true,
          active: backgroundPattern === 'checkerboard'
        }"
        v-on:click="backgroundPattern = 'checkerboard'"
      ></div>

      <!-- Open externally button -->
      <ButtonControl
        v-bind:icon="'pop-out'"
        v-bind:label="openExternallyLabel"
        v-on:click="openImageExternally"
      ></ButtonControl>
    </div>
    <div
      v-bind:class="{
        'image-wrapper': true,
        'bg-white': backgroundPattern === 'white',
        'bg-black': backgroundPattern === 'black',
        'bg-checker': backgroundPattern === 'checkerboard'
      }"
    >
      <img
        ref="imgElement"
        v-bind:src="makeValidUri(props.file.path)" v-bind:class="imageClass"
        v-bind:style="imageStyle"
        v-on:load="updateNaturalSize"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ImageViewer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The image viewer can be mounted into editor panes to display
 *                  images. It offers some basic controls to zoom the images,
 *                  and it offers a variety of backgrounds (transparent, white,
 *                  black, and checkboard) to accommodate various types of
 *                  transparency and image colors.
 *
 * END HEADER
 */
import type { OpenDocument } from 'source/types/common/documents'
import type { EditorCommands } from '../App.vue'
import { computed, ref } from 'vue'
import makeValidUri from 'source/common/util/make-valid-uri'
import SelectControl from 'source/common/vue/form/elements/SelectControl.vue'
import NumberControl from 'source/common/vue/form/elements/NumberControl.vue'
import ButtonControl from 'source/common/vue/form/elements/ButtonControl.vue'
import { trans } from 'source/common/i18n-renderer'

const MINIMUM_ZOOM = 1 // Percent, not ratio
const ZOOM_STEP = 10 // By how much the +/- buttons should affect the zoom level

const props = defineProps<{
  leafId: string
  windowId: string
  activeFile: OpenDocument|null
  editorCommands: EditorCommands
  file: OpenDocument
}>()

const zoomLevel = ref(100)
const naturalWidth = ref(0)
const naturalHeight = ref(0)

const openExternallyLabel = trans('Open image externally')

type BackgroundPattern = 'transparent'|'white'|'black'|'checkerboard'
const backgroundPattern = ref<BackgroundPattern>('transparent')

type ViewMode = 'fit'|'fit-width'|'fit-height'|'zoom'
const viewMode = ref<ViewMode>('fit')
const viewModeSelectOptins: Record<ViewMode, string> = {
  'fit': 'Fit image',
  'fit-height': 'Fit height',
  'fit-width': 'Fit width',
  'zoom': 'Zoom'
}

const imgElement = ref<HTMLImageElement|null>(null)
const imageClass = computed(() => {
  if (viewMode.value === 'zoom') {
    return ''
  } else {
    return viewMode.value
  }
})
const imageStyle = computed(() => {
  if (viewMode.value !== 'zoom') {
    return ''
  }

  return `zoom: ${zoomLevel.value / 100};`
})

function updateNaturalSize () {
  if (imgElement.value === null) {
    return
  }

  naturalHeight.value = imgElement.value.naturalHeight
  naturalWidth.value = imgElement.value.naturalWidth
}

function openImageExternally () {
  // Works because main intercepts these requests
  window.location.href = makeValidUri(props.file.path)
}
</script>

<style lang="css" scoped>
div.image-viewer-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

div.image-toolbar {
  display: flex;
  justify-items: flex-start;
  align-items: center;
  width: 100%;
  padding: 5px 0;
  /* Disallow shrinking of any items; we use flex box only for vertical alignment */
  > * { flex-shrink: 0; }
  overflow: auto;
}

div.background-button {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 1px solid gray;

  &.active {
    border-color: var(--system-accent-color);
  }
}

.bg-white { background-color: white; }
.bg-black { background-color: black; }
.bg-checker {
  --checker-light: transparent;
  --checker-dark: #80808080;

  background-image:
    linear-gradient(45deg, var(--checker-dark) 25%, var(--checker-light) 25%),
    linear-gradient(-45deg, var(--checker-dark) 25%, var(--checker-light) 25%),
    linear-gradient(45deg, var(--checker-light) 75%, var(--checker-dark) 75%),
    linear-gradient(-45deg, var(--checker-light) 75%, var(--checker-dark) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

div.image-wrapper {
  overflow: auto;
  width: 100%;
  height: 100%;
  display: flex;
  /*
    The `safe` keyword ensures that the image never gets cropped. See
    https://stackoverflow.com/a/33455342 (solution #2)
  */
  align-items: safe center;
  justify-content: safe center;
}

img {
  max-width: none;
  max-height: none;
  pointer-events: none;
}

img.fit {
  max-width: 100%;
  max-height: 100%;
}
img.fit-width { width: 100%; }
img.fit-height { height: 100%; }

img.zoom {
  max-width: none;
  max-height: none;
}
</style>
