<template>
  <div id="titlebar">
    {{ titleContent }}
  </div>
</template>

<script>
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

export default {
  name: 'WindowTitlebar',
  props: {
    titleContent: {
      type: String,
      default: ''
    }
  },
  computed: {
  }
}
</script>

<style lang="less">
// General styles
div#titlebar {
  grid-area: titlebar;
}

// macOS styles
body.darwin {
  div#titlebar {
    height: 40px;
    line-height: 40px;
    background-color: rgb(240, 240, 240);
    color: var(--grey-4);
    text-align: center;
    font-weight: bold;
  }

  &.dark div#titlebar {
    background-color: rgb(52, 52, 52);
    color: rgb(172, 172, 172);
  }
}

// Windows styles
body.win32 {
  div#titlebar {
    height: 31px;
    line-height: 31px;
    padding-left: 20px;
    background-color: var(--system-accent-color, --c-primary);
    color: var(--system-accent-color-contrast, white);
  }
}

// Linux styles
body.linux {
  div#titlebar {
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
  }
}
</style>
