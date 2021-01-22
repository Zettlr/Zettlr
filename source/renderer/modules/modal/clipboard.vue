<template>
  <div id="dev-clipboard">
    <h1>Inspect Clipboard</h1>
    <p>
      Here you can inspect the current contents of the clipboard.
      <strong>Note</strong>: This is a developer feature.
    </p>
    <h2>HTML Contents</h2>
    <p>
      <pre style="white-space: pre-wrap"><code style="display: block">{{ html }}</code></pre>
    </p>
    <h2>Text Contents</h2>
    <p>
      <pre style="white-space: pre-wrap"><code style="display: block">{{ text }}</code></pre>
    </p>
    <h2>RichText Contents</h2>
    <p>
      <pre style="white-space: pre-wrap"><code style="display: block">{{ rtf }}</code></pre>
    </p>
    <h2>Image</h2>
    <p v-if="imageData !== ''">
      <img v-bind:src="imageData">
      <span class="info">
        Image dimensions: {{ imageSize.width }}&times;{{ imageSize.height }}
      </span>
    </p>
    <p v-else>
      <pre style="white-space: pre-wrap">
        <code style="display: block">
          The Clipboard does not contain an image.
        </code>
      </pre>
    </p>
    <div>
      <button id="abort">
        Close
      </button>
    </div>
  </div>
</template>

<script>
import { clipboard } from 'electron'

export default {
  name: 'Clipboard',
  data: function () {
    return {
      html: '',
      text: '',
      rtf: '',
      imageData: '',
      imageSize: {
        width: 0,
        height: 0
      }
    }
  },
  computed: {
    clipboardHTML: function () {
      return clipboard.readHTML()
    },
    clipboardText: function () {
      return clipboard.readText()
    },
    clipboardRTF: function () {
      return clipboard.readRTF()
    },
    clipboardImage: function () {
      return !clipboard.readImage().isEmpty()
    }
  },
  mounted: function () {
    // On every mount (aka: dialog is shown) populate the properties
    this.html = clipboard.readHTML()
    this.text = clipboard.readText()
    this.rtf = clipboard.readRTF()
    const image = clipboard.readImage()
    if (image.isEmpty()) {
      this.imageData = ''
      this.imageSize = {
        width: 0,
        height: 0
      }
    } else {
      this.imageData = image.toDataURL()
      this.imageSize = image.getSize()
    }
  }
}
</script>
