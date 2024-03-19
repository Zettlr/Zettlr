<template>
  <div id="window-controls">
    <!-- Minimise icons -->
    <div class="minimise" v-on:click="requestMinimise">
      <template v-if="props.platform === 'win32'">
        <!-- Windows -->
        <svg x="0px" y="0px" viewBox="0 0 10 1">
          <rect width="10" height="1"></rect>
        </svg>
      </template>
      <template v-else-if="props.platform === 'linux'">
        <!-- Linux -->
        <svg x="0px" y="0px" viewBox="0 0 10 2">
          <rect width="10" height="2"></rect>
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
      <template v-else-if="props.platform === 'win32' && !isMaximised">
        <!-- Windows (maximise) -->
        <svg
          class="fullscreen-svg" x="0px" y="0px"
          viewBox="0 0 10 10"
        >
          <path d="M 0 0 L 0 10 L 10 10 L 10 0 L 0 0 z M 1 1 L 9 1 L 9 9 L 1 9 L 1 1 z " />
        </svg>
      </template>
      <template v-else-if="props.platform === 'linux'">
        <!-- Linux gets the same icon for both states. Hope that's okay. -->
        <svg x="0px" y="0px" viewBox="0 0 10 10">
          <rect
            fill="none" width="10" height="10"
            stroke-width="4"
          ></rect>
        </svg>
      </template>

      <!-- Maximise-icon (win32) -->
    </div>
    <div
      class="close"
      v-on:click="requestClose"
    >
      <!-- Close icon (win32) -->
      <template v-if="props.platform === 'win32'">
        <svg x="0px" y="0px" viewBox="0 0 10 10">
          <polygon points="10,1 9,0 5,4 1,0 0,1 4,5 0,9 1,10 5,6 9,10 10,9 6,5"></polygon>
        </svg>
      </template>
      <template v-else-if="props.platform === 'linux'">
        <svg x="0px" y="0px" viewBox="0 0 10 10">
          <line
            x1="0" y1="0" x2="10"
            y2="10" stroke-width="2"
          />
          <line
            x1="10" y1="0" x2="0"
            y2="10" stroke-width="2"
          />
        </svg>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
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
import { onMounted, ref } from 'vue'

const ipcRenderer = window.ipc

const props = defineProps<{ platform?: typeof process.platform }>()

const isMaximised = ref<boolean>(false)

onMounted(() => {
  // Sometimes, the main process fires back a message with regard to the status
  ipcRenderer.on('window-controls', (event, message) => {
    const { command } = message
    // win-size-changed is emitted by main, whereas get-maximised-status is
    // sent from this module to initially get the status
    if (command === 'get-maximised-status') {
      const { payload } = message
      // Reflect the window status (payload is true if the window is maximised)
      isMaximised.value = payload
    }
  })

  // Get the initial windowed/maximised-status
  ipcRenderer.send('window-controls', { command: 'get-maximised-status' })
})

function requestMinimise (): void {
  ipcRenderer.send('window-controls', { command: 'win-minimise' })
}

function requestResize (): void {
  ipcRenderer.send('window-controls', { command: 'win-maximise' })
}

function requestClose (): void {
  ipcRenderer.send('window-controls', { command: 'win-close' })
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
    -webkit-app-region: no-drag;
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2001; // NOTE: Must be 1 higher than the menuBar component

    .minimise, .resize, .close {
      float: left;
      width: 45px;
      height: 30px;
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
    .minimise, .resize, .close {
      transition: background-color .2s;

      &:hover {
        background-color: rgb(200, 200, 200);
      }
    }
  }

  &.dark {
    div#window-controls {
      .minimise, .resize, .close {
        &:hover {
          background-color: rgb(80, 80, 80);
        }
      }
    }
  }
}
</style>
