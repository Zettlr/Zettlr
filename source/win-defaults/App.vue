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
      <!-- Defaults tab(s): The first two NOTE: Beware if you change the order! -->
      <!-- We pass the actual tab to the component so that it knows which of the two to display -->
      <Defaults
        v-if="['tab-export-control', 'tab-import-control'].includes(tabs[currentTab].id)"
        v-bind:which="tabs[currentTab].id"
      ></Defaults>
      <CustomCSS
        v-else-if="tabs[currentTab].id === 'tab-custom-css-control'"
      ></CustomCSS>
      <Snippets
        v-else-if="tabs[currentTab].id === 'tab-snippets-control'"
      ></Snippets>
    </div>
  </WindowChrome>
</template>

<script>
import WindowChrome from '../common/vue/window/Chrome'
import Defaults from './Defaults'
import CustomCSS from './CustomCSS'
import Snippets from './Snippets'
import { trans } from '../common/i18n-renderer'

export default {
  name: 'DefaultsWindow',
  components: {
    WindowChrome,
    Defaults,
    CustomCSS,
    Snippets
  },
  data: function () {
    return {
      tabs: [
        {
          label: 'Exporting',
          controls: 'tab-export',
          id: 'tab-export-control',
          icon: 'export'
        },
        {
          label: 'Importing',
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
          label: 'Snippets',
          controls: 'tab-snippets',
          id: 'tab-snippets-control',
          icon: 'pinboard' // TODO: Up for discussion
        }
      ],
      currentTab: 0
    }
  },
  computed: {
    windowTitle: function () {
      if (document.body.classList.contains('darwin')) {
        return this.tabs[this.currentTab].label
      } else {
        return trans('gui.assets_man.win_title')
      }
    }
  }
}
</script>

<style lang="less">
//
</style>
