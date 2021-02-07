<template>
  <div
    id="toolbar"
    v-bind:style="{ top: marginTop }"
  >
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
  name: 'Toolbar',
  components: {
    ButtonControl,
    ToggleControl,
    SearchControl,
    SpacerControl,
    TextControl
  },
  props: {
    marginTop: {
      type: String,
      default: '0px'
    },
    controls: {
      type: Array,
      default: function () { return [] }
    }
  },
  computed: {
  }
}
</script>

<style lang="less">
#toolbar {
  width: 100%;
  height: 40px;
  padding: 0px 10px;
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: space-around;

  div.spacer {
    .size-1x { flex-grow: 1; }
    .size-3x { flex-grow: 3; }
    .size-5x { flex-grow: 5; }
  }
}
body.darwin {
  @toolbar-height: 40px;
  @font-size: 14px;

  div#toolbar {
    height: @toolbar-height;
    font-size: @font-size;
    background-color: rgb(245, 245, 245);

    input[type="search"] {
      border-radius: 4px;
      background-color: rgb(230, 230, 230);
      border: 1px solid rgb(190, 190, 190);
      padding: 2px 6px;
      margin: 0 4px;
    }

    button {
      border-radius: 4px;
      background-color: transparent;
      color: rgb(100, 100, 100);
      border: none;
      padding: 4px 8px;
      margin: (@toolbar-height / 2 - @font-size / 2) 4px;

      &:hover {
        background-color: rgb(230, 230, 230);
      }
    }
  }

  &.dark {
    // Dark styling
    div#toolbar {
      background-color: rgb(52, 52, 52);
      color: rgb(172, 172, 172);

      &:window-inactive {
        background-color: rgb(34, 34, 34);
        color: rgb(100, 100, 100);
      }
    }
  }
}
</style>
