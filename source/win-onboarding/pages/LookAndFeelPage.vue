<template>
  <h1>{{ pageHeading }}</h1>

  <p>
    {{ darkModeLabel }}
  </p>

  <p class="box">
    <SwitchControl
      v-model="darkMode"
      v-bind:label="darkModeControlLabel"
      label-position="before"
      name="dark-mode"
      v-bind:stretch="true"
    ></SwitchControl>
  </p>

  <p>
    {{ darkModeScheduleLabel }}
  </p>

  <p class="box">
    <RadioControl
      v-model="darkModeSchedule"
      name="dark-mode-schedule"
      v-bind:options="darkModeScheduleOptions"
    ></RadioControl>
  </p>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import RadioControl from 'source/common/vue/form/elements/RadioControl.vue'
import SwitchControl from 'source/common/vue/form/elements/SwitchControl.vue'
import { ref, watch } from 'vue'

const pageHeading = trans('Look and Feel')
const darkModeLabel = trans('Zettlr supports both light and dark mode. You can turn it on manually here.')
const darkModeControlLabel = trans('Activate dark mode')
const darkModeScheduleLabel = trans('Most users will wish to schedule when the app will enter the dark mode.')

const darkModeScheduleOptions = {
  off: trans('Do not automatically change modes'),
  system: trans('Follow the operating system'),
  schedule: trans('Manually schedule')
}

const darkMode = ref(Boolean(window.config.get('darkMode')))
const darkModeSchedule = ref(window.config.get('autoDarkMode') as 'off'|'system'|'schedule')
const leaveRunningInNotificationArea = ref(Boolean(window.config.get('system.leaveAppRunning')))

watch(darkMode, () => {
  window.config.set('darkMode', darkMode.value)
})

watch(darkModeSchedule, () => {
  window.config.set('autoDarkMode', darkModeSchedule.value)
})

watch(leaveRunningInNotificationArea, () => {
  window.config.set('system.leaveAppRunning', leaveRunningInNotificationArea.value)
})

</script>

<style lang="less">
</style>
