<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="'Defaults'"
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
      style="height: 100%;"
    >
      <!-- Export defaults -->
      <Defaults
        v-if="tabs[currentTab].id === 'tab-export-control'"
        v-bind:which="'export'"
      ></Defaults>
      <!-- Import defaults -->
      <Defaults
        v-if="tabs[currentTab].id === 'tab-import-control'"
        v-bind:which="'import'"
      ></Defaults>
      <!-- Custom CSS -->
      <CustomCSS
        v-else-if="tabs[currentTab].id === 'tab-custom-css-control'"
      ></CustomCSS>
      <!-- Snippets Editor -->
      <SnippetsTab
        v-else-if="tabs[currentTab].id === 'tab-snippets-control'"
      ></SnippetsTab>
    </div>
  </WindowChrome>
</template>

<script lang="ts">
import WindowChrome from '@common/vue/window/Chrome.vue'
import Defaults from './Defaults.vue'
import CustomCSS from './CustomCSS.vue'
import SnippetsTab from './SnippetsTab.vue'
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'
import { WindowTab } from '@dts/renderer/window'

export default defineComponent({
  components: {
    WindowChrome,
    Defaults,
    CustomCSS,
    SnippetsTab
  },
  data: function () {
    return {
      tabs: [
        {
          label: trans('dialog.defaults.exporting_title'),
          controls: 'tab-export',
          id: 'tab-export-control',
          icon: 'export'
        },
        {
          label: trans('dialog.defaults.importing_title'),
          controls: 'tab-import',
          id: 'tab-import-control',
          icon: 'import'
        },
        {
          label: trans('dialog.custom_css.title'),
          controls: 'tab-custom-css',
          id: 'tab-custom-css-control',
          icon: 'code'
        },
        {
          label: trans('dialog.snippets.title'),
          controls: 'tab-snippets',
          id: 'tab-snippets-control',
          icon: 'pinboard'
        }
      ] as WindowTab[],
      currentTab: 0
    }
  },
  computed: {
    windowTitle: function (): string {
      if (document.body.classList.contains('darwin')) {
        return this.tabs[this.currentTab].label
      } else {
        return trans('gui.assets_man.win_title')
      }
    }
  }
})
</script>

<style lang="less">
//
</style>
