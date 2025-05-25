<template>
  <div
    class="tab-list"
    role="tablist"
    v-bind:aria-label="label"
  >
    <button
      v-for="(tab, idx) in tabs"
      v-bind:id="tab.id"
      v-bind:key="idx"
      role="tab"
      v-bind:aria-selected="currentTab === idx" v-bind:aria-controls="tab.controls"
      v-bind:class="{ 'active': currentTab === idx }"
      v-on:click="onTabClick($event, tab.id)"
    >
      <div class="toolbar-icon">
        <cds-icon
          v-if="tab.icon"
          v-bind:shape="tab.icon"
          style="width: 24px; height: 24px;"
        >
        </cds-icon>
      </div>
      <!--
        Below's if-statement makes sure that on Windows, where the tabs are
        rather wide, we only display the labels when the overall window width
        is greater than at least 80px per tab
      -->
      <template v-if="currentWindowWidth > 80 * tabs.length || platform !== 'win32'">
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
 * Contains:        Tabbar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a "big" tabbar which normally looks different to
 *                  regular tabs, since it separates several full views instead
 *                  of, e.g., document tabs.
 *
 * END HEADER
 */

import { ref, onBeforeMount, onBeforeUnmount, watch } from 'vue'

export interface WindowTab {
  icon: string
  id: string
  controls: string
  label: string
}

/**
 * This interface represents a Tabbar control
 */
export interface TabbarControl {
  /**
   * This should match a Clarity icon shape
   */
  icon: string
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

const props = defineProps<{ tabs: WindowTab[], label?: string }>()

const emit = defineEmits<(e: 'tab', value: number) => void>()

const currentTab = ref<number>(0)
// The following are required to hide tab labels on win32 w/ narrow windows
const currentWindowWidth = ref<number>(window.innerWidth)
const platform = ref<typeof process.platform>(process.platform)

watch(currentTab, () => {
  emit('tab', currentTab.value)
})

onBeforeMount(() => {
  window.addEventListener('resize', onWindowResize)
  // On mount, if the URL contains a fragment that matches a tab ID, emit an
  // event to ensure the app actually switches to that.
  const fragment = location.hash
  if (fragment === '') {
    return
  }

  const tabId = fragment.substring(1)
  const idx = props.tabs.findIndex(tab => tab.id === tabId)
  if (idx > -1) {
    currentTab.value = idx
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
})

function onTabClick (event: MouseEvent, id: string): void {
  // Modify history to retain active tab across reloads
  const idx = props.tabs.findIndex(tab => tab.id === id)
  location.hash = '#' + id
  currentTab.value = idx
}

function onWindowResize (_event: UIEvent): void {
  currentWindowWidth.value = window.innerWidth
}
</script>

<style lang="less">
// General styles
body div.tab-list {
  font-family: inherit;
  display: flex;
  padding: 5px;

  button[role="tab"] {
      display: inline-block;
      font-size: 11px;
      padding: 5px;
      outline: none;
      white-space: nowrap;

      &.active {
        // --system variables are set dynamically based on the operating system.
        color: var(--system-accent-color, --c-primary);
        background-color: var(--system-accent-color-contrast, white);
      }
    }
}

// macOS styling
body.darwin {
  // System tabs, e.g. the "big ones" on the Windows
  div.tab-list {
    top: 40px;
    height: 60px;
    justify-content: center;
    list-style-type: none;
    background-color: rgb(240, 240, 240);
    border-bottom: 1px solid rgb(150, 150, 150);

    button[role="tab"] {
      color: var(--grey-4);
      background-color: transparent;
      border: none;
      border-radius: 4px;
      margin: 1px;
      text-align: center;

      &:hover, &.active {
        background-color: rgb(225, 225, 225);
      }

      &.active {
        color: var(--system-accent-color, --c-primary);
      }

      div.toolbar-icon {
        text-align: center;
      }
    }
  }

  &.dark {
    div.tab-list {
      background-color: rgb(52, 52, 52);
      color: rgb(153, 153, 153);
      border-bottom: 1px solid rgb(0, 0, 0);

      button[role="tab"] {
        color: rgb(172, 172, 172);

        &:hover, &.active {
          background-color: rgb(64, 64, 64);
        }

        &.active {
          color: var(--system-accent-color, --c-primary);
        }
      }
    }
  }
}

// Windows styling
body.win32 {
  div.tab-list {
    top: 25px;
    height: 40px;
    justify-content: center;
    list-style-type: none;

    button[role="tab"] {
      border: none;
      font-weight: bold;
      background-color: transparent;

      div.toolbar-icon {
        display: inline;
      }

      &:hover {
        background-color: rgb(238, 238, 238);
      }
    }
  }

  &.dark {
    div.tab-list {
      background-color: rgb(52, 52, 52);
      color: rgb(172, 172, 172);

      button[role="tab"] {
        color: rgb(238, 238, 238);

        &.active {
          color: var(--system-accent-color, --c-primary);
        }

        &:hover, &.active {
          background-color: rgb(64, 64, 64);
        }
      }
    }
  }
}

// Linux styling
body.linux {
  div.tab-list {
    top: 0px;
    height: 40px;
    justify-content: center;
    list-style-type: none;
    background-color: rgb(240, 240, 240); // Same colour as titlebar
    color: var(--grey-4);
    padding-bottom: 0px;

    button[role="tab"] {
      border: none;
      padding: 2px 6px;
      border-radius: 0px;
      background-color: transparent;
      border-right: 1px solid rgb(210, 210, 210);

      &:last-child {
        border-right: none;
      }

      div.toolbar-icon {
        display: none;
      }

      &:hover {
        background-color: rgb(230, 230, 230);
      }
    }
  }

  &.dark {
    div.tab-list {
      background-color: rgb(52, 52, 52);
      color: rgb(172, 172, 172);

      button[role="tab"] {
        &:hover, &.active {
          background-color: rgb(64, 64, 64);
        }
      }
    }
  }
}
</style>
