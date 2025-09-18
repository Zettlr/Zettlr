<template>
  <div
    ref="pdfViewerContainer"
    class="pdf-viewer-container"
    role="region"
    v-bind:aria-label="`PDFViewer: Currently viewing file ${pathBasename(props.file.path)}`"
    v-on:click="acceptsClicks = true"
  >
    <iframe
      ref="iframe"
      v-bind:src="makeValidUri(props.file.path)" view="Fit"
      v-bind:class="{ 'pointer-events': acceptsClicks }"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PDFViewer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The PDF Viewer is a component that can be mounted into
 *                  editor panes to display PDF files, using Chromium's built-in
 *                  PDF viewer. NOTE that due to the way iframes work, we have
 *                  to manually enable and disable pointer events. Were we not
 *                  doing this, the iframes could "swallow" drag events, making
 *                  resizing of the editor panes using the resizer bars
 *                  cumbersome. Right now, you "activate" iframes by clicking on
 *                  them, and disable them by focusing literally any other
 *                  element on the side. A faint outline/border indicates the
 *                  status.
 *
 * END HEADER
 */
import type { OpenDocument } from 'source/types/common/documents'
import type { EditorCommands } from '../App.vue'
import makeValidUri from 'source/common/util/make-valid-uri'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { pathBasename } from 'source/common/util/renderer-path-polyfill'

const props = defineProps<{
  leafId: string
  windowId: string
  activeFile: OpenDocument|null
  editorCommands: EditorCommands
  file: OpenDocument
}>()

const iframe = ref<HTMLIFrameElement|null>(null)
const pdfViewerContainer = ref<HTMLDivElement|null>(null)
const acceptsClicks = ref(false)

function toggleAcceptClicksOff () {
  acceptsClicks.value = false
}

onMounted(() => {
  document.addEventListener('focusin', toggleAcceptClicksOff)
})

onBeforeUnmount(() => {
  document.removeEventListener('focusin', toggleAcceptClicksOff)
})
</script>

<style lang="css" scoped>
div.pdf-viewer-container {
  width: 100%;
  height: 100%;
  user-select: auto;

  iframe {
    width: 100%;
    height: 100%;
    border: 1px solid transparent;
    pointer-events: none;

    &.pointer-events {
      pointer-events: auto;
      border-color: var(--system-accent-color);
    }
  }
}
</style>
