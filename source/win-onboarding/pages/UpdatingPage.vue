<template>
  <h1>{{ pageHeading }}</h1>

  <p>
    {{ updatesIntro }}
  </p>

  <p class="box">
    <SwitchControl
      v-model="checkForUpdates"
      v-bind:label="updatesLabel"
      label-position="before"
      name="check-updates"
      v-bind:stretch="true"
    ></SwitchControl>
  </p>

  <p>
    {{ betasIntro }}
  </p>

  <p class="box">
    <SwitchControl
      v-model="checkForBetas"
      v-bind:label="betasLabel"
      label-position="before"
      name="check-beta"
      v-bind:stretch="true"
    ></SwitchControl>
  </p>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import SwitchControl from 'source/common/vue/form/elements/SwitchControl.vue'
import { ref, watch } from 'vue'

const pageHeading = trans('Staying Up To Date')
const updatesIntro = trans('Zettlr will from time to time check for updates. If you installed Zettlr via a package manager (e.g., APT or Pacman, Homebrew, or winget or chocolatey), you should turn this off.')
const updatesLabel = trans('Check for Updates')
const betasIntro = trans('From time to time, we also release beta updates. The more users test these early versions, the better the app becomes.')
const betasLabel = trans('Test Beta Versions')

const checkForUpdates = ref(Boolean(window.config.get('system.checkForUpdates')))
const checkForBetas = ref(Boolean(window.config.get('checkForBeta')))

watch(checkForUpdates, () => {
  window.config.set('system.checkForUpdates', checkForUpdates.value)
})

watch(checkForBetas, () => {
  window.config.set('checkForBeta', checkForBetas.value)
})
</script>

<style lang="less">
</style>
