<template>
  <div id="titlebar">
    {{ titleContent }}
  </div>
</template>

<script>
export default {
  name: 'Titlebar',
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
  position: absolute;
  top: 0;
  width: 100vw;
  -webkit-app-region: drag;
}

// macOS styles
body.darwin {
  div#titlebar {
    height: 40px;
    line-height: 40px;
    background-color: rgb(238, 238, 238);
    color: var(--grey-4);
    text-align: center;
    font-weight: bold;
  }

  &.dark div#titlebar {
    background-color: rgb(52, 52, 52);
    color: rgb(172, 172, 172);
  }
}

body.win32 {
  div#titlebar {
    height: 30px;
    line-height: 30px;
    padding-left: 20px;
    background-color: var(--c-primary);
    color: white;
  }

  &.dark {
    div#titlebar {
      color: black;
    }
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
