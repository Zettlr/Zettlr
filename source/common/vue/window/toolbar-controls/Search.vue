<template>
  <input
    ref="input"
    type="search"
    role="search"
    v-bind:placeholder="control.placeholder"
    v-on:input="$emit('input', $event.target.value)"
  >
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  name: 'SearchControl',
  props: {
    control: {
      type: Object,
      default: function () { return {} }
    }
  },
  created: function () {
    /**
     * Listen to shortcuts from the menu provider
     *
     * @param   {string}  shortcut  The shortcut to be triggered
     */
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'search') {
        this.$refs.input.focus()
      }
    })
  }
}
</script>

<style lang="less">
</style>
