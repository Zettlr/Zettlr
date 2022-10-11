<template>
  <div id="window-frame">
    <!-- This div contains all the bars we have -->
    <div
      id="window-chrome"
    >
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
        v-bind:platform="platform"
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
    },
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
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Avenir Next', 'Avenir', 'Helvetica Neue', Helvetica, Ubuntu, Roboto, Noto, 'Segoe UI', Arial, sans-serif;

  #window-frame {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  // The window chrome and statusbar have fixed heights, the content takes up
  // the remainder of the space.
  #window-content { flex: 1 1 auto; }
  #window-frame > :not(#window-content) { flex: 0 0 auto; }

  #window-chrome {
    // The window chrome gets the system font
    font-family: inherit;

    // The window chrome can get dragged by default.  Elements that can't be
    // dragged (e.g. window controls) must explicitely indicate so by setting
    // -webkit-app-region: no-drag.
    -webkit-app-region: drag;

    display: grid;
    grid:
      "titlebar controls" minmax(0, auto)
      "menubar controls" minmax(0, auto)
      "toolbar toolbar" auto
      "tabbar tabbar" auto
      / minmax(0, 1fr) auto;
  }

  #window-content {
    display: flex;
    overflow: auto;

    // The window content has position: relative set so that it acts as a root
    // for the distraction free mode.
    position: relative;
  }

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

  // Windows OPERATING SYSTEM STYLES
  &.win32 {
    div#window-content {
      background-color: rgb(235, 235, 235);
    }
  }

  &.win32.dark {
    div#window-content {
      background-color: rgb(30, 30, 30);
    }
  }

  // Linux OPERATING SYSTEM STYLES
  &.linux {
    --current-color: 0 0 0;
    --window-bg-color: #fafafa;
    --window-fg-color: rgb(var(--current-color) / 0.8);
    --view-bg-color: #ffffff;
    --view-fg-color: rgb(var(--current-color) / 0.8);
    --view-hover-color: rgb(var(--current-color) / 0.07);
    --view-selected-color: rgb(var(--current-color) / 0.1);
    --view-selected-hover-color: rgb(var(--current-color) / 0.13);
    --button-color: rgb(var(--current-color) / 0.1);
    --popover-bg-color: #ffffff;
    --popover-fg-color: rgba(0, 0, 0, 0.8);
    --headerbar-bg-color: #ebebeb;
    --headerbar-fg-color: rgba(0, 0, 0, 0.8);
    --border-opacity: 0.15;
    --headerbar-border-color: rgb(var(--current-color) / var(--border-opacity));
    --headerbar-shade-color: rgb(var(--current-color) / 0.07);
    --border-color: rgb(var(--current-color) / var(--border-opacity));
    --accelerator-color: rgb(var(--current-color) / 55%);
    --dim-label-opacity: 0.55;

    --accent-bg-color: #3584e4;
    --accent-fg-color: #ffffff;
    --accent-color-rgb: 28 113 216;
    --accent-color: rgb(var(--accent-color-rgb));

    background-color: var(--window-bg-color);

    // Use a different font-family for Linux that targets Gnome system fonts
    --system-font-family: Cantarell, system-ui, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-family: var(--system-font-family);
    font-size: 11pt;

    #window-chrome {
      overflow: hidden;
      background-color: var(--headerbar-bg-color);
      box-shadow: inset 0 -1px var(--headerbar-shade-color);
      color: var(--headerbar-fg-color);
      border: 1px solid var(--headerbar-border-color);
      border-bottom: none;
      -webkit-app-region: drag;

      // On the first line, we have the toolbar or tabbar (only one is
      // available at once), followed by the window controls.
      // On the second line, the menubar takes all the available space.
      grid:
        [toolbar-start tabbar-start controls-start]
          "titlebar titlebar" auto
        [toolbar-end tabbar-end controls-end]
          "menubar menubar" auto
        /
        [toolbar-start tabbar-start]
          minmax(0, 1fr)
        [toolbar-end tabbar-end controls-start] 
          auto
        [controls-end];
    }

    #window-content {
      background-color: var(--window-bg-color);

      border: 1px solid var(--border-color);
      border-top: none;
    }

    .distraction-free {
      #window-chrome {
        background-color: var(--view-bg-color);
        box-shadow: none;
      }
    }
  }

  &.linux.dark {
    --current-color: 255 255 255;
    --window-bg-color: #242424;
    --window-fg-color: #ffffff;
    --view-bg-color: #1e1e1e;
    --view-fg-color: #ffffff;
    --popover-bg-color: #383838;
    --popover-fg-color: #ffffff;
    --headerbar-bg-color: #303030;
    --headerbar-fg-color: #ffffff;
    --headerbar-shade-color: rgb(0 0 0 / 0.36);
    --accent-color-rgb: 120 174 237;
    --dim-label-opacity: 0.9;
  }
}
</style>
