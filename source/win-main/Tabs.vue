<template>
  <div id="tab-container" role="tablist">
    <div
      v-for="(file, idx) in openFiles"
      v-bind:key="idx"
      v-bind:class="{
        active: file === activeFile,
        modified: modifiedDocs.includes(file.path)
      }"
      v-bind:title="file.name"
      v-bind:data-path="file.path"
      role="tab"
      draggable="true"
      v-on:dragstart="handleDragStart"
      v-on:drag="handleDrag"
      v-on:dragend="handleDragEnd"
      v-on:contextmenu="handleContextMenu($event, file)"
    >
      <span class="filename" v-on:click="handleSelectFile(file)">{{ getTabText(file) }}</span>
      <span class="close" v-on:click.stop="handleCloseFile(file)">&times;</span>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import displayTabsContextMenu from './tabs-context'

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
    },
    useH1: function () {
      return this.$store.state.config['display.useFirstHeadings']
    }
  },
  mounted: function () {
    // Listen for shortcuts so that we can switch tabs programmatically
    ipcRenderer.on('shortcut', (event, shortcut) => {
      const currentIdx = this.openFiles.findIndex(elem => elem === this.activeFile)
      if (shortcut === 'previous-tab') {
        if (currentIdx > 0) {
          this.handleSelectFile(this.openFiles[currentIdx - 1])
        } else {
          this.handleSelectFile(this.openFiles[this.openFiles.length - 1])
        }
      } else if (shortcut === 'next-tab') {
        if (currentIdx < this.openFiles.length - 1) {
          this.handleSelectFile(this.openFiles[currentIdx + 1])
        } else {
          this.handleSelectFile(this.openFiles[0])
        }
      } else if (shortcut === 'close-window') {
        // The tab bar has the responsibility to first close the activeFile if
        // there is one. If there is none, it should send a request to close
        // this window as if the user had clicked on the close-button.
        if (currentIdx > -1) {
          // There's an active file, so request the closure
          this.handleCloseFile(this.openFiles[currentIdx])
        } else {
          // No more open files, so request closing of the window
          ipcRenderer.send('window-controls', { command: 'win-close' })
        }
      }
    })
  },
  methods: {
    getTabText: function (file) {
      // Returns a more appropriate tab text based on the user settings
      if (file.type !== 'file') {
        return file.name
      } else if (file.frontmatter !== null && 'title' in file.frontmatter) {
        return file.frontmatter.title
      } else if (this.useH1 === true && file.firstHeading !== null) {
        return file.firstHeading
      } else {
        return file.name
      }
    },
    handleCloseFile: function (file) {
      ipcRenderer.invoke('application', {
        command: 'file-close',
        payload: file.path
      })
        .catch(e => console.error(e))
    },
    handleSelectFile: function (file) {
      ipcRenderer.invoke('application', {
        command: 'set-active-file',
        payload: file.path
      })
        .catch(e => console.error(e))
    },
    handleContextMenu: function (event, file) {
      displayTabsContextMenu(event, async (clickedID) => {
        if (clickedID === 'close-this') {
          // Close only this
          await ipcRenderer.invoke('application', {
            command: 'file-close',
            payload: file.path
          })
        } else if (clickedID === 'close-others') {
          // Close all files ...
          for (const openFile of this.openFiles) {
            if (openFile === file) {
              continue // ... except this
            }

            await ipcRenderer.invoke('application', {
              command: 'file-close',
              payload: openFile.path
            })
          }
        } else if (clickedID === 'close-all') {
          // Close all files
          for (const openFile of this.openFiles) {
            await ipcRenderer.invoke('application', {
              command: 'file-close',
              payload: openFile.path
            })
          }
        }
      })
    },
    handleDragStart: function (event) {
      // console.log(event)
    },
    handleDrag: function (event) {
      const tab = event.target
      const tablist = tab.parentNode
      let coordsX = event.clientX
      let coordsY = event.clientY

      // Ensure the coords are somewhere inside the tablist. NOTE that exactly
      // the border would only select the tablist, not the actual tab at that
      // point. NOTE that the value of five is arbitrary and relies on the fact
      // that the tablist only contains tabs.
      const { left, top, right, bottom, height } = this.$el.getBoundingClientRect()
      const middle = height / 2
      if (coordsX < left) {
        coordsX = left + 5
      }

      if (coordsX > right) {
        coordsX = right - 5
      }

      if (coordsY < top) {
        coordsY = top + middle
      }

      if (coordsY > bottom) {
        coordsY = bottom - middle
      }

      let swapItem = document.elementFromPoint(coordsX, coordsY)
      if (swapItem === null) {
        swapItem = tab
      }

      // We need to make sure we got the DIV, not one of the containing spans
      while (swapItem.getAttribute('role') !== 'tab') {
        if (swapItem.parentNode === document) {
          break // Don't overdo it
        }
        swapItem = swapItem.parentNode
      }

      if (tablist === swapItem.parentNode) {
        swapItem = swapItem !== tab.nextSibling ? swapItem : swapItem.nextSibling
        tablist.insertBefore(tab, swapItem)
      }
    },
    handleDragEnd: function (event) {
      // Here we just need to inspect the actual order and notify the main
      // process of that order.
      const newOrder = []
      for (let i = 0; i < this.$el.children.length; i++) {
        const fpath = this.$el.children[i].getAttribute('data-path')
        newOrder.push(fpath)
      }

      // Now that we have the correct NEW ordering, we need to temporarily
      // restore the old ordering, because otherwise Vue will be confused since
      // it needs to keep track of the element ordering, and we just messed with
      // that big time.
      const originalOrdering = this.openFiles.map(file => file.path)
      const targetElement = event.target
      const originalIndex = originalOrdering.indexOf(targetElement.getAttribute('data-path'))
      if (originalIndex === 0) {
        this.$el.insertBefore(targetElement, this.$el.children[0])
      } else if (originalIndex === this.$el.children.length - 1) {
        this.$el.insertBefore(targetElement, null) // null means append at the end
      } else {
        this.$el.insertBefore(targetElement, this.$el.children[originalIndex + 1])
      }

      ipcRenderer.invoke('application', {
        command: 'sort-open-files',
        payload: newOrder
      })
        .catch(err => console.error(err))
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

    &:hover { background-color: rgb(200, 200, 210); }

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
        padding: 0 5px;
        margin-left: (@tabbar-height / 3 * 1.9);
        overflow: hidden;
      }

      &:not(.active) {
        // As a reminder, from Mozilla docs:
        // inset | offset-x | offset-y | blur-radius | spread-radius | color
        box-shadow: inset 0px 5px 4px -5px rgba(0, 0, 0, .4);
      }

      &:last-child { border-right: none; }

      &:hover {
        background-color: rgb(214, 214, 214);
        .close { opacity: 1; }
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

body.win32 {
  &.dark {
    div#tab-container {
      background-color: rgb(11, 11, 11);

      div[role="tab"]:hover {
        background-color: rgb(53, 53, 53);
      }
    }
  }
}
</style>
