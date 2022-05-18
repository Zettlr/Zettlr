<template>
  <div id="tab-container" ref="container" role="tablist">
    <div
      v-for="(file, idx) in openFiles"
      v-bind:key="idx"
      v-bind:class="{
        active: activeFile !== null && file.path === activeFile.path,
        modified: modifiedDocs.includes(file.path)
      }"
      v-bind:title="file.path"
      v-bind:data-path="file.path"
      role="tab"
      draggable="true"
      v-on:dragstart="handleDragStart"
      v-on:drag="handleDrag"
      v-on:dragend="handleDragEnd"
      v-on:contextmenu="handleContextMenu($event, file)"
      v-on:mouseup="handleMiddleMouseClick($event, file)"
      v-on:mousedown="handleClickFilename($event, file)"
    >
      <span
        class="filename"
        role="button"
      >{{ getTabText(file) }}</span>
      <span
        class="close"
        aria-hidden="true"
        v-on:mousedown="handleClickClose($event, file)"
      >&times;</span>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tabs
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays the document tabs on top of the editor.
 *
 * END HEADER
 */

import displayTabsContextMenu from './tabs-context'
import tippy from 'tippy.js'
import { nextTick, defineComponent } from 'vue'

const ipcRenderer = window.ipc
const clipboard = window.clipboard

export default defineComponent({
  name: 'DocumentTabs',
  computed: {
    openFiles: function (): any[] {
      return this.$store.state.openFiles
    },
    activeFile: function (): any {
      return this.$store.state.activeFile
    },
    modifiedDocs: function (): string[] {
      return this.$store.state.modifiedDocuments
    },
    useH1: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('heading')
    },
    useTitle: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('title')
    },
    displayMdExtensions: function (): boolean {
      return this.$store.state.config['display.markdownFileExtensions']
    },
    container: function (): HTMLDivElement {
      return this.$refs.container as HTMLDivElement
    }
  },
  watch: {
    activeFile: function () {
      // Make sure the activeFile is in view
      // We must wait until Vue has actually applied the active class to the
      // new file tab so that our handler retrieves the correct one, not the old.
      nextTick()
        .then(() => { this.scrollActiveFileIntoView() })
        .catch(err => console.error(err))
    }
  },
  mounted: function () {
    // Listen for shortcuts so that we can switch tabs programmatically
    ipcRenderer.on('shortcut', (event, shortcut) => {
      const currentIdx = this.openFiles.findIndex(elem => this.activeFile !== null && elem.path === this.activeFile.path)
      if (shortcut === 'previous-tab') {
        if (currentIdx > 0) {
          this.selectFile(this.openFiles[currentIdx - 1])
        } else {
          this.selectFile(this.openFiles[this.openFiles.length - 1])
        }
      } else if (shortcut === 'next-tab') {
        if (currentIdx < this.openFiles.length - 1) {
          this.selectFile(this.openFiles[currentIdx + 1])
        } else {
          this.selectFile(this.openFiles[0])
        }
      } else if (shortcut === 'close-window') {
        // The tab bar has the responsibility to first close the activeFile if
        // there is one. If there is none, it should send a request to close
        // this window as if the user had clicked on the close-button.
        if (currentIdx > -1) {
          // There's an active file, so request the closure
          ipcRenderer.invoke('application', {
            command: 'file-close',
            payload: this.openFiles[currentIdx].path
          })
            .catch(e => console.error(e))
        } else {
          // No more open files, so request closing of the window
          ipcRenderer.send('window-controls', { command: 'win-close' })
        }
      } else if (shortcut === 'rename-file') {
        // Renaming via shortcut (= Cmd/Ctrl+R) works via a tooltip underneath
        // the corresponding filetab. First, make sure the container is visible
        this.scrollActiveFileIntoView()

        const container = this.container.querySelector('.active')

        const wrapper = document.createElement('div')
        wrapper.classList.add('file-rename')

        const input = document.createElement('input')
        input.style.backgroundColor = 'transparent'
        input.style.border = 'none'
        input.style.color = 'white'
        input.value = this.openFiles[currentIdx].name

        wrapper.appendChild(input)

        // Then do the magic
        const instance = tippy(container as Element, {
          content: wrapper,
          allowHTML: true,
          interactive: true,
          placement: 'bottom',
          showOnCreate: true, // Immediately show the tooltip
          arrow: true, // Arrow for these tooltips
          onShown: function () {
            input.focus()
            // Select from the beginning until the last dot
            input.setSelectionRange(0, input.value.lastIndexOf('.'))
          }
        })

        input.addEventListener('keydown', (event) => {
          if (![ 'Enter', 'Escape' ].includes(event.key)) {
            return
          }

          if (event.key === 'Enter' && input.value.trim() !== '') {
            ipcRenderer.invoke('application', {
              command: 'file-rename',
              payload: {
                path: this.openFiles[currentIdx].path,
                name: input.value
              }
            })
              .catch(e => console.error(e))
          }
          instance.hide()
        })
      }
    })
  },
  methods: {
    scrollActiveFileIntoView: function () {
      // First, we need to find the tab displaying the active file
      const elem = (this.$refs.container as HTMLDivElement).querySelector('.active') as HTMLDivElement|null
      if (elem === null) {
        return // The container is not yet present
      }
      // Then, find out where the element is ...
      const left = elem.offsetLeft
      const right = left + elem.getBoundingClientRect().width
      // ... with respect to the container
      const leftEdge = this.container.scrollLeft
      const containerWidth = this.container.getBoundingClientRect().width
      const rightEdge = leftEdge + containerWidth

      if (left < leftEdge) {
        // The active tab is (partially) hidden to the left -> Decrease scrollLeft
        this.container.scrollLeft -= leftEdge - left
      } else if (right > rightEdge) {
        // The active tab is (partially) hidden to the right -> Increase scrollLeft
        this.container.scrollLeft += right - rightEdge
      }
    },
    getTabText: function (file: any) {
      // Returns a more appropriate tab text based on the user settings
      if (file.type !== 'file') {
        return file.name
      } else if (this.useTitle && typeof file.frontmatter?.title === 'string') {
        return file.frontmatter.title
      } else if (this.useH1 && file.firstHeading != null) {
        return file.firstHeading
      } else if (this.displayMdExtensions) {
        return file.name
      } else {
        return file.name.replace(file.ext, '')
      }
    },
    /**
     * Handles a click on the close button
     *
     * @param   {MouseEvent}  event  The triggering event
     * @param   {any}  file   The file descriptor
     */
    handleClickClose: function (event: MouseEvent, file: any) {
      if (event.button < 2) {
        // It was either a left-click (button === 0) or an auxiliary/middle
        // click (button === 1), so we should prevent the event from bubbling up
        // and triggering other events. If it was a right-button click
        // (button === 2), we should let it bubble up to the container to show
        // the context menu.
        // See: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#return_value
        event.stopPropagation()
      } else {
        return // We don't handle this event here.
      }

      ipcRenderer.invoke('application', {
        command: 'file-close',
        payload: file.path
      })
        .catch(e => console.error(e))
    },
    /**
     * Handles a click on the filename
     *
     * @param   {MouseEvent}  event  The triggering event
     * @param   {any}         file   The file descriptor
     */
    handleClickFilename: function (event: MouseEvent, file: any) {
      if (event.button === 0) {
        // It was a left-click. (We must check because otherwise we would also
        // perform this action on a right-click (button === 2), but that event
        // must be handled by the container).
        this.selectFile(file)
      }
    },
    /**
     * Handles a middle-mouse click on the filename
     *
     * Middle-mouse clicks are handled separately through a `mouseup` event,
     * to prevent unintentional pasting on Linux systems (#2663).
     *
     * @param   {MouseEvent}  event  The triggering event
     * @param   {any}         file   The file descriptor
     */
    handleMiddleMouseClick: function (event: MouseEvent, file: any) {
      if (event.button === 1) {
        // It was a middle-click (auxiliary button), so we should close
        // the file.
        event.preventDefault() // Otherwise, on Windows we'd have a middle-click-scroll
        this.handleClickClose(event, file)
      }
    },
    selectFile: function (file: any) {
      // NOTE: We're handling active file setting via the open-file command. As
      // long as a given file is already open, the document manager will simply
      // set it as active. That is why we don't provide the newTab property.
      ipcRenderer.invoke('application', {
        command: 'open-file',
        payload: { path: file.path }
      })
        .catch(e => console.error(e))
    },
    handleContextMenu: function (event: MouseEvent, file: any) {
      displayTabsContextMenu(event, file, (clickedID: string) => {
        if (clickedID === 'close-this') {
          // Close only this
          ipcRenderer.invoke('application', {
            command: 'file-close',
            payload: file.path
          }).catch(e => console.error(e))
        } else if (clickedID === 'close-others') {
          // Close all files ...
          for (const openFile of this.openFiles) {
            if (openFile === file) {
              continue // ... except this
            }

            ipcRenderer.invoke('application', {
              command: 'file-close',
              payload: openFile.path
            }).catch(e => console.error(e))
          }
        } else if (clickedID === 'close-all') {
          // Close all files
          for (const openFile of this.openFiles) {
            ipcRenderer.invoke('application', {
              command: 'file-close',
              payload: openFile.path
            }).catch(e => console.error(e))
          }
        } else if (clickedID === 'copy-filename') {
          // Copy the filename to the clipboard
          clipboard.writeText(file.name)
        } else if (clickedID === 'copy-path') {
          // Copy path to the clipboard
          clipboard.writeText(file.path)
        } else if (clickedID === 'copy-id') {
          // Copy the ID to the clipboard
          clipboard.writeText(file.id)
        }
      })
    },
    handleDragStart: function (event: DragEvent) {
      // console.log(event)
    },
    handleDrag: function (event: DragEvent) {
      const tab = event.target as Element
      const tablist = tab.parentNode as Element
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

      let swapItem: any = tab
      const elemAtCoords = document.elementFromPoint(coordsX, coordsY)
      if (elemAtCoords !== null) {
        swapItem = elemAtCoords
      }

      // We need to make sure we got the DIV, not one of the containing spans
      while (swapItem.getAttribute('role') !== 'tab') {
        if (swapItem.parentNode === document) {
          break // Don't overdo it
        }
        swapItem = swapItem.parentNode as Element
      }

      if (tablist === swapItem.parentNode) {
        swapItem = swapItem !== tab.nextSibling ? swapItem : swapItem.nextSibling
        tablist.insertBefore(tab, swapItem)
      }
    },
    handleDragEnd: function (event: DragEvent) {
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
      const targetElement = event.target as Element|null
      if (targetElement === null) {
        return
      }

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
})
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
  scroll-behavior: smooth;

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
  div#tab-container {
    border-bottom: none;

    div[role="tab"] {
      font-size: 12px;

      &:not(:last-child) {
        border-right: 1px solid rgb(180, 180, 180);
      }

      &.active {
        background-color: rgb(172, 172, 172);
        color: white;
      }

      .close {
        // The "x" needs to be bigger
        font-size: 18px;
      }
    }
  }

  &.dark {
    div#tab-container {
      background-color: rgb(11, 11, 11);

      div[role="tab"] {
        border-color: rgb(120, 120, 120);

        &:hover { background-color: rgb(53, 53, 53); }

        &.active {
          background-color: rgb(50, 50, 50);
        }
      }
    }
  }
}

body.linux {
  div#tab-container {
    div[role="tab"] {
      font-size: 12px;
      background-color: rgb(235, 235, 235); // Almost same colour as toolbar
      &:hover { background-color: rgb(200, 200, 200); }

      &:not(:last-child) { border-right: 1px solid rgb(200, 200, 200); }
      &.active { border-bottom: 3px solid var(--system-accent-color, --c-primary); } // TODO: Which colour?
      .close { font-size: 18px; }
    }
  }

  &.dark {
    div#tab-container {
      background-color: rgb(11, 11, 11);

      div[role="tab"] {
        border-color: rgb(120, 120, 120);
        background-color: #5a5a5a;

        &:hover { background-color: rgb(53, 53, 53); }
        &.active { background-color: rgb(50, 50, 50); }
      }
    }
  }
}
</style>
