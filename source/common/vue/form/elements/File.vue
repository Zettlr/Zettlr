<template>
  <div class="form-control">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div class="input-button-group">
      <input
        v-bind:id="fieldID"
        ref="input"
        type="text"
        v-bind:name="name"
        v-bind:value="modelValue"
        v-bind:placeholder="placeholder"
      >
      <button
        type="button"
        class="request-file"
        data-tippy-content="dialog.preferences.choose_file"
        v-on:click="(directory) ? requestDir() : requestFile()"
      >
        {{ selectButtonLabel }}
      </button>
      <button
        v-if="reset !== false"
        type="button"
        v-on:click="resetValue"
      >
        {{ resetLabel }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component represents a custom file input.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'FileControl',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    reset: {
      type: [ Boolean, String ],
      default: false
    },
    placeholder: {
      type: String,
      default: ''
    },
    directory: {
      type: Boolean,
      default: false // If true, actually selects a directory
    },
    filter: {
      type: Object,
      default: function () {
        return { '*': 'All files' }
      }
    }
  },
  emits: ['update:modelValue'],
  computed: {
    fieldID: function () {
      return 'field-input-' + this.name
    },
    resetLabel: function () {
      return trans('Reset to default')
    },
    selectButtonLabel () {
      return this.directory ? trans('Select folder…') : trans('Select file…')
    },
    inputRef (): HTMLInputElement {
      return this.$refs.input as HTMLInputElement
    }
  },
  methods: {
    resetValue: function () {
      const newVal = (typeof this.reset === 'string') ? this.reset : ''
      this.inputRef.value = newVal
      this.$emit('update:modelValue', newVal)
    },
    requestFile: function () {
      const payload = {
        filters: [] as Array<{ name: string, extensions: string[] }>,
        multiSel: false
      }

      for (const [ key, value ] of Object.entries(this.filter)) {
        payload.filters.push({
          name: value,
          extensions: key.split(',').map(ext => ext.trim())
        })
      }

      ipcRenderer.invoke('request-files', payload)
        .then(result => {
          // Don't update to empty paths.
          if (result.length === 0 || result[0].trim() === '') {
            return
          }

          // Write the return value into the data-request-target of the clicked
          // button, because each button has a designated text field.
          this.inputRef.value = result[0]
          this.$emit('update:modelValue', result[0])
        })
        .catch(e => console.error(e))
    },
    requestDir: function () {
      ipcRenderer.invoke('request-dir')
        .then(result => {
          // Don't update to empty paths.
          if (result.length === 0 || result[0].trim() === '') {
            return
          }

          this.inputRef.value = result[0]
          this.$emit('update:modelValue', result[0])
        })
        .catch(e => console.error(e))
    }
  }
})
</script>

<style lang="less">
body {
  .form-control .input-button-group {
    display: flex;
    column-gap: 10px;
    margin: 10px 0;

    input, button { white-space: nowrap; }

    input { flex-grow: 2; }
    button { flex-grow: 1; }
  }
}
body.darwin {
  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
}
</style>
