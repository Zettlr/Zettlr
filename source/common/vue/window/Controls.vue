<template>
  <div id="window-controls">
    <div
      class="minimise"
      v-on:click="requestMinimise"
    >
      <svg
        x="0px" y="0px"
        viewBox="0 0 10 1"
      >
        <rect width="10" height="1"></rect>
      </svg>
    </div>
    <div
      class="resize"
      v-on:click="requestResize"
    >
      <!-- Not fullscreen icon -->
      <svg
        v-if="isMaximised"
        class="maximise-svg"
        x="0px" y="0px"
        viewBox="0 0 10 10"
      >
        <mask id="Mask">
          <rect fill="#FFFFFF" width="10" height="10"></rect>
          <path fill="#000000" d="M 3 1 L 9 1 L 9 7 L 8 7 L 8 2 L 3 2 L 3 1 z" />
          <path fill="#000000" d="M 1 3 L 7 3 L 7 9 L 1 9 L 1 3 z" />
        </mask>
        <path d="M 2 0 L 10 0 L 10 8 L 8 8 L 8 10 L 0 10 L 0 2 L 2 2 L 2 0 z" mask="url(#Mask)" />
      </svg>

      <!-- Fullscreen icon -->
      <svg
        v-else
        class="fullscreen-svg"
        x="0px" y="0px"
        viewBox="0 0 10 10"
      >
        <path d="M 0 0 L 0 10 L 10 10 L 10 0 L 0 0 z M 1 1 L 9 1 L 9 9 L 1 9 L 1 1 z " />
      </svg>
    </div>
    <div
      class="close"
      v-on:click="requestClose"
    >
      <svg x="0px" y="0px" viewBox="0 0 10 10">
        <polygon points="10,1 9,0 5,4 1,0 0,1 4,5 0,9 1,10 5,6 9,10 10,9 6,5"></polygon>
      </svg>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  name: 'WindowControls',
  data: function () {
    return {
      isMaximised: false
    }
  },
  mounted: function () {
    // Sometimes, the main process fires back a message with regard to the status
    ipcRenderer.on('window-controls', (event, message) => {
      const { command } = message
      // win-size-changed is emitted by main, whereas get-maximised-status is
      // sent from this module to initially get the status
      if (command === 'get-maximised-status') {
        const { payload } = message
        // Reflect the window status (payload is true if the window is maximised)
        this.isMaximised = payload
      }
    })

    // Get the initial windowed/maximised-status
    ipcRenderer.send('window-controls', { command: 'get-maximised-status' })
  },
  methods: {
    requestMinimise: function () {
      ipcRenderer.send('window-controls', { command: 'win-minimise' })
    },
    requestResize: function () {
      ipcRenderer.send('window-controls', { command: 'win-maximise' })
    },
    requestClose: function () {
      ipcRenderer.send('window-controls', { command: 'win-close' })
    }
  }
}
</script>

<style lang="less">
/**
 * This file contains the window controls for Linux and Windows packages. There
 * are none for macOS, as we can make use of the hiddenInset window style to
 * display the traffic lights even with no other chrome around the window.
 */

// Hide all controls initially
div#window-controls {
  cursor: default;
  -webkit-app-region: no-drag;
  position: absolute;
  top: 0;
  right: 0;

  .minimise, .resize, .close {
    float: left;
    width: 45px;
    height: 30px;
    margin: 0 0 0 1px;
    text-align: center;
    line-height: 29px;
    transition: background-color .2s;
    // Wherever the controls are shown, they will be shown on top of the system accent colour, so we must
    // always use the accompanying contrast colour for the window controls.
    fill: var(--system-accent-color-contrast, white);

    svg {
      width: 10px;
      height: 10px;
      shape-rendering: crispEdges;
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.5);
    }
  }

  .close {
    svg polygon {
      transition: fill .2s;
    }

    &:hover {
      background-color: rgba(232, 17, 35, 0.9);
      svg polygon { fill: #ffffff; }
    }
  }
}
</style>
