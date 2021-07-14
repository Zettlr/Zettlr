<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="false"
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
        v-model="fileName"
        v-bind:label="filenameLabel"
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
        v-bind:max="imgWidth"
        v-bind:placeholder="imgWidth"
        v-bind:inline="true"
      ></NumberControl>
      <NumberControl
        v-model="imgHeight"
        v-bind:min="1"
        v-bind:max="imgHeight"
        v-bind:placeholder="imgHeight"
        v-bind:inline="true"
      ></NumberControl>
      <Checkbox
        v-model="retainAspect"
        v-bind:label="aspectRatioLabel"
      ></Checkbox>
    </div>
  </WindowChrome>
</template>

<script>
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

import WindowChrome from '../common/vue/window/Chrome.vue'
import Checkbox from '../common/vue/form/elements/Checkbox.vue'
import TextControl from '../common/vue/form/elements/Text.vue'
import NumberControl from '../common/vue/form/elements/Number.vue'
import File from '../common/vue/form/elements/File.vue'
import { trans } from '../common/i18n-renderer'
import md5 from 'md5'

const path = window.path
const ipcRenderer = window.ipc
const clipboard = window.clipboard

export default {
  name: 'PasteImage',
  components: {
    WindowChrome,
    Checkbox,
    NumberControl,
    TextControl,
    File
  },
  data: function () {
    // const image = clipboard.readImage()
    // const size = image.getSize() // First get the original size
    // const aspect = image.getAspectRatio() // Then the aspect
    // const dataUrl = image.resize({ 'height': 200 }).toDataURL()
    const { size, aspect, dataUrl } = clipboard.getImageData()
    // Get the hash from the window arguments
    let startPath
    [startPath] = process.argv.slice(-1)

    let name = ''
    if (clipboard.readText().length > 0) {
      // If you copy an image from the web, the browser sometimes inserts
      // the original URL to it as text into the clipboard. In this case
      // we've already got a good image name!
      name = path.basename(clipboard.readText(), path.extname(clipboard.readText())) + '.png'
    } else {
      // In case there is no potential basename we could extract, simply
      // hash the dataURL. This way we can magically also prevent the same
      // image to be saved twice in the same directory. Such efficiency!
      name = md5('img' + dataUrl) + '.png'
    }

    // Finally set the data object
    return {
      imgBase64: dataUrl,
      imgWidth: size.width,
      imgHeight: size.height,
      aspectRatio: aspect,
      retainAspect: true,
      targetPath: startPath,
      fileName: name
    }
  },
  computed: {
    windowTitle: function () {
      return trans('dialog.paste_image.title')
    },
    dimensionsLabel: function () {
      return trans('dialog.paste_image.dimensions')
    },
    aspectRatioLabel: function () {
      return trans('dialog.paste_image.retain_aspect_label')
    },
    resizeToLabel: function () {
      return trans('dialog.paste_image.resize_to')
    },
    pathLabel: function () {
      return trans('dialog.paste_image.name_label')
    },
    pathPlaceholder: function () {
      return trans('dialog.paste_image.name_placeholder')
    },
    filenameLabel: function () {
      return trans('dialog.paste_image.name_placeholder')
    },
    statusbarControls: function () {
      return [
        {
          type: 'button',
          label: trans('dialog.button.save'),
          id: 'save',
          icon: '',
          primary: true // It's a primary button
        },
        {
          type: 'button',
          label: trans('dialog.button.cancel'),
          id: 'cancel',
          icon: ''
        }
      ]
    }
  },
  watch: {
    imgWidth: function () {
      this.recalculateDimensions('width')
    },
    imgHeight: function () {
      this.recalculateDimensions('height')
    },
    retainAspect: function () {
      this.recalculateDimensions('width')
    }
  },
  methods: {
    recalculateDimensions: function (type) {
      if (this.retainAspect === false) {
        return
      }

      if (type === 'width') {
        this.imgHeight = Math.round(this.imgWidth / this.aspectRatio)
      } else {
        this.imgWidth = Math.round(this.imgHeight * this.aspectRatio)
      }
    },
    handleClick: function (controlID) {
      if (controlID === 'save') {
        // Transmit the collected information to main. It will be received
        // by the window manager, which will pass it on to the caller.
        ipcRenderer.send('paste-image-ready', {
          targetDir: this.targetPath,
          name: this.fileName,
          width: this.imgWidth,
          height: this.imgHeight
        })
      } else if (controlID === 'cancel') {
        ipcRenderer.send('window-controls', { command: 'win-close' })
      }
    }
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
