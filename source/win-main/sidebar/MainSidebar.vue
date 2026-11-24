<template>
  <div id="sidebar">
    <div style="padding: 10px 20px 0px 20px">
      <TabBar
        v-bind:tabs="tabs"
        v-bind:current-tab="currentTab"
        v-on:tab="setCurrentTab($event)"
      ></TabBar>
    </div>

    <!-- Now the tab containers -->
    <div id="sidebar-tab-container">
      <ToCTab
        v-show="currentTab === 'toc'"
        v-on:move-section="emit('move-section', $event)"
        v-on:jump-to-line="emit('jump-to-line', $event)"
      ></ToCTab>
      <ReferencesTab v-show="currentTab === 'references'"></ReferencesTab>
      <RelatedFilesTab v-show="currentTab === 'relatedFiles'"></RelatedFilesTab>
      <OtherFilesTab v-show="currentTab === 'attachments'"></OtherFilesTab>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Sidebar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component renders the sidebar.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import TabBar from '@common/vue/TabBar.vue'
import { computed } from 'vue'
import ToCTab from './ToCTab.vue'
import ReferencesTab from './ReferencesTab.vue'
import RelatedFilesTab from './RelatedFilesTab.vue'
import OtherFilesTab from './OtherFilesTab.vue'
import { useConfigStore } from 'source/pinia'

const configStore = useConfigStore()

const emit = defineEmits<{
  (e: 'move-section', data: { from: number, to: number }): void
  (e: 'jump-to-line', line: number): void
}>()

const currentTab = computed(() => configStore.config.window.currentSidebarTab)

const tabs = [
  {
    icon: 'indent',
    id: 'toc',
    target: 'sidebar-toc',
    label: trans('Table of contents')
  },
  {
    icon: 'book',
    id: 'references',
    target: 'sidebar-bibliography',
    label: trans('References')
  },
  {
    icon: 'file-group',
    id: 'relatedFiles',
    target: 'sidebar-related-files',
    label: trans('Related files')
  },
  {
    icon: 'paperclip',
    id: 'attachments',
    target: 'sidebar-files',
    label: trans('Other files')
  }
]

function setCurrentTab (which: string): void {
  configStore.setConfigValue('window.currentSidebarTab', which)
}
</script>

<style lang="less">
body {
  @button-margin: 5px;
  @border-radius: 5px;
  @button-size: 5px;
  @button-icon-size: 5px;

  #sidebar {
    background-color: transparent;
    height: 100%;
    width: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    #sidebar-tab-container {
      padding: 10px;
      overflow-y: auto;
    }

    #open-dir-external {
      padding: @button-margin;
      border-radius: @border-radius;
      display: inline-block;
      width: @button-size;
      height: @button-size;

      clr-icon {
        width: @button-icon-size;
        height: @button-icon-size;
      }
    }

    h1 {
      font-size: 16px;
      margin: 10px 0;
    }
  }

  &.dark {
    #sidebar {
      background-color: rgba(30, 30, 30, 1);
      color: rgb(230, 230, 230);

      div.related-files-container div.related-file:hover {
        background-color: rgb(80, 80, 80);
      }
    }
  }
}
</style>
