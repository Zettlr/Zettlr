<template>
  <div class="form-control">
    <label v-if="label" v-bind:for="fieldID">{{ label }}</label>
    <div class="input-button-group">
      <input
        v-bind:id="fieldID"
        ref="input"
        type="text"
        readonly="readonly"
        v-bind:name="name"
        v-bind:value="value"
        v-on:click="requestFile"
      >
      <button
        type="button"
        class="request-file"
        data-tippy-content="dialog.preferences.choose_file"
        v-on:click="requestFile"
      >
        <clr-icon shape="file"></clr-icon>
      </button>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  name: 'File',
  props: {
    value: {
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
    }
  },
  methods: {
    requestFile: function () {
      const payload = {
        // Only one filter possible for brevity reasons
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
          this.$emit('input', result[0])
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
