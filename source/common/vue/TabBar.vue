<template>
  <div class="system-tablist" role="tablist">
    <button
      v-for="tab, idx in props.tabs"
      v-bind:key="idx"
      role="tab"
      v-bind:aria-label="tab.label"
      v-bind:data-target="tab.target"
      v-bind:class="{
        'system-tab': true,
        active: props.currentTab === tab.id
      }"
      v-bind:title="tab.label"
      v-on:click="emit('tab', tab.id)"
    >
      <!-- Display either an icon, or the title -->
      <cds-icon
        v-if="tab.icon !== undefined"
        v-bind:shape="tab.icon"
        role="presentation"
      ></cds-icon>
      <template v-else>
        {{ tab.label }}
      </template>
    </button>
  </div>
</template>

<script setup lang="ts">
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

/**
 * This interface represents a Tabbar control
 */
export interface TabbarControl {
  /**
   * This should match a Clarity icon shape
   */
  icon?: string
  /**
   * A unique ID for the tab
   */
  id: string
  /**
   * The target ID of whichever tab this represents (for a11y purposes)
   */
  target: string
  /**
   * A label, may be displayed.
   */
  label: string
}

const props = defineProps<{
  tabs: TabbarControl[]
  currentTab: string
}>()

const emit = defineEmits<(e: 'tab', value: string) => void>()
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
