<template>
  <div id="statusbar">
    <div>
      <button id="save" class="primary" v-on:click="$emit('click', 'save')">
        {{ saveLabel }}
      </button>
      <button id="abort" v-on:click="$emit('click', 'cancel')">
        {{ cancelLabel }}
      </button>
    </div>
  </div>
</template>

<script>
import { trans } from '../../i18n'

export default {
  name: 'Statusbar',
  props: {
    controls: {
      type: Array,
      default: function () { return [] }
    }
  },
  data: function () {
    return {
      saveLabel: trans('dialog.button.save'),
      cancelLabel: trans('dialog.button.cancel')
    }
  }
}
</script>

<style lang="less">
div#statusbar {
  height: 40px;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0px 20px;
  line-height: 40px;
  background-color: #ebebeb; // TODO: Enable the status bar to be "invisible" and visible

  button {
    font-family:  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: white;
    border: 1px solid rgb(210, 210, 210);
    border-bottom-color: rgb(180, 180, 180);
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 13px;
    margin: 4px 5px;

    &.primary {
      background-color: var(--system-accent-color, --c-primary);
      border-color: var(--system-accent-color, --c-primary);
      color: white;
    }
  }
}
</style>
