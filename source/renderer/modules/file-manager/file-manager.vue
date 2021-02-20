/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File manager Vue Component
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls the file manager logic.
 *
 * END HEADER
 */
<template>
  <div
    id="file-manager"
    role="region"
    aria-label="File Manager"
    v-bind:class="{ expanded: isExpanded }"
    v-on:mousemove="handleMouseOver"
    v-on:mouseleave="handleMouseOver"
    v-on:dragover="handleDragOver"
    v-on:wheel="handleWheel"
    v-on:dragstart="lockDirectoryTree"
    v-on:dragend="unlockDirectoryTree"
  >
    <!-- Display the arrow button in case we have a non-combined view -->
    <div
      id="arrow-button"
      ref="arrowButton"
      class="hidden"
      v-on:click="toggleFileList"
    >
      <clr-icon
        role="presentation"
        shape="caret left"
        class="is-solid"
        size="20"
      ></clr-icon>
    </div>
    <div id="component-container">
      <!-- Render a the file-tree -->
      <FileTree
        ref="directories"
        v-bind:class="{ hidden: !fileTreeVisible }"
        v-on:selection="selectionListener"
      ></FileTree>
      <!-- Now render the file list -->
      <FileList
        ref="fileList"
        v-bind:class="{hidden: !fileListVisible}"
      ></FileList>
    </div>
    <div
      v-if="isExpanded"
      id="file-manager-inner-resizer"
      ref="fileManagerInnerResizer"
      v-on:mousedown="fileManagerStartInnerResize"
    ></div>
    <div
      id="file-manager-resize"
      ref="fileManagerResizer"
      v-on:mousedown="fileManagerStartResize"
    ></div>
  </div>
</template>

<script>
// Please do not ask me why I have to explicitly use the "default" property
// of some modules, but not others. The vue-loader is a mess when used with
// ES6 CommonJS-modules in a exports/require-environment.
import findObject from '../../../common/util/find-object'
import FileTree from './file-tree.vue'
import FileList from './file-list.vue'

export default {
  components: {
    FileTree,
    FileList
  },
  data: () => {
    return {
      previous: '', // Can be "file-list" or "directories"
      lockedTree: false, // Is the file tree locked in?
      fileManagerResizing: false, // Only true during file manager resizes
      fileManagerResizeX: 0, // Save the resize cursor position during resizes
      fileManagerInnerResizing: false,
      fileManagerInnerResizeX: 0,
      // Whether file tree and list are visible
      fileTreeVisible: true,
      fileListVisible: false
    }
  },
  computed: {
    /**
     * Mapper functions to map state properties onto the file manager.
     */
    selectedDirectoryHash: function () {
      return this.$store.state.selectedDirectory
    },
    isThin: function () {
      return this.$store.state.fileManagerMode === 'thin'
    },
    isCombined: function () {
      return this.$store.state.fileManagerMode === 'combined'
    },
    isExpanded: function () {
      return this.$store.state.fileManagerMode === 'expanded'
    },
    // We need the fileManagerMode separately to watch the property
    fileManagerMode: function () {
      return this.$store.state.fileManagerMode
    },
    /**
     * Determines whether the file list is currently visible
     * @returns {Boolean}  Whether the file list is visible.
     */
    isFileListVisible: function () {
      return this.isExpanded || this.fileListVisible
    },
    getDirectoryContents: function () {
      return this.$store.getters.directoryContents
    }
  },
  watch: {
    /**
     * Switches to the fileList, if applicable.
     */
    selectedDirectoryHash: function () {
      // If the directory just got de-selected and the fileList
      // is visible, switch to the directories.
      if (!this.selectedDirectoryHash && this.isFileListVisible) {
        this.toggleFileList()
      } else if (!this.isFileListVisible) {
        // Otherwise make sure the fileList is visible (toggleFileList
        // will return if the mode is combined or expanded)
        this.toggleFileList()
      }
    },
    /**
     * Whenever the directoryContents change, determine if we should
     * display the file list.
     */
    getDirectoryContents: function () {
      // Will update even as the searchResults fill up
      if (this.$store.state.searchResults.length > 0 && !this.isFileListVisible) {
        this.toggleFileList()
      }
      // Hide the fileList if search results get deleted and we are not in thin mode
      if (this.$store.state.searchResults.length < 1 &&
          this.isCombined &&
          this.isFileListVisible) {
        this.fileTreeVisible = true
        this.fileListVisible = false
      }
    },
    /**
     * Listens to changes of the fileManagerMode to reset
     * all styles to default for preventing display glitches.
     */
    fileManagerMode: function () {
      // Reset all properties from the resize operations.
      const fileTree = this.$refs.directories.$el
      const fileList = this.$refs.fileList.$el
      fileTree.style.removeProperty('width')
      fileTree.style.removeProperty('left')
      fileList.style.removeProperty('width')
      fileList.style.removeProperty('left')
      this.fileTreeVisible = true
      this.fileListVisible = false
      fileTree.classList.remove('hidden')
      // Then we want to do some additional
      // failsafes for the different modes
      if (this.isThin || this.isCombined) {
        this.fileListVisible = false
      }
      if (this.isExpanded) {
        this.fileListVisible = true
      }
      // Enlargen the file manager, if applicable
      if (this.isExpanded && this.$el.offsetWidth < 100) {
        this.$el.style.width = '100px'
      }
    }
  },
  methods: {
    /**
     * Toggles the fileList's visibility, if applicable.
     */
    toggleFileList: function () {
      if (this.isExpanded) {
        return // Don't toggle if the mode is not thin
      }

      // Toggle the fileList during combined mode only if there are search results
      if (this.isCombined && this.$store.state.searchResults.length < 1) {
        return
      }

      if (this.lockedTree) {
        return // Don't toggle in case of a lockdown
      }

      if (this.isFileListVisible) {
        // Display directories
        this.fileTreeVisible = true
        this.fileListVisible = false
        this.$refs.arrowButton.classList.add('hidden') // Hide the arrow button
      } else {
        // Display the file list
        this.fileTreeVisible = false
        this.fileListVisible = true
      }
    },
    /**
     * Set focus to the file list filter (the file list will then also have focus)
     */
    focusFilter: function () {
      if (this.isFileListVisible) {
        this.$refs.fileList.focusFilter()
      }
    },
    /**
     * Display the arrow button for nagivation, if applicable.
     * @param {MouseEvent} evt The associated event.
     */
    handleMouseOver: function (evt) {
      // TODO: Handle the case where the mouse is outside this element.
      // The fileList is not visible after all
      if (!this.isFileListVisible || this.isExpanded) {
        return
      }
      // This only displays the arrow button if
      // it's in non-combined mode and the
      // fileList is displayed and the user moves
      // up to an area about 100px at the top
      if (this.isCombined && this.$store.state.searchResults.length < 1) {
        return
      }

      if (evt.clientY > 150 || evt.clientY < this.$el.offsetTop || evt.clientX < 0 || evt.clientX > this.$el.offsetWidth) {
        this.$refs.arrowButton.classList.add('hidden')
      } else {
        this.$refs.arrowButton.classList.remove('hidden')
      }
    },
    /**
     * Scrolls the directory tree if necessary to enable dropping of
     * elements onto elements currently out of viewport.
     * @param {DragEvent} evt The associated event.
     */
    handleDragOver: function (evt) {
      // We have to handle the dragging functionality manually, as all other
      // mouse and keyboard events are suppressed during a drag operation.
      // We need to scroll the tree container probably, and have to check it.
      let y = evt.clientY
      let elem = this.$refs.directories.$el
      let scroll = elem.scrollTop
      let distanceBottom = elem.offsetHeight - y // The less the value, the closer
      let distanceTop = (scroll > 0) ? y - elem.offsetTop : 0
      if (elem.scrollHeight - scroll === elem.clientHeight) distanceBottom = 0
      // Now scroll if applicable. The calculations take care that
      // the scrolling is faster the closer to the edge the object
      // is
      if (distanceBottom > 0 && distanceBottom < 100) {
        elem.scrollTop += 10 - distanceBottom / 10
      }
      if (distanceTop > 0 && distanceTop < 100) {
        elem.scrollTop -= 10 - distanceTop / 10
      }
    },
    handleWheel: function (event) {
      // Determine if we can scroll back & forth
      if (process.platform !== 'darwin') {
        return // macOS only
      }

      if (event.deltaY !== 0) {
        return // Don't interfere with vertical scrolling
      }

      // Toggle back and forth depending on the current state. toggleFileList
      // will make sure to catch things such as whether we are in combined mode
      if (event.deltaX > 0) {
        // Switch to the file list
        if (!this.isFileListVisible) {
          event.preventDefault()
          event.stopPropagation()
          this.toggleFileList()
        }
      } else if (event.deltaX < 0) {
        // Switch to the tree view
        if (this.isFileListVisible) {
          event.preventDefault()
          event.stopPropagation()
          this.toggleFileList()
        }
      }
    },
    /**
     * Registers a click event on an item and toggles
     * the file list, if it's not visible.
     * @param {MouseEvent} evt The bubbled event.
     */
    selectionListener: function (evt) {
      // No hash property? Nothing to do.
      if (!evt.target.dataset.hasOwnProperty('hash')) return
      let obj = findObject(this.$store.state.items, 'hash', parseInt(evt.target.dataset.hash), 'children')
      // Nothing found/type is a file? Return.
      if (!obj || obj.type === 'file') return
      if (!this.isFileListVisible) this.toggleFileList()
    },
    /**
     * Locks the directory tree (mostly in preparation for a drag operation)
     */
    lockDirectoryTree: function () {
      if (this.isExpanded) {
        return // Don't lock the file tree if we aren't in a thin mode
      }

      // This function is called whenever the file list
      // should be hidden and only the file tree should
      // be visible
      if (this.isFileListVisible) {
        this.previous = 'file-list'
        this.toggleFileList()
      }

      this.lockedTree = true
    },
    /**
     * Unlocks the directory tree (mostly after a completed drag and drop operation)
     */
    unlockDirectoryTree: function () {
      if (this.isExpanded) {
        return // Don't unlock the file tree if we aren't in a thin mode
      }

      this.lockedTree = false
      if (this.previous === 'file-list') {
        this.toggleFileList()
        this.previous = ''
      }
    },
    /**
     * Begins a file manager resizing operation.
     * @param {MouseEvent} evt The associated event.
     */
    fileManagerStartResize: function (evt) {
      // Begin a resize movement
      this.fileManagerResizing = true
      this.fileManagerResizeX = evt.clientX
      document.addEventListener('mousemove', this.fileManagerResize)
      document.addEventListener('mouseup', this.fileManagerStopResize)
    },
    /**
     * Resizes the file manager according to the event's direction.
     * @param {MouseEvent} evt The associated event.
     */
    fileManagerResize: function (evt) {
      // Resize the file manager
      if (!this.fileManagerResizing) {
        return
      }

      const fileTree = this.$refs.directories.$el
      const fileList = this.$refs.fileList.$el

      let x = this.fileManagerResizeX - evt.clientX
      if (this.isExpanded && fileList.offsetWidth <= 50 && x > 0) {
        return // Don't overdo it
      }

      if (this.$el.offsetWidth <= 50 && x > 0) {
        return // The file manager shouldn't become less than this
      }

      this.fileManagerResizeX = evt.clientX
      this.$el.style.width = (this.$el.offsetWidth - x) + 'px'
      // TODO: This is monkey-patched, emit regular events, like a grown up
      // 10px resizer width
      document.getElementById('editor').style.left = this.$el.offsetWidth + 10 + 'px'
      if (this.isExpanded) {
        // We don't have a thin file manager, so resize the fileList accordingly
        fileList.style.width = (this.$el.offsetWidth - fileTree.offsetWidth) + 'px'
      }
    },
    /**
     * Stops the file manager resize on mouse button release.
     * @param {MouseEvent} evt The associated event.
     */
    fileManagerStopResize: function (evt) {
      // Stop the resize movement
      this.fileManagerResizing = false
      this.fileManagerResizeX = 0
      document.removeEventListener('mousemove', this.fileManagerResize)
      document.removeEventListener('mouseup', this.fileManagerStopResize)
    },
    /**
     * Begins a resize of the inner file manager components.
     * @param {MouseEvent} evt The associated event.
     */
    fileManagerStartInnerResize: function (evt) {
      // Begin to resize the inner file manager
      this.fileManagerInnerResizing = true
      this.fileManagerInnerResizeX = evt.clientX
      this.$el.addEventListener('mousemove', this.fileManagerInnerResize)
      this.$el.addEventListener('mouseup', this.fileManagerStopInnerResize)
    },
    /**
     * Resizes the inner components according to the drag direction.
     * @param {MouseEvent} evt The associated event.
     */
    fileManagerInnerResize: function (evt) {
      if (!this.fileManagerInnerResizing) {
        return
      }

      const fileTree = this.$refs.directories.$el
      const fileList = this.$refs.fileList.$el

      // x > 0 means: Direction -->
      // x < 0 means: Direction <--
      let x = evt.clientX - this.fileManagerInnerResizeX
      // Make sure both the fileList and the tree view are at least 50 px in width
      if (!this.isThin && fileTree.offsetWidth <= 50 && x < 0) {
        x = 0
      }

      if (!this.isThin && fileList.offsetWidth <= 50 && x > 0) {
        x = 0
      }

      this.fileManagerInnerResizeX = evt.clientX
      // Now resize everything accordingly
      fileTree.style.width = (fileTree.offsetWidth + x) + 'px'
      fileList.style.left = (fileTree.offsetWidth + x) + 'px'
      fileList.style.width = (this.$el.offsetWidth - fileTree.offsetWidth + x) + 'px'
      // Reposition the resizer handle exactly on top of the divider, hence
      // substract the half width
      this.$refs.fileManagerInnerResizer.style.left = (fileTree.offsetWidth + x - 5) + 'px'
    },
    /**
     * Stops resizing of the inner elements on release of the mouse button.
     * @param {MouseEvent} evt The associated event
     */
    fileManagerStopInnerResize: function (evt) {
      this.fileManagerInnerResizing = false
      this.fileManagerInnerResizeX = 0
      this.$el.removeEventListener('mousemove', this.fileManagerInnerResize)
      this.$el.removeEventListener('mouseup', this.fileManagerStopInnerResize)
    }
  }
}
</script>
