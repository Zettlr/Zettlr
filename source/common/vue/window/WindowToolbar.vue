<template>
  <div
    id="toolbar"
    role="toolbar"
    v-bind:style="{ top: marginTop }"
    v-bind:class="{
      'has-rtl-traffic-lights': hasRTLTrafficLights
    }"
    v-on:dblclick="handleDoubleClick"
    v-on:mousedown="$event.preventDefault()"
  >
    <template v-for="(item, idx) in controls">
      <ButtonControl
        v-if="item.type === 'button' && item.visible !== false"
        v-bind:key="idx"
        v-bind:control="item"
        v-bind:show-label="showLabels"
        v-on:click="$emit('click', item.id)"
      ></ButtonControl>
      <ToggleControl
        v-if="item.type === 'toggle' && item.visible !== false"
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
        v-if="item.type === 'ring' && item.visible !== false"
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
        v-on:update:modelValue="$emit('search', $event)"
      ></SearchControl>
      <SpacerControl
        v-if="item.type === 'spacer'"
        v-bind:key="idx"
        v-bind:control="item"
      ></SpacerControl>
      <TextControl
        v-if="item.type === 'text' && item.visible !== false"
        v-bind:key="idx"
        v-bind:control="item"
        v-on:click="$emit('click', item.id)"
      ></TextControl>
    </template>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Toolbar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a window-wide toolbar.
 *
 * END HEADER
 */

import ButtonControl from './toolbar-controls/Button.vue'
import RingControl from './toolbar-controls/RingProgressButton.vue'
import ToggleControl from './toolbar-controls/Toggle.vue'
import ThreeWayToggle from './toolbar-controls/ThreeWayToggle.vue'
import SearchControl from './toolbar-controls/Search.vue'
import SpacerControl from './toolbar-controls/Spacer.vue'
import TextControl from './toolbar-controls/Text.vue'
import { defineComponent, PropType } from 'vue'
import { ToolbarControl } from '@dts/renderer/window'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'WindowToolbar',
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
      type: Array as PropType<ToolbarControl[]>,
      default: () => []
    },
    showLabels: {
      type: Boolean,
      default: false
    }
  },
  emits: [ 'click', 'dblclick', 'toggle', 'search' ],
  data: function () {
    return {
      hasRTLTrafficLights: false
    }
  },
  computed: {
  },
  mounted: function () {
    // Make sure that (on macOS) we have the correct spacing of the toolbar.
    ipcRenderer.on('window-controls', (event, message) => {
      const { command, payload } = message
      if (command === 'traffic-lights-rtl') {
        this.hasRTLTrafficLights = payload
      }
    })

    // Also send an initial request
    ipcRenderer.send('window-controls', { command: 'get-traffic-lights-rtl' })
  },
  methods: {
    /**
     * Handles a double click and emits an event if the target was the toolbar
     * or one of the spacers.
     *
     * @param   {MouseEvent}  event  The triggering mouse event
     */
    handleDoubleClick: function (event: MouseEvent) {
      // Only emit a double click event if the user double clicked on the
      // _toolbar_ or on a spacer, and not just on any button.
      const t = event.target as HTMLElement|null
      if (t === this.$el || (t !== null && t.className.includes('spacer') === true)) {
        this.$emit('dblclick')
      }
    }
  }
})
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

  button {
    // Reset the min-width from generic.less
    min-width: auto;
  }

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

    // Make space for the traffic lights, either on the left side or the right.
    &:not(.has-rtl-traffic-lights) {
      padding-left: 80px;
    }
    &.has-rtl-traffic-lights {
      padding-right: 80px;
    }

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

body.linux {
  @toolbar-height: 40px;
  @font-size: 14px;
  @border-radius: 4px;

  div#toolbar {
    height: @toolbar-height;
    font-size: @font-size;
    background-color: rgb(245, 245, 245);
    color: rgb(100, 100, 100);

    button {
      background-color: transparent;
      border: 1px solid rgb(180, 180, 180);
      padding: 0px;
      border-radius: @border-radius;
      width: 35px;
      height: 25px;
      margin: 0 4px;

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
