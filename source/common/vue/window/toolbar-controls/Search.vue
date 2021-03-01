<template>
  <input
    v-bind:id="`toolbar-${control.id}`"
    ref="input"
    type="search"
    role="search"
    class="toolbar-search"
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
body.darwin {
  .toolbar-search {
    border-radius: 4px;
    background-color: rgb(245, 245, 245);
    border: 1px solid rgb(190, 190, 190);
    &::placeholder {
      color: rgb(190, 190, 190);
    }

    &:focus {
      border: 4px solid var(--system-accent-color, --c-primary);
    }
    padding: 2px 6px;
    margin: 0 4px;
  }

  &.dark {
    .toolbar-search {
      background-color: rgb(51, 51, 51);;
      border: 1px solid rgb(120, 120, 120);

      &::placeholder {
        color: rgb(120, 120, 120);
      }
    }
  }
}
</style>
