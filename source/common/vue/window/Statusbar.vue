<template>
  <div id="statusbar">
    <template v-for="(item, idx) in controls">
      <ButtonControl
        v-if="item.type === 'button'"
        v-bind:key="idx"
        v-bind:control="item"
        v-on:click="$emit('click', item.id)"
      ></ButtonControl>
      <ToggleControl
        v-if="item.type === 'toggle'"
        v-bind:key="idx"
        v-bind:control="item"
        v-on:toggle="$emit('toggle', item.id)"
      ></ToggleControl>
      <SearchControl
        v-if="item.type === 'search'"
        v-bind:key="idx"
        v-bind:control="item"
        v-on:input="$emit('search', $event)"
      ></SearchControl>
      <SpacerControl
        v-if="item.type === 'spacer'"
        v-bind:key="idx"
        v-bind:control="item"
      ></SpacerControl>
      <TextControl
        v-if="item.type === 'text'"
        v-bind:key="idx"
        v-bind:control="item"
      ></TextControl>
    </template>
  </div>
</template>

<script>
import ButtonControl from './toolbar-controls/Button.vue'
import ToggleControl from './toolbar-controls/Toggle.vue'
import SearchControl from './toolbar-controls/Search.vue'
import SpacerControl from './toolbar-controls/Spacer.vue'
import TextControl from './toolbar-controls/Text.vue'

export default {
  name: 'Statusbar',
  components: {
    ButtonControl,
    ToggleControl,
    SearchControl,
    SpacerControl,
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
      background-image: linear-gradient(transparent, #00000020);
      color: white;
    }
  }
}
</style>
