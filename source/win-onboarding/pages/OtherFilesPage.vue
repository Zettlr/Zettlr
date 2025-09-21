<template>
  <h1>{{ pageHeading }}</h1>

  <p>
    {{ previewInfo }}
  </p>

  <p>
    <button v-bind:class="{ active: hasActivatedPreviws }" v-on:click="activatePreviews">
      {{ activateLabel }}
    </button>
  </p>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import { ref } from 'vue'

const pageHeading = trans('Images and PDFs in Zettlr')
const previewInfo = trans('Zettlr can preview images and PDF files directly in Zettlr. This allows you to reference plots or literature directly while writing. If you do not activate this, images and PDF files will only be shown in the sidebar and open with your computer\'s default viewer.')
const activateLabel = trans('Activate Image and PDF Previews in Zettlr')

const hasActivatedPreviws = ref(false)
function activatePreviews () {
  window.config.set('files.images', { showInFilemanager: true, showInSidebar: false, openWith: 'zettlr' })
  window.config.set('files.pdf', { showInFilemanager: true, showInSidebar: false, openWith: 'zettlr' })
  hasActivatedPreviws.value = true
}
</script>

<style lang="less">
</style>
