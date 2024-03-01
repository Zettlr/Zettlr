<template>
  <!-- Barebones window that only includes limited things -->
  <div id="splash-screen-wrapper">
    <img src="../../resources/icons/png/256x256.png">
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
  width: 500px;
  margin: 20px auto;
}
</style>
