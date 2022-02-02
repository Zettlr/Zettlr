<template>
  <div
    class="tab-list"
    role="tablist"
    v-bind:aria-label="label"
    v-bind:style="{ top: marginTop }"
  >
    <button
      v-for="(tab, idx) in tabs"
      v-bind:id="tab.id"
      v-bind:key="idx"
      role="tab"
      v-bind:aria-selected="currentTab === idx" v-bind:aria-controls="tab.controls"
      v-bind:class="{ 'active': currentTab === idx }"
      v-on:click="currentTab = idx"
    >
      <div class="toolbar-icon">
        <clr-icon
          v-if="tab.icon"
          v-bind:shape="tab.icon"
          size="24"
        >
        </clr-icon>
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

<script lang="ts">
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

import { defineComponent, PropType } from 'vue'
import { WindowTab } from '@dts/renderer/window'

export default defineComponent({
  name: 'WindowTabbar',
  props: {
    marginTop: {
      type: String,
      default: '0px'
    },
    tabs: {
      type: Array as PropType<WindowTab[]>,
      required: true
    },
    label: {
      type: String,
      default: 'tabs'
    }
  },
  emits: ['tab'],
  data: function () {
    return {
      currentTab: 0,
      // The following are required to hide tab labels on win32 w/ narrow windows
      currentWindowWidth: window.innerWidth,
      platform: process.platform
    }
  },
  watch: {
    currentTab: function () {
      this.$emit('tab', this.currentTab)
    }
  },
  mounted () {
    window.addEventListener('resize', this.onWindowResize)
  },
  destroyed () {
    window.removeEventListener('resize', this.onWindowResize)
  },
  methods: {
    onWindowResize (event: UIEvent) {
      this.currentWindowWidth = window.innerWidth
    }
  }
})
</script>

<style lang="less">
// General styles
body div.tab-list {
  position: absolute;
  width: 100%;
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
