<template>
  <div id="statusbar">
    <template v-for="(item, idx) in controls">
      <ButtonControl
        v-if="item.type === 'button'"
        v-bind:key="idx"
        v-bind:label="item.label"
        v-bind:icon="item.icon"
        v-bind:name="item.name"
        v-bind:disabled="item.disabled"
        v-bind:inline="true"
        v-bind:primary="item.primary"
        v-on:click="$emit('click', item.id)"
      ></ButtonControl>
      <TextControl
        v-if="item.type === 'text'"
        v-bind:key="idx"
        v-bind:control="item"
      ></TextControl>
    </template>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Statusbar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a statusbar at the bottom of a window.
 *
 * END HEADER
 */

// Regular form button, but a static text display
import ButtonControl from '../form/elements/Button.vue'
import TextControl from './toolbar-controls/Text.vue'

export default {
  name: 'Statusbar',
  components: {
    ButtonControl,
    TextControl
  },
  props: {
    controls: {
      type: Array,
      default: function () { return [] }
    }
  },
  data: function () {
    return {
    }
  }
}
</script>

<style lang="less">
div#statusbar {
  height: 60px;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0px 20px;
  line-height: 60px;
  background-color: rgb(235, 235, 235); // TODO: Enable the status bar to be "invisible" and visible
  display: flex;
    justify-content: space-between;
    align-items: center;

  button {
    margin-right: 5px; // Increase spacing a little bit here
    &.primary {
      background-color: var(--system-accent-color, --c-primary);
      border-color: var(--system-accent-color, --c-primary);
      background-image: linear-gradient(transparent, #00000020);
      color: var(--system-accent-color-contrast, white);
    }
  }
}

body {
  &.dark {
    div#statusbar {
      background-color: rgb(30, 30, 30);
    }
  }
}
</style>
