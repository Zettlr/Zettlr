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
      <ContributorsTab v-else-if="currentTab === 3">
      </ContributorsTab>
      <LicenseTab v-else-if="currentTab === 4">
      </LicenseTab>
      <FontLicenseTab v-else-if="currentTab === 5">
      </FontLicenseTab>
      <DebugTab v-else-if="currentTab === 6">
      </DebugTab>
    </div>
  </WindowChrome>
</template>

<script lang="ts">
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

import WindowChrome from '@common/vue/window/Chrome.vue'
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

// Import the tabs
import GeneralTab from './General-Tab.vue'
import ProjectsTab from './Projects-Tab.vue'
import SponsorsTab from './Sponsors-Tab.vue'
import ContributorsTab from './Contributors-Tab.vue'
import LicenseTab from './License-Tab.vue'
import FontLicenseTab from './Font-License-Tab.vue'
import DebugTab from './Debug-Tab.vue'
import { WindowTab } from '@dts/renderer/window'

export default defineComponent({
  components: {
    WindowChrome,
    GeneralTab,
    ProjectsTab,
    SponsorsTab,
    ContributorsTab,
    LicenseTab,
    FontLicenseTab,
    DebugTab
  },
  data: function () {
    return {
      currentTab: 0,
      tabs: [
        {
          label: trans('dialog.about.title'),
          controls: 'tab-general',
          id: 'tab-general-control',
          icon: 'info-standard'
        },
        {
          label: trans('dialog.about.projects'),
          controls: 'tab-projects',
          id: 'tab-projects-control',
          icon: 'applications'
        },
        {
          label: trans('dialog.about.sponsors'),
          controls: 'tab-sponsors',
          id: 'tab-sponsors-control',
          icon: 'star'
        },
        {
          label: trans('dialog.about.contributors'),
          controls: 'tab-contributors',
          id: 'tab-contributors-control',
          icon: 'users'
        },
        {
          label: trans('dialog.about.license'),
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
      ] as WindowTab[]
    }
  },
  computed: {
    windowTitle: function (): string {
      if (process.platform === 'darwin') {
        return this.tabs[this.currentTab].label
      } else {
        return trans('dialog.about.title') + ' ' + (global as any).config.get('version')
      }
    }
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
