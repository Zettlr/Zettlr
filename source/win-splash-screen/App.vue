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

<script lang="ts">
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

import { defineComponent } from 'vue'
import ProgressControl from '@common/vue/form/elements/Progress.vue'
import { trans } from '@common/i18n-renderer'

const ipcRenderer = window.ipc

export default defineComponent({
  components: {
    ProgressControl
  },
  data: function () {
    return {
      stepLabel: trans('Loading…'),
      stepPercentage: 0
    }
  },
  computed: {
  },
  mounted () {
    ipcRenderer.on('step-update', (event, { currentStepMessage, currentStepPercentage }) => {
      console.log('Received new step instructions', currentStepMessage, currentStepPercentage)
      this.stepLabel = currentStepMessage
      // Account for potential ratios instead of percentages
      this.stepPercentage = currentStepPercentage > 1 ? currentStepPercentage : Math.round(currentStepPercentage * 100)
    })
  },
  methods: {
  }
})
</script>

<style lang="less">
#splash-screen-wrapper {
  text-align: center;
  width: 500px;
  margin: 20px auto;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: #333;
}
</style>
