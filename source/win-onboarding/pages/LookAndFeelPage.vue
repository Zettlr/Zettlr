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
  <p v-if="darkModeSchedule === 'schedule'">
    {{ darkModeScheduleTimesInfo }}
  </p>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import RadioControl from 'source/common/vue/form/elements/RadioControl.vue'
import SwitchControl from 'source/common/vue/form/elements/SwitchControl.vue'
import { ref, watch } from 'vue'
import { DateTime } from 'luxon'

const pageHeading = trans('Look and Feel')
const darkModeLabel = trans('Zettlr supports both light and dark mode. You can turn it on manually here.')
const darkModeControlLabel = trans('Activate dark mode')
const darkModeScheduleLabel = trans('Do you wish to let Zettlr automatically switch to dark mode?')

const autoDarkModeStart = window.config.get('autoDarkModeStart')
const autoDarkModeEnd = window.config.get('autoDarkModeEnd')
const dmStart = DateTime.fromFormat(String(autoDarkModeStart), 'HH:mm', { locale: window.config.get('appLang') }).toLocaleString({ timeStyle: 'short' })
const dmEnd = DateTime.fromFormat(String(autoDarkModeEnd), 'HH:mm', { locale: window.config.get('appLang') }).toLocaleString({ timeStyle: 'short' })

const darkModeScheduleTimesInfo = trans('If you choose "schedule," Zettlr will turn on dark mode between %s and %s. You can adjust these times in the settings.', dmStart, dmEnd)

const darkModeScheduleOptions = {
  off: trans('Do not automatically toggle light/dark mode'),
  system: trans('Follow operating system'),
  schedule: trans('Schedule dark mode')
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
