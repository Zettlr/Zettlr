<template>
  <div id="window-frame">
    <!-- This div contains all the bars we have -->
    <div id="window-chrome">
      <!--
        These different window chrome parts can be displayed conditionally, in
        order to facilitate different kinds of windows (a preferences window,
        for instance, does seldomly have a menubar, but almost all windows have
        titlebars, except Zettlr's main window which instead has either a
        menubar or a toolbar as its first element).
      -->
      <WindowTitlebar
        v-if="showTitlebar"
        v-bind:title-content="title"
        v-on:dblclick="handleDoubleClick('titlebar')"
      ></WindowTitlebar>
      <WindowMenubar
        v-if="showMenubar"
      ></WindowMenubar>
      <WindowToolbar
        v-if="showToolbar"
        v-bind:controls="toolbarControls"
        v-bind:show-labels="toolbarLabels"
        v-on:search="$emit('toolbar-search', $event)"
        v-on:toggle="$emit('toolbar-toggle', $event)"
        v-on:click="$emit('toolbar-click', $event)"
        v-on:dblclick="handleDoubleClick('toolbar')"
      ></WindowToolbar>
      <WindowTabbar
        v-if="showTabbar"
        v-bind:tabs="tabbarTabs"
        v-bind:label="tabbarLabel"
        v-on:tab="$emit('tab', $event)"
      ></WindowTabbar>
      <!-- Last but not least, the window controls -->
      <WindowControls
        v-if="showWindowControls"
        v-bind:platform="platform"
      ></WindowControls>
    </div>
    <div
      id="window-content"
      v-bind:class="{
        'disable-vibrancy': disableVibrancy
      }"
    >
      <!-- The actual window contents will be mounted here -->
      <slot></slot>
    </div>
    <WindowStatusbar
      v-if="showStatusbar"
      v-bind:controls="statusbarControls"
      v-on:click="$emit('statusbar-click', $event)"
    ></WindowStatusbar>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Chrome
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file displays custom-styled WindowChrome on a browser
 *                  window. This component is being used by every renderer
 *                  process (similar to the window registration).
 *
 * END HEADER
 */

import WindowTitlebar from './WindowTitlebar.vue'
import WindowMenubar from './WindowMenubar.vue'
import WindowToolbar from './WindowToolbar.vue'
import WindowTabbar from './WindowTabbar.vue'
import WindowStatusbar from './WindowStatusbar.vue'
import WindowControls from './WindowControls.vue'

// Import the correct styles (the platform styles are namespaced)
import './assets/generic.less'

const ipcRenderer = window.ipc

export default {
  name: 'WindowChrome',
  components: {
    WindowTitlebar,
    WindowMenubar,
    WindowToolbar,
    WindowTabbar,
    WindowStatusbar,
    WindowControls
  },
  props: {
    // Window title
    title: {
      type: String,
      default: 'Zettlr'
    },
    // Tabbar tabs
    tabbarTabs: {
      type: Array,
      default: function () { return [] }
    },
    // Tabbar ARIA label
    tabbarLabel: {
      type: String,
      default: ''
    },
    // Toolbar controls
    toolbarControls: {
      type: Array,
      default: function () { return [] }
    },
    // Should show a titlebar if adequate?
    titlebar: {
      type: Boolean,
      default: true
    },
    // Should show a menubar if adequate?
    menubar: {
      type: Boolean,
      default: process.platform !== 'darwin'
    },
    // Show the toolbar?
    showToolbar: {
      type: Boolean,
      default: false
    },
    // Show labels under the toolbar icons?
    toolbarLabels: {
      type: Boolean,
      default: false
    },
    // Show the tabbar?
    showTabbar: {
      type: Boolean,
      default: false
    },
    showStatusbar: {
      type: Boolean,
      default: false
    },
    statusbarControls: {
      type: Array,
      default: function () { return [] }
    },
    // If this is set to true, the window contents will disable vibrancy for
    // this window on macOS. Doesn't have an effect on any other operating
    // system.
    disableVibrancy: {
      type: Boolean,
      default: false
    }
  },
  emits: [ 'toolbar-search', 'toolbar-click', 'toolbar-toggle', 'tab', 'statusbar-click' ],
  data: function () {
    return {
      // NOTE: This is solely for debug purposes so that we can adapt
      // any styles for the correct platform. In production, this will
      // ensure "linux" styles are shown on Linux, "darwin" styles are
      // shown on macOS and "win32" styles are shown on Windows.
      // Change the value in the Vue dev tools if you want to see how
      // Zettlr looks on other platforms. Please also note that this
      // does not affect the native window chrome.
      // platform: 'win32',
      platform: process.platform,
      useNativeAppearance: window.config.get('window.nativeAppearance')
    }
  },
  computed: {
    showTitlebar: function () {
      // Shows a titlebar if one is requested and we are on macOS or on Windows
      // or on Linux with not native appearance.
      if (this.platform === 'linux' && this.useNativeAppearance === true) {
        return false
      }

      return this.titlebar
    },
    showMenubar: function () {
      // Shows a menubar if one is requested and we are on Windows or on Linux
      // with not native appearance.
      if (this.platform === 'darwin') {
        return false
      }

      if (this.platform === 'linux' && this.useNativeAppearance === true) {
        return false
      }

      return this.menubar
    },
    showWindowControls: function () {
      // Shows the window control buttons only if we are on Windows
      // or on Linux without native appearance.
      if (this.platform === 'linux' && this.useNativeAppearance === true) {
        return false
      } else if (this.platform === 'darwin') {
        return false
      } else {
        return true
      }
    }
  },
  watch: {
    platform: function () {
      // When the platform changes (only happens during debug) make sure to
      // adapt the body class
      document.body.classList.remove('darwin', 'win32', 'linux')
      document.body.classList.add(this.platform)
    },
    title: function () {
      document.title = this.title
    }
  },
  created: function () {
    // Oh, we can destructure stuff directly in the method signature?! Uuuuh
    ipcRenderer.on('config-provider', (event, { command, payload }) => {
      if (command === 'update' && payload === 'window.nativeAppearance') {
        this.useNativeAppearance = window.config.get('window.nativeAppearance')
      }
    })

    // Apply the body class immediately and also set the title
    document.body.classList.add(this.platform)
    document.title = this.title
  },
  methods: {
    handleDoubleClick: function (origin) {
      if (origin === 'titlebar') {
        // A doubleclick on the titlebar is pretty universally recognised as
        // an action that should maximise the window.
        ipcRenderer.send('window-controls', { command: 'win-maximise' })
      } else if (origin === 'toolbar') {
        // A doubleclick on the toolbar should trigger a maximisation if there
        // is no titlebar on darwin
        if (this.platform === 'darwin' && this.titlebar === false) {
          ipcRenderer.send('window-controls', { command: 'win-maximise' })
        }
      }
    }
  }
}
</script>

<style lang="less">
// Define app-wide overarching color variable names
:root {
  --grey-0: rgb(240, 240, 240);
  --grey-1: rgb(220, 220, 220);
  --grey-2: rgb(200, 200, 200);
  --grey-3: rgb(120, 120, 130);
  --grey-4: rgb(100, 100, 110);
  --grey-5: rgb( 80,  80,  90);
  --grey-6: rgb( 70,  70,  80);
  --grey-7: rgb( 40,  40,  50);

  // Other colors
  --green-selection:       rgba(180, 240, 170, 0.8);
  --green-selection-dark:  rgba( 90, 170,  80, 0.8);

  --blue-selection:        rgba(200, 220, 240, 0.8);
  --blue-selection-dark:   rgba( 29,  55, 134, 0.8);

  --purple-selection:      rgba(216, 171, 241, 1);

  --gold-selection:        rgba(247, 235, 159, 1);
  --gold-selection-dark:   rgba(167, 145,   2, 1);

  --fg-error:              rgba(148,  16,  16, 1);
  --bg-error:              rgba(255, 176, 176, 1);

  /*
   * COLOUR PALETTES
   */

  --blue-0:                rgba( 29, 117, 179, 1);
  --blue-1:                rgba( 37,  53, 146, 1);
  --blue-3:                rgba( 50,  70,  90, 1);

  --orange-0:              rgba(255, 180, 108, 1);
  --orange-1:              rgba(255, 124,  69, 1);
  --orange-2:              rgba(240,  87,  52, 1);

  --beige-0:               rgba(243, 243, 232, 1);
  --beige-2:               rgba(205, 205, 170, 1);

  --red-0:                 rgba(240,  50,  50, 1);
  --red-1:                 rgba(220,  45,  45, 1);
  --red-2:                 rgba(200,  40,  40, 1);
  --red-7:                 rgba( 80,  15,  15, 1);

  --green-0:               rgba( 28, 178, 126, 1);
  --green-1:               rgba(  4, 125, 101, 1);

  --apricot:               rgba(251, 206, 177, 1);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Avenir Next', 'Avenir', 'Helvetica Neue', Helvetica, Ubuntu, Roboto, Noto, 'Segoe UI', Arial, sans-serif;
  // macOS OPERATING SYSTEM STYLES
  // NOTE: On macOS, Zettlr uses vibrancy which means we must make the
  // background-color of all elements transparent which should have this
  // vibrancy effect. However, since this is the overall window background, we
  // also need a way to disable the vibrancy selectively (e.g. for the
  // preferences window).
  &.darwin {
    div#window-content.disable-vibrancy {
      background-color: rgb(235, 235, 235);
    }

    &.dark {
      div#window-content.disable-vibrancy {
        background-color: rgb(30, 30, 30);
      }
    }
  }

  div#window-frame {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }

  div#window-chrome {
    // The window chrome gets the system font
    font-family: inherit;
    display: flex;
    flex-direction: column;
  }

  div#window-content {
    height: 100%;
    overflow: auto;
    // Allow child components to make "easier" full screen content by using a
    // position: absolute without having to delve into weird hacks.
    position: relative;
  }

  &:not(.darwin) {
    div#window-content {
      background-color: rgb(235, 235, 235);
    }
  }

  &.dark:not(.darwin) {
    div#window-content {
      background-color: rgb(30, 30, 30);
    }
  }
}
</style>
