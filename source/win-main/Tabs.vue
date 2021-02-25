<template>
  <div id="tab-container" role="tablist">
    <div
      v-for="(file, idx) in openFiles"
      v-bind:key="idx"
      v-bind:class="{
        active: file === activeFile,
        modified: modifiedDocs.includes(file.path)
      }"
      role="tab"
    >
      <span class="filename" v-on:click="handleSelectFile(file)">{{ file.name }}</span>
      <span class="close" v-on:click.stop="handleCloseFile(file)">&times;</span>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  name: 'Tabs',
  computed: {
    openFiles: function () {
      return this.$store.state.openFiles
    },
    activeFile: function () {
      return this.$store.state.activeFile
    },
    modifiedDocs: function () {
      return this.$store.state.modifiedDocuments
    }
  },
  methods: {
    handleCloseFile: function (file) {
      ipcRenderer.send('message', {
        command: 'file-close',
        content: file.path
      })
    },
    handleSelectFile: function (file) {
      ipcRenderer.invoke('application', {
        command: 'set-active-file',
        payload: file.path
      })
        .catch(e => console.error(e))
    }
  }
}
</script>

<style lang="less">
@tabbar-height: 30px;

body div#tab-container {
  width: 100%;
  height: 30px;
  background-color: rgb(215, 215, 215);
  border-bottom: 1px solid grey;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  flex-shrink: 0;
  overflow-x: auto;
  // In case of an overflow, hide the scrollbar so that scrolling left/right
  // remains possible, but no thicc scrollbar in the way!
  &::-webkit-scrollbar { display: none; }

  div[role="tab"] {
    display: inline-block;
    padding: 5px 10px;
    flex-grow: 1;
    position: relative;
    min-width: 200px;
    line-height: @tabbar-height;
    overflow: hidden;
    padding-right: @tabbar-height; // Push the filename back

    &:hover {
      background-color: rgb(200, 200, 210);
    }

    .filename {
      line-height: 30px;
      white-space: nowrap;
      overflow-x: hidden;
      display: inline-block;
      position: absolute;
      left: 0px;
      top: 0px;
      right: @tabbar-height; // Don't overlay the close button
      padding-left: 8px;
    }

    // Mark modification status classically
    &.modified .filename::before {
      content: '* '
    }

    .close {
      position: absolute;
      display: inline-block;
      right: 0px;
      top: 0px;
      width: @tabbar-height;
      height: @tabbar-height;
      line-height: @tabbar-height;
      text-align: center;
      border-radius: @tabbar-height;
      display: inline-block;
    }

    transition: 0.2s background-color ease;

    &.active {
      background-color: var(--c-primary);
      color: white;
    }
  }
}

body.darwin {
  div#tab-container {
    border-bottom: 1px solid rgb(220, 220, 220);

    div[role="tab"] {
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      font-size: 11px;
      background-color: rgb(230, 230, 230);
      border-right: 1px solid rgb(200, 200, 200);
      color: rgb(83, 83, 83);

      .filename {
        padding-left: 0;
        display: block;
        width: 100%;
      }

      &:not(.active) {
        // As a reminder, from Mozilla docs:
        // inset | offset-x | offset-y | blur-radius | spread-radius | color
        box-shadow: inset 0px 5px 4px -5px rgba(0, 0, 0, .4);
      }

      &:last-child {
        border-right: none;
      }

      &:hover {
        background-color: rgb(214, 214, 214);
        .close {
          opacity: 1;
        }
      }

      &.active {
        background-color: rgb(244, 244, 244);
        color: inherit;
      }

      .close {
        font-size: 16px;
        color: rgb(90, 90, 90);
        opacity: 0;
        transition: opacity 0.2s ease;
        border-radius: 2px;
        width: (@tabbar-height / 3 * 1.9);
        height: (@tabbar-height / 3 * 1.9);
        margin: (@tabbar-height / 3 * 0.55);
        line-height: (@tabbar-height / 3 * 1.9);
        top: 0;
        left: 0;

        &:hover {
          background-color: rgb(200, 200, 200);
        }
      }
    }
  }

  &.dark {
    div#tab-container {
      border-bottom-color: rgb(11, 11, 11);

        div[role="tab"] {
          color: rgb(233, 233, 233);
          background-color: rgb(22, 22, 22);
          border-color: rgb(22, 22, 22);

          &:hover {
            background-color: rgb(32, 34, 36);
          }

          &.active {
            background-color: rgb(51, 51, 51);
            border-color: rgb(70, 70, 70);
          }
      }
    }
  }
}
</style>
