<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="'Defaults'"
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
      <SplitView
        v-bind:initial-size-percent="[ 20, 80 ]"
        v-bind:minimum-size-percent="20"
        v-bind:split="'horizontal'"
        v-bind:initial-total-width="$el.getBoundingClientRect().width"
      >
        <template #view1>
          <SelectableList
            v-bind:items="listItems"
            v-bind:selected-item="currentItem"
            v-on:select="currentItem = $event"
          ></SelectableList>
        </template>
        <template #view2>
          Right side
        </template>
      </SplitView>
    </div>
  </WindowChrome>
</template>

<script>
import WindowChrome from '../common/vue/window/Chrome'
import SplitView from '../common/vue/window/SplitView'
import SelectableList from './SelectableList'

export default {
  name: 'DefaultsApp',
  components: {
    WindowChrome,
    SplitView,
    SelectableList
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
        }
      ],
      currentTab: 0,
      currentItem: 0
    }
  },
  computed: {
    windowTitle: function () {
      if (document.body.classList.contains('darwin')) {
        return this.tabs[this.currentTab].label
      } else {
        return 'Defaults Preferences'
      }
    },
    listItems: function () {
      return [
        'HTML',
        'PDF',
        'Word',
        'OpenDocument Text',
        'RTF',
        'Plain Text',
        'LaTeX',
        'Orgmode',
        'Reveal.js'
      ]
    }
  }
}
</script>

<style lang="less">
//
</style>
