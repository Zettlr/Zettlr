<template>
  <div
    v-bind:class="{
      'document-tablist-wrapper': true,
      'scrollers-active': showScrollers
    }"
  >
    <!-- Left scroller arrow -->
    <div v-if="showScrollers" class="scroller left" v-on:click="scrollLeft()">
      <cds-icon shape="angle" direction="left"></cds-icon>
    </div>
    <!-- Right scroller arrow -->
    <div v-if="showScrollers" class="scroller right" v-on:click="scrollRight()">
      <cds-icon shape="angle" direction="right"></cds-icon>
    </div>

    <div
      ref="container"
      role="tablist"
      v-bind:class="{ 'tab-container': true }"
      v-on:contextmenu="handleTabbarContext($event)"
      v-on:dragover="handleExternalDragover"
      v-on:dragend="handleExternalDragleave"
    >
      <div
        v-for="file in openFiles"
        v-bind:key="file.path"
        v-bind:class="{
          active: activeFile !== null && file.path === activeFile.path,
          modified: modifiedPaths.includes(file.path),
          pinned: file.pinned
        }"
        v-bind:title="file.path"
        v-bind:data-path="file.path"
        v-bind:draggable="true"
        role="tab"
        v-on:dragstart="handleDragStart($event, file.path)"
        v-on:drag="handleDrag"
        v-on:dragend="handleDragEnd"
        v-on:contextmenu.stop="handleContextMenu($event, file)"
        v-on:mouseup="handleMiddleMouseClick($event, file)"
        v-on:mousedown="handleClickFilename($event, file)"
      >
        <span
          class="filename"
          role="button"
        >
          <cds-icon v-if="file.pinned" shape="pin"></cds-icon>
          {{ getTabText(file) }}
          <span v-if="hasDuplicate(file)" class="deduplicate">{{ getDirBasename(file) }}</span>
        </span>
        <span
          v-if="!file.pinned"
          class="close"
          aria-hidden="true"
          v-on:mousedown.stop.prevent="handleClickClose($event, file)"
        >&times;</span>
      </div>

      <div
        v-if="documentTabDragOver"
        v-bind:class="{
          dropzone: true,
          dragover: true
        }"
        v-on:drop="handleExternalDrop"
        v-on:dragover="handleExternalDragover"
        v-on:dragleave="handleExternalDragleave"
        v-on:dragend="handleExternalDragleave"
      >
      </div>
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

import displayTabsContextMenu, { displayTabbarContext } from './tabs-context'
import tippy from 'tippy.js'
import { nextTick, defineComponent } from 'vue'
import { OpenDocument, LeafNodeJSON } from '@dts/common/documents'
import { CodeFileDescriptor, MDFileDescriptor } from '@dts/common/fsal'

const ipcRenderer = window.ipc
const clipboard = window.clipboard
const path = window.path

export default defineComponent({
  name: 'DocumentTabs',
  props: {
    leafId: {
      type: String,
      required: true
    },
    windowId: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      showScrollers: false,
      resizeObserver: new ResizeObserver(() => {
        this.maybeActivateScrollers()
      }),
      // Is there a document being dragged over this tabbar?
      documentTabDragOver: false,
      // Is the document originating from here? (If so we should not display the
      // dropzone)
      documentTabDragOverOrigin: false
    }
  },
  computed: {
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
    },
    node (): LeafNodeJSON|undefined {
      return this.$store.state.paneData.find((leaf: LeafNodeJSON) => leaf.id === this.leafId)
    },
    openFiles (): OpenDocument[] {
      return this.node?.openFiles ?? []
    },
    activeFile (): OpenDocument|null {
      return this.node?.activeFile ?? null
    },
    modifiedPaths (): string[] {
      return this.$store.state.modifiedDocuments
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
    },
    openFiles: function () {
      this.maybeActivateScrollers()
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
        if (this.$store.state.lastLeafId !== this.leafId) {
          return // Otherwise all document tabs would close one file at the same
          // time
        }
        // The tab bar has the responsibility to first close the activeFile if
        // there is one. If there is none, it should send a request to close
        // this window as if the user had clicked on the close-button.
        if (currentIdx > -1) {
          // There's an active file, so request the closure
          ipcRenderer.invoke('documents-provider', {
            command: 'close-file',
            payload: {
              path: this.openFiles[currentIdx].path,
              leafId: this.leafId,
              windowId: this.windowId
            }
          })
            .catch(e => console.error(e))
        } else {
          // No more open files, so request closing of the window
          // TODO: This must be managed centrally
          // ipcRenderer.send('window-controls', { command: 'win-close' })
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
        input.value = path.basename(this.openFiles[currentIdx].path)

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

    this.resizeObserver.observe(this.container)
  },
  unmounted () {
    this.resizeObserver.unobserve(this.container)
  },
  methods: {
    maybeActivateScrollers () {
      // First, get the total available width for the container
      const containerWidth = this.container.getBoundingClientRect().width
      // Second, get the total width of all tabs
      const tabWidth = Array.from(
        this.container.querySelectorAll<HTMLDivElement>('[role="tab"]')
      )
        .map(elem => elem.getBoundingClientRect().width)
        .reduce((width, acc) => width + acc, 0)

      // If the total width of all tabs is larger, activate the scrollers, else
      // disable them
      this.showScrollers = tabWidth > containerWidth
    },
    scrollActiveFileIntoView: function () {
      // First, we need to find the tab displaying the active file
      const elem = this.container.querySelector('.active') as HTMLDivElement|null
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
    scrollLeft: function () {
      if (this.container.scrollLeft === 0) {
        return // Can't scroll further
      }

      // Get the first partially hidden file from the right. For that we first
      // need a list of all tabs. NOTE that we have to convert the nodelist to
      // an array manually. Also, we know every element will be a DIV.
      const tabs = [...this.container.querySelectorAll('[role="tab"]')] as HTMLDivElement[]

      // Then, get the first one for which the left edge is less than the scrollLeft
      // property, but the right edge is bigger.
      for (const tab of tabs) {
        const left = tab.offsetLeft
        const right = left + tab.getBoundingClientRect().width
        const leftEdge = this.container.scrollLeft

        if (left < leftEdge && right >= leftEdge) {
          tab.scrollIntoView()
          break
        }
      }
    },
    scrollRight: function () {
      // Similar to scrollLeft, this does the same for the right hand side
      const tabs = [...this.container.querySelectorAll('[role="tab"]')] as HTMLDivElement[]

      // Then, get the first one for which the right edge is less than the scrollLeft
      // property, but the right edge is bigger.
      const rightEdge = this.container.scrollLeft + this.container.getBoundingClientRect().width + 1
      for (const tab of tabs) {
        const left = tab.offsetLeft
        const right = left + tab.getBoundingClientRect().width

        if (left <= rightEdge && right > rightEdge) {
          tab.scrollIntoView()
          break
        }
      }
    },
    getTabText: function (doc: OpenDocument) {
      // Returns a more appropriate tab text based on the user settings
      const file = this.$store.getters.file(doc.path) as MDFileDescriptor|CodeFileDescriptor|undefined
      if (file === undefined) {
        return path.basename(doc.path)
      }

      if (file.type !== 'file') {
        return file.name
      } else if (this.useTitle && file.yamlTitle !== undefined) {
        return file.yamlTitle
      } else if (this.useH1 && file.firstHeading != null) {
        return file.firstHeading
      } else if (this.displayMdExtensions) {
        return file.name
      } else {
        return file.name.replace(file.ext, '')
      }
    },
    hasDuplicate (doc: OpenDocument) {
      const focalTabname = this.getTabText(doc).toLowerCase()
      const duplicates = this.openFiles.filter(doc => {
        return this.getTabText(doc).toLowerCase() === focalTabname
      })

      // NOTE that `doc` is also contained in `openFiles`, i.e. we should have 1
      return duplicates.length !== 1
    },
    getDirBasename (doc: OpenDocument) {
      return path.basename(path.dirname(doc.path))
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
        event.preventDefault()
      } else {
        return // We don't handle this event here.
      }

      ipcRenderer.invoke('documents-provider', {
        command: 'close-file',
        payload: {
          path: file.path,
          windowId: this.windowId,
          leafId: this.leafId
        }
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
    selectFile: function (file: OpenDocument) {
      // NOTE: We're handling active file setting via the open-file command. As
      // long as a given file is already open, the document manager will simply
      // set it as active. That is why we don't provide the newTab property.
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: { path: file.path, windowId: this.windowId, leafId: this.leafId }
      })
        .catch(e => console.error(e))
    },
    handleTabbarContext: function (event: MouseEvent) {
      // If the person didn't click on a file, let them to close the whole leaf
      displayTabbarContext(event, (clickedID: string) => {
        if (clickedID === 'close-leaf') {
          ipcRenderer.invoke('documents-provider', {
            command: 'close-leaf',
            payload: {
              leafId: this.leafId,
              windowId: this.windowId
            }
          }).catch(e => console.error(e))
        }
      })
    },
    handleContextMenu: function (event: MouseEvent, doc: OpenDocument) {
      const file = this.$store.getters.file(doc.path) as MDFileDescriptor|CodeFileDescriptor|undefined
      if (file === undefined) {
        return
      }

      displayTabsContextMenu(event, file, doc, (clickedID: string) => {
        if (clickedID === 'close-this') {
          // Close only this
          ipcRenderer.invoke('documents-provider', {
            command: 'close-file',
            payload: {
              path: file.path,
              leafId: this.leafId,
              windowId: this.windowId
            }
          }).catch(e => console.error(e))
        } else if (clickedID === 'close-others') {
          // Close all files ...
          for (const openFile of this.openFiles) {
            if (openFile.path === file.path) {
              continue // ... except this
            }

            ipcRenderer.invoke('documents-provider', {
              command: 'close-file',
              payload: {
                path: openFile.path,
                leafId: this.leafId,
                windowId: this.windowId
              }
            }).catch(e => console.error(e))
          }
        } else if (clickedID === 'close-all') {
          // Close all files
          for (const openFile of this.openFiles) {
            ipcRenderer.invoke('documents-provider', {
              command: 'close-file',
              payload: {
                path: openFile.path,
                leafId: this.leafId,
                windowId: this.windowId
              }
            }).catch(e => console.error(e))
          }
        } else if (clickedID === 'copy-filename') {
          // Copy the filename to the clipboard
          clipboard.writeText(file.name)
        } else if (clickedID === 'copy-path') {
          // Copy path to the clipboard
          clipboard.writeText(file.path)
        } else if (clickedID === 'copy-id' && file.type === 'file') {
          // Copy the ID to the clipboard
          clipboard.writeText(file.id)
        } else if (clickedID === 'pin-tab') {
          // Toggle the pin status
          ipcRenderer.invoke('documents-provider', {
            command: 'set-pinned',
            payload: {
              path: doc.path,
              leafId: this.leafId,
              windowId: this.windowId,
              pinned: !doc.pinned
            }
          }).catch(e => console.error(e))
        }
      })
    },
    /**
     * Managed the begin of a drag of one of the internal document tabs we have
     * here on this tabbar.
     *
     * @param   {DragEvent}  event     The Drag event
     * @param   {string}     filePath  The file to be dragged
     */
    handleDragStart: function (event: DragEvent, filePath: string) {
      const DELIM = (process.platform === 'win32') ? ';' : ':'
      const data = `${this.windowId}${DELIM}${this.leafId}${DELIM}${filePath}`
      event.dataTransfer?.setData('zettlr/document-tab', data)
      this.documentTabDragOverOrigin = true
    },
    /**
     * This function handles internal document tabs (i.e. the reordering of
     * document tabs belonging to this tabbar)
     *
     * @param   {DragEvent}  event  The drag event
     */
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
      // Stop handling if the user drags the tab out of the document tab bar
      // This is so that editor instances can enable splitting via drag&drop
      if (coordsX < left - 10 || coordsX > right + 10 || coordsY < top - 10 || coordsY > bottom + 10) {
        return
      }

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
    /**
     * This event is solely used when the user drops a document tab onto the
     * origin tabbar to see if something has changed and resort the document
     * tabs as necessary.
     *
     * @param   {DragEvent}  event  The drag event
     */
    handleDragEnd: function (event: DragEvent) {
      this.documentTabDragOverOrigin = false
      // Here we just need to inspect the actual order and notify the main
      // process of that order.
      const newOrder = []
      for (let i = 0; i < this.$el.children.length; i++) {
        if (this.$el.children[i].getAttribute('role') !== 'tab') {
          // There may be other children in the element, such as the scrollers
          continue
        }
        const fpath = this.$el.children[i].getAttribute('data-path')
        newOrder.push(fpath)
      }

      const originalOrdering = this.openFiles.map(file => file.path)

      // Did the order change at all?
      let somethingChanged = false
      for (let i = 0; i < newOrder.length; i++) {
        if (newOrder[i] !== originalOrdering[i]) {
          somethingChanged = true
          break
        }
      }

      if (!somethingChanged) {
        return
      }

      // Now that we have the correct NEW ordering, we need to temporarily
      // restore the old ordering, because otherwise Vue will be confused since
      // it needs to keep track of the element ordering, and we just messed with
      // that big time.
      const targetElement = event.target as Element|null
      if (targetElement === null) {
        return
      }

      const dataPath = targetElement.getAttribute('data-path')

      if (dataPath === null) {
        return
      }

      const originalIndex = originalOrdering.indexOf(dataPath)
      if (originalIndex === 0) {
        this.$el.insertBefore(targetElement, this.$el.children[0])
      } else if (originalIndex === this.$el.children.length - 1) {
        this.$el.insertBefore(targetElement, null) // null means append at the end
      } else {
        this.$el.insertBefore(targetElement, this.$el.children[originalIndex + 1])
      }

      ipcRenderer.invoke('documents-provider', {
        command: 'sort-open-files',
        payload: {
          newOrder,
          windowId: this.windowId,
          leafId: this.leafId
        }
      })
        .catch(err => console.error(err))
    },
    /**
     * This function is used when something *external* has been dropped onto the
     * tabbar. In this case, we need to execute a move command (if applicable
     * analogously to the MainEditor component).
     *
     * @param   {DragEvent}  event  The drag event
     */
    handleExternalDrop: function (event: DragEvent) {
      this.documentTabDragOver = false
      const DELIM = (process.platform === 'win32') ? ';' : ':'
      const documentTab = event.dataTransfer?.getData('zettlr/document-tab')
      if (documentTab === undefined || !documentTab.includes(DELIM)) {
        return
      }

      // The user dropped the file onto the origin (this indicates a bug as
      // the dropzone shouldn't even be on the DOM in that case)
      if (this.documentTabDragOverOrigin) {
        console.error('A document tab has been dropped onto its origin, but the dropzone was in the DOM. This is a bug.')
        this.documentTabDragOverOrigin = false
        return
      }

      // At this point, we have received a drop we need to handle it. The drag
      // data contains both the origin and the path, separated by the $PATH
      // delimiter -> window:leaf:absPath
      const [ originWindow, originLeaf, filePath ] = documentTab.split(DELIM)
      // Now actually perform the act
      ipcRenderer.invoke('documents-provider', {
        command: 'move-file',
        payload: {
          originWindow,
          targetWindow: this.windowId,
          originLeaf,
          targetLeaf: this.leafId,
          path: filePath
        }
      })
        .catch(err => console.error(err))
    },
    /**
     * This event is used to indicate to the user if they can drop a document
     * tab onto this tabbar. This gives the tabbar a blue-ish shimmer (similarly
     * to the dropzones in the MainEditor component) to indicate that the user
     * can drop a document tab on here.
     *
     * @param   {DragEvent}  event  The drag event
     */
    handleExternalDragover: function (event: DragEvent) {
      if (this.documentTabDragOverOrigin) {
        return // The document tab is coming from this tabbar
      }

      const hasDocumentTab = event.dataTransfer?.types.includes('zettlr/document-tab') ?? false
      if (hasDocumentTab) {
        this.documentTabDragOver = true
      } else {
        console.log('Something else drag over.')
        this.documentTabDragOver = false
      }
    },
    /**
     * This is being called on dragleave and some other, related external events
     * to reset the internal state so that the dropzone disappears.
     *
     * @param   {DragEvent}  event  The drag event
     */
    handleExternalDragleave: function (event: DragEvent) {
      this.documentTabDragOver = false
    }
  }
})
</script>

<style lang="less">
@tabbar-height: 30px;

body div.document-tablist-wrapper {
  position: relative;

  &.scrollers-active { padding: 0 20px; }

  div.scroller {
    position: absolute;
    line-height: 30px;
    width: 20px;
    text-align: center;
    background-color: inherit;

    &:hover { background-color: rgb(200, 200, 210); }

    &.left { left: 0px; }
    &.right { right: 0px; }
  }
}

body div.tab-container {
  width: 100%;
  height: 30px;
  background-color: rgb(215, 215, 215);
  border-bottom: 1px solid grey;
  display: flex;
  overflow-x: auto;

  .dropzone {
    position: absolute;
    transition: all 0.3s ease;
    background-color: rgba(21, 61, 107, 0.5);
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }

  // In case of an overflow, hide the scrollbar so that scrolling left/right
  // remains possible, but no thicc scrollbar in the way!
  &::-webkit-scrollbar { display: none; }
  scroll-behavior: smooth;

  div[role="tab"] {
    display: flex;
    position: relative;
    min-width: fit-content;
    max-width: 250px;
    line-height: @tabbar-height;
    padding: 0 10px; // Give the filenames a little more spacing

    &:hover { background-color: rgb(200, 200, 210); }

    .filename {
      line-height: 30px;
      white-space: nowrap;

      .deduplicate {
        font-style: italic;
        font-size: 80%;
        opacity: 0.8;
      }
    }

    // Mark modification status classically
    &.modified .filename::before {
      content: '* '
    }

    .close {
      font-size: 14px;
      margin-left: 5px;
      width: 10px;
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
  div.document-tablist-wrapper {
    div.scroller {
      background-color: rgb(230, 230, 230);
      color: rgb(83, 83, 83);
      box-shadow: inset 0px 5px 4px -5px rgba(0, 0, 0, .4);

      &:hover { background-color: rgb(214, 214, 214); }

      &.left { border-right: 1px solid rgb(200, 200, 200); }
      &.right { border-left: 1px solid rgb(200, 200, 200); }
    }
  }

  div.tab-container {
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
        margin: 0 (@tabbar-height / 3 * 1.9);
        overflow: hidden;
      }

      &.pinned .filename { margin: 0; }

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
        position: absolute;
        right: 0px;
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
    div.document-tablist-wrapper {
      div.scroller {
        background-color: rgb(22, 22, 22);
        color: rgb(233, 233, 233);

        &:hover { background-color: rgb(32, 34, 36); }

        &.left { border-color: rgb(32, 34, 36); }
        &.right { border-color: rgb(32, 34, 36); }
      }
    }

    div.tab-container {
      border-bottom-color: rgb(11, 11, 11);
      background-color: rgb(22, 22, 22);

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
  div.document-tablist-wrapper {
    div.scroller {
      &.left { border-right: 1px solid rgb(180, 180, 180); }
      &.right { border-left: 1px solid rgb(180, 180, 180); }
    }
  }

  div.tab-container {
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
    }
  }

  &.dark {
    div.document-tablist-wrapper {
      div.scroller {
        &:hover { background-color: rgb(53, 53, 53); }

        &.left { border-color: rgb(120, 120, 120); }
        &.right { border-color: rgb(120, 120, 120) }
      }
    }

    div.tab-container {
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
  div.document-tablist-wrapper {
    div.scroller {
      line-height: 29px;
      background-color: rgb(235, 235, 235);
      &:hover { background-color: rgb(200, 200, 200); }

      &.left { border-right: 1px solid rgb(200, 200, 200); }
      &.right { border-left: 1px solid rgb(200, 200, 200); }
    }
  }
  div.tab-container {

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
    div.document-tablist-wrapper {
      div.scroller {
        background-color: #5a5a5a;
        &:hover { background-color: rgb(53, 53, 53); }

        &.left { border-color: 1px solid rgb(120, 120, 120); }
        &.right { border-color: 1px solid rgb(120, 120, 120); }
      }
    }

    div.tab-container {
      background-color: rgb(11, 11, 11);

      div[role="tab"] {
        border-color: rgb(120, 120, 120);
        background-color: #5a5a5a;

        &:hover { background-color: rgb(53, 53, 53); }
        &.active {
          background-color: rgb(50, 50, 50);
          border-bottom-color: var(--system-accent-color, --c-primary);
        }
      }
    }
  }
}
</style>
