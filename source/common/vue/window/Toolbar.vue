<template>
  <div
    id="toolbar"
    role="toolbar"
    v-bind:style="{ top: marginTop }"
    v-on:dblclick="$emit('dblclick')"
  >
    <template v-for="(item, idx) in controls">
      <ButtonControl
        v-if="item.type === 'button'"
        v-bind:key="idx"
        v-bind:control="item"
        v-bind:show-label="showLabels"
        v-on:click="$emit('click', item.id)"
      ></ButtonControl>
      <ToggleControl
        v-if="item.type === 'toggle'"
        v-bind:key="idx"
        v-bind:control="item"
        v-bind:show-label="showLabels"
        v-on:toggle="$emit('toggle', { id: item.id, state: $event })"
      ></ToggleControl>
      <ThreeWayToggle
        v-if="item.type === 'three-way-toggle'"
        v-bind:key="idx"
        v-bind:control="item"
        v-bind:show-labels="showLabels"
        v-on:toggle="$emit('toggle', { id: item.id, state: $event })"
      >
      </ThreeWayToggle>
      <RingControl
        v-if="item.type === 'ring'"
        v-bind:key="idx"
        v-bind:control="item"
        v-bind:show-label="showLabels"
        v-bind:progress-percent="item.progressPercent"
        v-on:click="$emit('click', item.id)"
      ></RingControl>
      <SearchControl
        v-if="item.type === 'search'"
        v-bind:key="idx"
        v-bind:control="item"
        v-bind:show-label="showLabels"
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
import ThreeWayToggle from './toolbar-controls/ThreeWayToggle'
import SearchControl from './toolbar-controls/Search.vue'
import SpacerControl from './toolbar-controls/Spacer.vue'
import TextControl from './toolbar-controls/Text.vue'

export default {
  name: 'Toolbar',
  components: {
    ButtonControl,
    RingControl,
    ToggleControl,
    ThreeWayToggle,
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
    },
    showLabels: {
      type: Boolean,
      default: false
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

  div.spacer {
    .size-1x { flex-grow: 1; }
    .size-3x { flex-grow: 3; }
    .size-5x { flex-grow: 5; }
  }

  div.toolbar-group {
    text-align: center;

    span.toolbar-label {
      display: block;
      font-size: 10px;
      text-align: center;
    }
  }
}

body.darwin {
  @toolbar-height: 40px;
  @font-size: 14px;

  div#toolbar {
    // On macOS, there is no titlebar, and as such we need to make the toolbar draggable
    -webkit-app-region: drag;
    & > * { -webkit-app-region: no-drag; }

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

body.win32 {
  @toolbar-height: 40px;
  @font-size: 14px;

  div#toolbar {
    height: @toolbar-height;
    font-size: @font-size;
    background-color: rgb(245, 245, 245);
    color: rgb(100, 100, 100);

    button {
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

      button{
        color: white;

        &:hover {
          background-color: rgb(60, 60, 60,);
        }
      }

      &:window-inactive {
        background-color: rgb(34, 34, 34);
        color: rgb(100, 100, 100);
      }
    }
  }
}
</style>
