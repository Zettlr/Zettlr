<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-statusbar="true"
    v-bind:statusbar-controls="statusbarControls"
    v-bind:disable-vibrancy="true"
    v-on:statusbar-click="handleClick($event)"
  >
    <div id="paste-image">
      <div class="image-preview-container">
        <img class="image-preview" v-bind:src="imgBase64">
      </div>
      <p>
        {{ dimensionsLabel }}: <strong>{{ imgWidth }}&times;{{ imgHeight }}px</strong>
      </p>
      <TextControl
        ref="filename"
        v-model="fileName"
        v-bind:label="filenameLabel"
        v-bind:autofocus="true"
        v-on:confirm="handleClick('save')"
        v-on:escape="handleClick('cancel')"
      >
      </TextControl>
      <File
        v-model="targetPath"
        v-bind:placeholder="pathPlaceholder"
        v-bind:label="pathLabel"
        v-bind:directory="true"
      ></File>
      <NumberControl
        v-model="imgWidth"
        v-bind:label="resizeToLabel"
        v-bind:min="1"
        v-bind:max="originalWidth"
        v-bind:placeholder="imgWidth"
        v-bind:inline="true"
        v-on:input="recalculateDimensions('width')"
        v-on:blur="recalculateDimensions('width')"
        v-on:confirm="handleClick('save')"
        v-on:escape="handleClick('cancel')"
      ></NumberControl>
      <NumberControl
        v-model="imgHeight"
        v-bind:min="1"
        v-bind:max="imgHeight"
        v-bind:placeholder="originalHeight"
        v-bind:inline="true"
        v-on:input="recalculateDimensions('height')"
        v-on:blur="recalculateDimensions('height')"
        v-on:confirm="handleClick('save')"
        v-on:escape="handleClick('cancel')"
      ></NumberControl>
      <Checkbox
        v-model="retainAspect"
        v-bind:label="aspectRatioLabel"
      ></Checkbox>
    </div>
  </WindowChrome>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PasteImage
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays the paste image modal window.
 *
 * END HEADER
 */

import WindowChrome from '@common/vue/window/WindowChrome.vue'
import Checkbox from '@common/vue/form/elements/CheckboxControl.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import NumberControl from '@common/vue/form/elements/NumberControl.vue'
import File from '@common/vue/form/elements/FileControl.vue'
import { trans } from '@common/i18n-renderer'
import { ref, watch } from 'vue'
import md5 from 'md5'
import { pathBasename, pathExtname } from '@common/util/renderer-path-polyfill'
import { type StatusbarControl } from '@common/vue/window/WindowStatusbar.vue'

const ipcRenderer = window.ipc

// BEGIN READING RELEVANT INFO FROM CLIPBOARD
async function retrieveClipboardData (): Promise<{ dataUrl: string, size: { width: number, height: number }, aspect: number, name: string }> {
  const clipboardItems = await navigator.clipboard.read()
  const clipboardImage = clipboardItems.find(i => i.types.includes('image/png'))
  if (clipboardImage === undefined) {
    throw new Error('Could not paste image: None in the clipboard.')
  }

  const blob = await clipboardImage.getType('image/png')
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onloadend = function () {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Could not decode image data: Result was not a base64 encoded string; data type is: ' + typeof reader.result))
      }
    }
    reader.onerror = function () { reject(new Error('Error decoding image data')) }
    reader.onabort = function () { reject(new Error('Decoding image data was aborted')) }
  })

  const image = new Image()
  image.src = dataUrl
  const { size, aspect } = await new Promise<{ size: { width: number, height: number }, aspect: number }>((resolve, reject) => {
    image.onload = function () {
      const size = {
        width: image.naturalWidth,
        height: image.naturalHeight
      }

      const aspect = image.naturalWidth / image.naturalHeight
      resolve({ aspect, size })
    }
    image.onerror = function () { reject(new Error('Could not determine image dimensions: Load error')) }
    image.onabort = function () { reject(new Error('Image loading was aborted.')) }
  })

  // After only 50 lines of code we have retrieved the existing information
  // about the image, lol. Now, let's see how long it takes to read plain text
  // ... oh, one line.
  const clipboardText = await navigator.clipboard.readText()

  let name = ''
  if (clipboardText.length > 0) {
    // If you copy an image from the web, the browser sometimes inserts
    // the original URL to it as text into the clipboard. In this case
    // we've already got a good image name!
    const basename = pathBasename(clipboardText, pathExtname(clipboardText))
    name = basename + '.png'
  } else {
    // In case there is no potential basename we could extract, simply
    // hash the dataURL. This way we can magically also prevent the same
    // image to be saved twice in the same directory. Such efficiency!
    name = md5('img' + dataUrl) + '.png'
  }

  return { aspect, dataUrl, size, name }
}

retrieveClipboardData().then(({ aspect, name, size, dataUrl }) => {
  imgWidth.value = size.width
  originalWidth.value = size.width
  imgHeight.value = size.height
  originalHeight.value = size.height
  aspectRatio.value = aspect
  fileName.value = name
  imgBase64.value = dataUrl
}).catch(err => console.error(err))

// Retrieve the correct startPath from the searchParams
const searchParams = new URLSearchParams(window.location.search)
const startPath = searchParams.get('startPath')

// Finally set the data object
const imgBase64 = ref<string>('')
const imgWidth = ref<number>(0)
const imgHeight = ref<number>(0)
const originalWidth = ref<number>(0)
const originalHeight = ref<number>(0)
const aspectRatio = ref<number>(0)
const retainAspect = ref<boolean>(true)
const targetPath = ref<string>(startPath ?? '')
const fileName = ref<string>('')

const windowTitle = trans('Insert Image from Clipboard')
const dimensionsLabel = trans('Image size')
const aspectRatioLabel = trans('Retain aspect ratio')
const resizeToLabel = trans('Resize image to')
const pathLabel = trans('Filename')
const pathPlaceholder = trans('A unique filename')
const filenameLabel = trans('A unique filename')
const statusbarControls: StatusbarControl[] = [
  // primary: true // It's a primary button
  { type: 'button', label: trans('Save'), id: 'save' },
  { type: 'button', label: trans('Cancel'), id: 'cancel' }
]

watch(retainAspect, () => {
  recalculateDimensions('width')
})

function recalculateDimensions (type: 'width'|'height'): void {
  if (!retainAspect.value) {
    return
  }

  if (type === 'width') {
    imgHeight.value = Math.round(imgWidth.value / aspectRatio.value)
  } else {
    imgWidth.value = Math.round(imgHeight.value * aspectRatio.value)
  }
}

function handleClick (controlID: string): void {
  if (controlID === 'save') {
    // Transmit the collected information to main. It will be received
    // by the window manager, which will pass it on to the caller.
    ipcRenderer.send('paste-image-ready', {
      targetDir: targetPath.value,
      name: fileName.value,
      width: imgWidth.value,
      height: imgHeight.value
    })
  } else if (controlID === 'cancel') {
    ipcRenderer.send('window-controls', { command: 'win-close' })
  }
}
</script>

<style lang="less">
div#paste-image {
  padding: 10px;
}

div.image-preview-container {
  text-align: center;
}

img.image-preview {
  max-width: 100%;
  max-height: 100%;
}
</style>
