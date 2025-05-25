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
      <DefaultsTab
        v-if="tabs[currentTab].id === 'tab-export-control'"
        v-bind:which="'export'"
      ></DefaultsTab>
      <!-- Import defaults -->
      <DefaultsTab
        v-if="tabs[currentTab].id === 'tab-import-control'"
        v-bind:which="'import'"
      ></DefaultsTab>
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

<script setup lang="ts">
import WindowChrome from '@common/vue/window/WindowChrome.vue'
import DefaultsTab from './DefaultsTab.vue'
import CustomCSS from './CustomCSS.vue'
import SnippetsTab from './SnippetsTab.vue'
import { trans } from '@common/i18n-renderer'
import { ref, computed } from 'vue'
import { type WindowTab } from '@common/vue/window/WindowTabbar.vue'

const currentTab = ref(0)
const windowTitle = computed(() => {
  if (document.body.classList.contains('darwin')) {
    return tabs[currentTab.value].label
  } else {
    return trans('Assets Manager')
  }
})

const tabs: WindowTab[] = [
  {
    label: trans('Exporting'),
    controls: 'tab-export',
    id: 'tab-export-control',
    icon: 'export'
  },
  {
    label: trans('Importing'),
    controls: 'tab-import',
    id: 'tab-import-control',
    icon: 'import'
  },
  {
    label: trans('Custom CSS'),
    controls: 'tab-custom-css',
    id: 'tab-custom-css-control',
    icon: 'code'
  },
  {
    label: trans('Snippets'),
    controls: 'tab-snippets',
    id: 'tab-snippets-control',
    icon: 'pinboard'
  }
]
</script>

<style lang="less">
//
</style>
