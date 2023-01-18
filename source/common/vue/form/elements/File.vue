<template>
  <div class="form-control">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <div class="input-button-group">
      <input
        v-bind:id="fieldID"
        ref="input"
        type="text"
        readonly="readonly"
        v-bind:name="name"
        v-bind:value="modelValue"
        v-bind:placeholder="placeholder"
        v-on:click="(directory) ? requestDir() : requestFile()"
      >
      <button
        type="button"
        class="request-file"
        data-tippy-content="dialog.preferences.choose_file"
        v-on:click="(directory) ? requestDir() : requestFile()"
      >
        <cds-icon shape="file"></cds-icon>
      </button>
      <button
        v-if="reset !== false"
        type="button"
        v-bind:title="resetLabel"
        v-on:click="resetValue"
      >
        <cds-icon shape="refresh"></cds-icon>
      </button>
    </div>
  </div>
</template>

<script>
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

const ipcRenderer = window.ipc

export default {
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
  computed: {
    fieldID: function () {
      return 'field-input-' + this.name
    },
    resetLabel: function () {
      return trans('Reset')
    }
  },
  methods: {
    resetValue: function () {
      const newVal = (typeof this.reset === 'string') ? this.reset : ''
      this.$refs.input.value = newVal
      this.$emit('update:modelValue', newVal)
    },
    requestFile: function () {
      const payload = {
        filters: [],
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
          this.$refs.input.value = result[0]
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

          this.$refs.input.value = result[0]
          this.$emit('update:modelValue', result[0])
        })
        .catch(e => console.error(e))
    }
  }
}
</script>

<style lang="less">
body.darwin {
  label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
}
</style>
