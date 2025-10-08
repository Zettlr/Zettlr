<template>
  <div id="titlebar" v-bind:class="{ 'has-vibrancy': props.hasVibrancy }">
    {{ props.titleContent }}
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Titlebar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Renders a platform-specific titlebar. On macOS, for instance
 *                  these are used by the preferences, on Windows that's displayed
 *                  where there is no menu.
 *
 * END HEADER
 */

const props = defineProps<{
  titleContent: string
  hasVibrancy: boolean
}>()
</script>

<style lang="less">
// General styles
div#titlebar {
  -webkit-app-region: drag;
  // Ensure always only a single line of text, appropriately cut off
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

// macOS styles
body.darwin {
  div#titlebar {
    height: 40px;
    line-height: 40px;
    padding: 0 80px; // Ensure padding for the traffic lights
    background-color: rgb(240, 240, 240);
    color: var(--grey-4);
    text-align: center;
    font-weight: bold;

    &.has-vibrancy {
      background-color: rgba(240, 240, 240, 0.5);
    }
  }

  &.dark div#titlebar {
    background-color: rgb(52, 52, 52);
    color: rgb(172, 172, 172);

    &.has-vibrancy {
      background-color: rgba(52, 52, 52, 0.3);
    }
  }
}

body.win32 {
  div#titlebar {
    height: 30px;
    line-height: 30px;
    padding-left: 20px; // Some padding left
    padding-right: 138px; // Sufficient padding for the window controls right
    background-color: var(--system-accent-color, --c-primary);
    color: var(--system-accent-color-contrast, white);
  }
}

// Linux styles
body.linux {
  div#titlebar {
    height: 30px;
    line-height: 30px;
    text-align: center;
    font-weight: bold;
    background-color: rgb(238, 238, 238);
    color: var(--grey-4);
    padding: 0 80px; // On Linux, the window controls are also on the left side
  }

  &.dark div#titlebar {
    background-color: rgb(52, 52, 52);
    color: rgb(172, 172, 172);
  }
}
</style>
