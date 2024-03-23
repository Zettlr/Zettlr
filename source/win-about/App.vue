<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="windowTitle"
    v-bind:disable-vibrancy="true"
    v-on:tab="currentTab = $event"
  >
    <!--
      To comply with ARIA, we have to wrap the form in a tab container because
      we make use of the tabbar on the window chrome.
    -->
    <div
      v-bind:id="tabs[currentTab].controls"
      role="tabpanel"
      v-bind:aria-labelledby="tabs[currentTab].id"
    >
      <GeneralTab v-if="currentTab === 0">
      </GeneralTab>
      <ProjectsTab v-else-if="currentTab === 1">
      </ProjectsTab>
      <SponsorsTab v-else-if="currentTab === 2">
      </SponsorsTab>
      <LicenseTab v-else-if="currentTab === 3">
      </LicenseTab>
      <FontLicenseTab v-else-if="currentTab === 4">
      </FontLicenseTab>
      <DebugTab v-else-if="currentTab === 5">
      </DebugTab>
    </div>
  </WindowChrome>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        About window app
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the entry component for the About window.
 *
 * END HEADER
 */

import WindowChrome from '@common/vue/window/WindowChrome.vue'
import { trans } from '@common/i18n-renderer'
import { ref, computed } from 'vue'

// Import the tabs
import GeneralTab from './General-Tab.vue'
import ProjectsTab from './Projects-Tab.vue'
import SponsorsTab from './Sponsors-Tab.vue'
import LicenseTab from './License-Tab.vue'
import FontLicenseTab from './Font-License-Tab.vue'
import DebugTab from './Debug-Tab.vue'
import { type WindowTab } from '@common/vue/window/WindowTabbar.vue'
import { useConfigStore } from 'source/pinia'

const configStore = useConfigStore()

const currentTab = ref(0)
const tabs: WindowTab[] = [
  {
    label: trans('About Zettlr'),
    controls: 'tab-general',
    id: 'tab-general-control',
    icon: 'info-standard'
  },
  {
    label: trans('Other projects'),
    controls: 'tab-projects',
    id: 'tab-projects-control',
    icon: 'applications'
  },
  {
    label: trans('Sponsors'),
    controls: 'tab-sponsors',
    id: 'tab-sponsors-control',
    icon: 'star'
  },
  {
    label: trans('License'),
    controls: 'tab-license',
    id: 'tab-license-control',
    icon: 'cog'
  },
  {
    label: 'SIL OFL',
    controls: 'tab-font-license',
    id: 'tab-font-license-control',
    icon: 'font-size'
  },
  {
    label: 'Debug Information',
    controls: 'tab-debug',
    id: 'tab-debug-control',
    icon: 'dashboard'
  }
]

const windowTitle = computed(() => {
  if (process.platform === 'darwin') {
    return tabs[currentTab.value].label
  } else {
    return trans('About Zettlr') + ' ' + configStore.config.version
  }
})
</script>

<style lang="less">
div[role="tabpanel"] {
  padding: 10px;

  a {
    color: inherit;
  }
}
</style>
