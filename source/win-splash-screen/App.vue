<template>
  <!-- Barebones window that only includes limited things -->
  <div id="splash-screen-wrapper">
    <div id="logo">
      <img src="../../resources/icons/png/128x128.png">
    </div>
    <div id="info">
      <h1>Zettlr</h1>
      <p>Your One-Stop Publication Workbench</p>
      <p>&copy; 2017&ndash;{{ year }} Hendrik Erz</p>
    </div>
    <div id="progress">
      <ProgressControl
        v-bind:max="100"
        v-bind:min="0"
        v-bind:value="stepPercentage"
        v-bind:interruptible="false"
      ></ProgressControl>
      <p>
        {{ stepLabel }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Splash Screen entry
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays the splash screen
 *
 * END HEADER
 */

import { ref } from 'vue'
import ProgressControl from '@common/vue/form/elements/ProgressControl.vue'
import { trans } from '@common/i18n-renderer'

const ipcRenderer = window.ipc

const stepLabel = ref(trans('Loading…'))
const stepPercentage = ref(0)
const year = (new Date()).getFullYear()

ipcRenderer.on('step-update', (event, { currentStepMessage, currentStepPercentage }) => {
  stepLabel.value = currentStepMessage
  // Account for potential ratios instead of percentages
  stepPercentage.value = currentStepPercentage > 1 ? currentStepPercentage : Math.round(currentStepPercentage * 100)
})
</script>

<style lang="less">

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: #333;
  // The entire window should be draggable so that users can move it to the side
  // if booting the app takes an excruciating amount of time
  -webkit-app-region: drag;

  &.dark {
    background-color: #333;
    color: white;
  }
}

#splash-screen-wrapper {
  text-align: center;
  width: 100vw;
  height: 100vh;
  display: grid;
  padding: 20px;
  grid-template-areas:
    "logo info"
    "progress progress";
  grid-template-columns: 150px auto;
  grid-template-rows: 150px auto;
  align-content: center;
  align-items: center;
  justify-content: center;

  #logo { grid-area: logo; }
  #info {
    grid-area: info;
    text-align: left;

    h1 {
      font-size: 48px;
      font-weight: 500;
      margin-bottom: 10px;
    }

    p {
      margin-bottom: 10px;
    }
  }
  #progress { grid-area: progress; }
}
</style>
