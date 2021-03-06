<template>
  <div
    id="toolbar"
    v-bind:style="{ top: marginTop }"
    v-on:dblclick="$emit('dblclick')"
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
      <RingControl
        v-if="item.type === 'ring'"
        v-bind:key="idx"
        v-bind:control="item"
        v-bind:progress-percent="item.progressPercent"
        v-on:click="$emit('click', item.id)"
      ></RingControl>
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
import RingControl from './toolbar-controls/RingProgressButton'
import ToggleControl from './toolbar-controls/Toggle.vue'
import SearchControl from './toolbar-controls/Search.vue'
import SpacerControl from './toolbar-controls/Spacer.vue'
import TextControl from './toolbar-controls/Text.vue'

export default {
  name: 'Toolbar',
  components: {
    ButtonControl,
    RingControl,
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
body div#toolbar {
  width: 100%;
  height: 40px;
  padding: 0px 10px;
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: space-around;
  -webkit-app-region: drag;

  & > * {
    -webkit-app-region: no-drag;
  }

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
    padding-left: 80px; // Make space for the traffic lights
    color: rgb(100, 100, 100);

    button {
      border-radius: 4px;
      background-color: transparent;
      border: none;
      padding: 4px 8px;

      &:hover {
        background-color: rgb(230, 230, 230);
      }
    }
  }

  &.dark {
    // Dark styling
    div#toolbar {
      background-color: rgb(51, 51, 51);
      color: rgb(172, 172, 172);

      button:hover {
        background-color: rgb(60, 60, 60,);
      }

      &:window-inactive {
        background-color: rgb(34, 34, 34);
        color: rgb(100, 100, 100);
      }
    }
  }
}
</style>
