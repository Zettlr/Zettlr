<template>
  <div id="window-frame">
    <!-- This div contains all the bars we have -->
    <div
      id="window-chrome"
      v-bind:style="{ height: windowChromeHeight }"
    >
      <!--
        These different window chrome parts can be displayed conditionally, in
        order to facilitate different kinds of windows (a preferences window,
        for instance, does seldomly have a menubar, but almost all windows have
        titlebars, except Zettlr's main window which instead has either a
        menubar or a toolbar as its first element).
      -->
      <Titlebar
        v-if="showTitlebar"
        v-bind:title-content="title"
        v-on:dblclick="handleDoubleClick('titlebar')"
      ></Titlebar>
      <Menubar
        v-if="showMenubar"
        v-bind:margin-top="menubarMargin"
      ></Menubar>
      <Toolbar
        v-if="showToolbar"
        v-bind:margin-top="toolbarMargin"
        v-bind:controls="toolbarControls"
        v-bind:show-labels="toolbarLabels"
        v-on:search="$emit('toolbar-search', $event)"
        v-on:toggle="$emit('toolbar-toggle', $event)"
        v-on:click="$emit('toolbar-click', $event)"
        v-on:dblclick="handleDoubleClick('toolbar')"
      ></Toolbar>
      <Tabbar
        v-if="showTabbar"
        v-bind:margin-top="tabbarMargin"
        v-bind:tabs="tabbarTabs"
        v-bind:label="tabbarLabel"
        v-on:tab="$emit('tab', $event)"
      ></Tabbar>
      <!-- Last but not least, the window controls -->
      <WindowControls
        v-if="showWindowControls"
        v-bind:platform="platform"
      ></WindowControls>
    </div>
    <div
      id="window-content"
      v-bind:style="{
        top: windowChromeHeight,
        bottom: contentMarginBottom
      }"
      v-bind:class="{
        'disable-vibrancy': disableVibrancy
      }"
    >
      <!-- The actual window contents will be mounted here -->
      <slot></slot>
    </div>
    <Statusbar
      v-if="showStatusbar"
      v-bind:controls="statusbarControls"
      v-on:click="$emit('statusbar-click', $event)"
    ></Statusbar>
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

import Titlebar from './Titlebar.vue'
import Menubar from './Menubar.vue'
import Toolbar from './Toolbar.vue'
import Tabbar from './Tabbar.vue'
import Statusbar from './Statusbar.vue'
import WindowControls from './Controls.vue'

// Import the correct styles (the platform styles are namespaced)
import './assets/generic.less'

const ipcRenderer = window.ipc

// First we need some general variables
const TITLEBAR_MACOS_HEIGHT = 40
const TITLEBAR_WIN32_HEIGHT = 30
const TITLEBAR_LINUX_HEIGHT = 30

const MENUBAR_MACOS_HEIGHT = 31 // No menubar on macOS
const MENUBAR_WIN32_HEIGHT = 31
const MENUBAR_LINUX_HEIGHT = 31

const TOOLBAR_MACOS_HEIGHT = 40
const TOOLBAR_WIN32_HEIGHT = 40
const TOOLBAR_LINUX_HEIGHT = 40

const TABBAR_MACOS_HEIGHT = 60
const TABBAR_WIN32_HEIGHT = 40
const TABBAR_LINUX_HEIGHT = 40

const STATUSBAR_MACOS_HEIGHT = 60
const STATUSBAR_WIN32_HEIGHT = 60
const STATUSBAR_LINUX_HEIGHT = 60

export default {
  name: 'WindowChrome',
  components: {
    Titlebar,
    Menubar,
    Toolbar,
    Tabbar,
    Statusbar,
    WindowControls
  },
  props: {
    // Window title
    title: {
      type: String,
      default: ''
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
  data: function () {
    return {
      // NOTE: This is solely for debug purposes so that we can adapt
      // any styles for the correct platform. In production, this will
      // ensure "linux" styles are shown on Linux, "darwin" styles are
      // shown on macOS and "win32" styles are shown on Windows.
      // Change the value in the Vue dev tools if you want to see how
      // Zettlr looks on other platforms. Please also note that this
      // does not affect the native window chrome.
      platform: process.platform,
      useNativeAppearance: global.config.get('window.nativeAppearance')
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
    platformTitlebarHeight: function () {
      if (this.platform === 'darwin') {
        return TITLEBAR_MACOS_HEIGHT
      } else if (this.platform === 'win32') {
        return TITLEBAR_WIN32_HEIGHT
      } else {
        return TITLEBAR_LINUX_HEIGHT // Default
      }
    },
    platformMenubarHeight: function () {
      if (this.platform === 'darwin') {
        return MENUBAR_MACOS_HEIGHT
      } else if (this.platform === 'win32') {
        return MENUBAR_WIN32_HEIGHT
      } else {
        return MENUBAR_LINUX_HEIGHT // Default
      }
    },
    platformToolbarHeight: function () {
      if (this.platform === 'darwin') {
        return TOOLBAR_MACOS_HEIGHT
      } else if (this.platform === 'win32') {
        return TOOLBAR_WIN32_HEIGHT
      } else {
        return TOOLBAR_LINUX_HEIGHT // Default
      }
    },
    platformTabbarHeight: function () {
      if (this.platform === 'darwin') {
        return TABBAR_MACOS_HEIGHT
      } else if (this.platform === 'win32') {
        return TABBAR_WIN32_HEIGHT
      } else {
        return TABBAR_LINUX_HEIGHT // Default
      }
    },
    platformStatusbarHeight: function () {
      if (this.platform === 'darwin') {
        return STATUSBAR_MACOS_HEIGHT
      } else if (this.platform === 'win32') {
        return STATUSBAR_WIN32_HEIGHT
      } else {
        return STATUSBAR_LINUX_HEIGHT // Default
      }
    },
    windowChromeHeight: function () {
      let margin = 0

      if (this.showTitlebar === true) {
        margin += this.platformTitlebarHeight
      }

      if (this.showMenubar === true) {
        margin += this.platformMenubarHeight
      }

      if (this.showToolbar === true) {
        margin += this.platformToolbarHeight
      }

      if (this.showTabbar === true) {
        margin += this.platformTabbarHeight
      }

      return `${margin}px`
    },
    contentMarginBottom: function () {
      if (this.showStatusbar === true) {
        return `${this.platformStatusbarHeight}px`
      } else {
        return '0px'
      }
    },
    menubarMargin: function () {
      // Only a titlebar may be on top of the menubar
      if (this.showTitlebar === true) {
        return `${this.platformTitlebarHeight}px`
      } else {
        return '0px'
      }
    },
    toolbarMargin: function () {
      let margin = 0

      if (this.showTitlebar === true) {
        margin += this.platformTitlebarHeight
      }

      if (this.showMenubar === true) {
        margin += this.platformMenubarHeight
      }

      return `${margin}px`
    },
    tabbarMargin: function () {
      let margin = 0

      if (this.showTitlebar === true) {
        margin += this.platformTitlebarHeight
      }

      if (this.showMenubar === true) {
        margin += this.platformMenubarHeight
      }

      if (this.showToolbar === true) {
        margin += this.platformToolbarHeight
      }

      return `${margin}px`
    }
  },
  watch: {
    platform: function () {
      // When the platform changes (only happens during debug) make sure to
      // adapt the body class
      document.body.classList.remove('darwin', 'win32', 'linux')
      document.body.classList.add(this.platform)
    }
  },
  created: function () {
    // Oh, we can destructure stuff directly in the method signature?! Uuuuh
    ipcRenderer.on('config-provider', (event, { command, payload }) => {
      if (command === 'update' && payload === 'window.nativeAppearance') {
        this.useNativeAppearance = global.config.get('window.nativeAppearance')
      }
    })

    // Apply the body class immediately
    document.body.classList.add(this.platform)
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
// Import the CodeMirror CSS so that it's available on every window which
// includes the WindowChrome.
@import '~codemirror/lib/codemirror.css';

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

  div#window-chrome {
    // The window chrome gets the system font
    font-family: inherit;
  }

  div#window-content {
    // The top position will be computed dynamically based on the different
    // bars that are shown in the window chrome content.
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: auto;
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
