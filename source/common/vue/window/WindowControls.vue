<template>
  <div id="window-controls">
    <!-- Minimise icons -->
    <div class="minimise" v-on:click="requestMinimise">
      <template v-if="platform === 'win32'">
        <!-- Windows -->
        <svg x="0px" y="0px" viewBox="0 0 10 1">
          <rect width="10" height="1"></rect>
        </svg>
      </template>
      <template v-else-if="platform === 'linux'">
        <!-- Linux -->
        <svg x="0px" y="0px" viewBox="0 0 16 16">
          <path d="m 4 10.007812 h 8 v 1.988282 h -8 z m 0 0" />
        </svg>
      </template>
    </div>
    <!-- Maximise/unmaximise icons -->
    <div class="resize" v-on:click="requestResize">
      <!-- Windows (unmaximise) -->
      <template v-if="platform === 'win32' && isMaximised">
        <svg
          class="maximise-svg" x="0px" y="0px"
          viewBox="0 0 10 10"
        >
          <mask id="Mask">
            <rect fill="#FFFFFF" width="10" height="10"></rect>
            <path fill="#000000" d="M 3 1 L 9 1 L 9 7 L 8 7 L 8 2 L 3 2 L 3 1 z" />
            <path fill="#000000" d="M 1 3 L 7 3 L 7 9 L 1 9 L 1 3 z" />
          </mask>
          <path d="M 2 0 L 10 0 L 10 8 L 8 8 L 8 10 L 0 10 L 0 2 L 2 2 L 2 0 z" mask="url(#Mask)" />
        </svg>
      </template>
      <template v-else-if="platform === 'win32' && !isMaximised">
        <!-- Windows (maximise) -->
        <svg
          class="fullscreen-svg" x="0px" y="0px"
          viewBox="0 0 10 10"
        >
          <path d="M 0 0 L 0 10 L 10 10 L 10 0 L 0 0 z M 1 1 L 9 1 L 9 9 L 1 9 L 1 1 z " />
        </svg>
      </template>
      <template v-else-if="platform === 'linux' && isMaximised">
        <!-- Linux (unmaximise) -->
        <svg viewBox="0 0 16 16">
          <path d="m 4.988281 4.992188 v 6.011718 h 6.011719 v -6.011718 z m 2 2 h 2.011719 v 2.011718 h -2.011719 z m 0 0" />
        </svg>
      </template>
      <template v-else-if="platform === 'linux' && !isMaximised">
        <!-- Linux (maximise) -->
        <svg viewBox="0 0 16 16">
          <path d="m 3.988281 3.992188 v 8.011718 h 8.011719 v -8.011718 z m 2 2 h 4.011719 v 4.011718 h -4.011719 z m 0 0" />
        </svg>
      </template>

      <!-- Maximise-icon (win32) -->
    </div>
    <div
      class="close"
      v-on:click="requestClose"
    >
      <!-- Close icon (win32) -->
      <template v-if="platform === 'win32'">
        <svg x="0px" y="0px" viewBox="0 0 10 10">
          <polygon points="10,1 9,0 5,4 1,0 0,1 4,5 0,9 1,10 5,6 9,10 10,9 6,5"></polygon>
        </svg>
      </template>
      <template v-else-if="platform === 'linux'">
        <svg viewBox="0 0 16 16">
          <path d="m 4 4 h 1 h 0.03125 c 0.253906 0.011719 0.511719 0.128906 0.6875 0.3125 l 2.28125 2.28125 l 2.3125 -2.28125 c 0.265625 -0.230469 0.445312 -0.304688 0.6875 -0.3125 h 1 v 1 c 0 0.285156 -0.035156 0.550781 -0.25 0.75 l -2.28125 2.28125 l 2.25 2.25 c 0.1875 0.1875 0.28125 0.453125 0.28125 0.71875 v 1 h -1 c -0.265625 0 -0.53125 -0.09375 -0.71875 -0.28125 l -2.28125 -2.28125 l -2.28125 2.28125 c -0.1875 0.1875 -0.453125 0.28125 -0.71875 0.28125 h -1 v -1 c 0 -0.265625 0.09375 -0.53125 0.28125 -0.71875 l 2.28125 -2.25 l -2.28125 -2.28125 c -0.210938 -0.195312 -0.304688 -0.46875 -0.28125 -0.75 z m 0 0" />
        </svg>
      </template>
    </div>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        WindowControls
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component renders custom-styled window controls (close,
 *                  maximise, minimise). NOTE that this component is not rendered
 *                  on macOS, since we can use the hiddenInset traffic lights.
 *
 * END HEADER
 */

const ipcRenderer = window.ipc

export default {
  name: 'WindowControls',
  props: {
    platform: {
      type: String,
      default: process.platform
    }
  },
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
body {
  div#window-controls {
    cursor: default;
    grid-area: controls;
    -webkit-app-region: drag;
    & > * { -webkit-app-region: no-drag; }

    .minimise, .resize, .close {
      float: left;
      width: 45px;
      height: 31px;
      margin: 0 0 0 1px;
      text-align: center;
      line-height: 29px;
      fill: #666666;
      stroke: #666666;

      svg {
        width: 10px;
        height: 10px;
        shape-rendering: crispEdges;
      }
    }
  }

  &.dark {
    div#window-controls {
      .minimise, .resize, .close {
        fill: #ffffff;
        stroke: #ffffff;
      }
    }
  }
}

body.win32 div#window-controls {
  background-color: var(--system-accent-color, --c-primary);
  color: var(--system-accent-color-contrast, white);

  .minimise, .resize, .close {
    // Wherever the controls are shown, they will be shown on top of the system accent colour,
    // so we must always use the accompanying contrast colour for the window controls.
    fill: var(--system-accent-color-contrast, white);
    stroke: none;
    transition: background-color .2s;

    &:hover {
      background-color: rgba(255, 255, 255, 0.5);
    }
  }

  .close {
    svg polygon { transition: fill .2s; }

    &:hover {
      background-color: rgba(232, 17, 35, 0.9);
      svg polygon { fill: #ffffff; }
    }
  }
}

body.linux {
  div#window-controls {
    padding: 9px;
    display: flex;
    flex-direction: row;
    align-items: center;

    .minimise, .resize, .close {
      width: auto;
      height: auto;
      margin-left: 6px;
      transition: background-color .2s;

      &:hover {
        background-color: var(--view-hover-color);
      }

      fill: var(--headerbar-fg-color);
      stroke: none;
      padding: 4px;
      border-radius: 9999px;

      svg {
        display: block;
        width: 16px;
        height: 16px;
        shape-rendering: auto;
      }

      background-color: var(--view-selected-color);
      &:hover {
        background-color: var(--view-selected-hover-color);
      }
    }
  }
}
</style>
