<template>
  <div class="system-tablist" role="tablist">
    <button
      v-for="tab, idx in tabs"
      v-bind:key="idx"
      role="tab"
      v-bind:aria-label="tab.label"
      v-bind:data-target="tab.target"
      v-bind:class="{
        'system-tab': true,
        'active': currentTab === tab.id
      }"
      v-bind:title="tab.label"
      v-on:click="$emit('tab', tab.id)"
    >
      <!-- Display either an icon, or the title -->
      <clr-icon
        v-if="tab.icon !== undefined"
        v-bind:shape="tab.icon"
        role="presentation"
      ></clr-icon>
      <template v-else>
        {{ tab.label }}
      </template>
    </button>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tabs component
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component resembles a "regular" tabbar (neither the
 *                  window-wide one nor the somewhat bigger document tabs).
 *
 * END HEADER
 */

import { TabbarControl } from '@dts/renderer/window'
import { defineComponent, PropType } from 'vue'

export default defineComponent({
  name: 'TabBar',
  props: {
    // Each tab must have the following properties:
    // * icon (matches clr-icons, if not set, title will become the content)
    // * id (a unique string)
    // * target (a CSS ID string)
    // * label (a title string)
    tabs: {
      type: Array as PropType<TabbarControl[]>,
      required: true
    },
    // This must be equal to an ID from the tabs array
    currentTab: {
      type: String,
      default: ''
    }
  },
  emits: ['tab']
})
</script>

<style lang="less">
body .system-tablist {
  display: flex;
  justify-content: space-evenly;

  .system-tab {
    flex-grow: 1;
    text-align: center;
  }
}

body.darwin {
  .system-tablist {
    justify-content: space-around;
    padding: 10px 20px 0px 20px;

    .system-tab {
      &.active { background-color: rgb(230, 230, 230); }

      &:not(:first-child) {
        border-top-left-radius: 0px;
        border-bottom-left-radius: 0px;
        border-left: 0px; // We only want 1px border between the buttons
      }

      &:not(:last-child) {
        border-top-right-radius: 0px;
        border-bottom-right-radius: 0px;
      }
    }
  }

  &.dark {
    .system-tablist .system-tab {
      &.active { background-color: rgb(120, 120, 120); }

      &:not(:last-child) {
        // We need a border here
        border-right: 1px solid rgb(120, 120, 120);
      }
    }
  }
}

body.win32 {
  .system-tablist .system-tab.active {
    background-color: rgb(230, 230, 230);
  }

  &.dark .system-tablist .system-tab.active {
    background-color: rgb(120, 120, 120);
  }
}
</style>
