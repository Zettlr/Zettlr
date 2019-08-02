/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Sidebar Vue Component
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls the sidebar logic.
 *
 * END HEADER
 */
<template>
  <div id="sidebar"
    v-on:mousemove="handleMouseOver"
    v-on:dragover="handleDragOver"
    v-bind:class="sidebarClass"
  >
    <!-- Display the arrow button in case we have a non-combined view -->
    <div
      v-on:click="toggleFileList"
      id="arrow-button"
      ref="arrowButton"
      class="hidden"
    >
    </div>
    <!-- Render a the file-tree -->
    <div id="component-container">
      <div id="file-tree" ref="directories" v-on:click="selectionListener">
        <template v-if="$store.state.items.length > 0">
          <div id="directories-files-header" v-show="getFiles.length > 0">Files</div>
            <tree-item
              v-for="item in getFiles"
              v-bind:obj="item"
              v-bind:key="item.hash"
              v-bind:depth="0"
            >
            </tree-item>
            <div id="directories-dirs-header" v-show="getDirectories.length > 0">Directories</div>
            <tree-item
              v-for="item in getDirectories"
              v-bind:obj="item"
              v-bind:key="item.hash"
              v-bind:depth="0"
            >
            </tree-item>
          </template>
          <template v-else>
            <div class="empty-tree" v-on:click="requestOpenRoot">
              <div class="info">{{ noRootsMessage }}</div>
            </div>
          </template>
        </div>
        <div id="file-list" class="hidden" ref="fileList">
          <template v-if="getDirectoryContents.length > 1">
            <file-item
              v-for="item in getDirectoryContents"
              v-bind:obj="item"
              v-bind:key="item.hash"
            >
          </file-item>
          </template>
          <template v-else-if="getDirectoryContents.length === 1">
            <file-item
              v-for="item in getDirectoryContents"
              v-bind:obj="item"
              v-bind:key="item.hash"
            >
          </file-item>
            <div class="empty-directory" v-if="getDirectoryContents[0].type === 'directory'">Empty directory</div>
          </template>
          <template v-else>
            <!-- Same as above: Detect combined sidebar mode -->
            <div class="empty-file-list">Please select a directory</div>
          </template>
        </div>
    </div>
    <div id="sidebar-inner-resizer" v-if="isExpanded" ref="sidebarInnerResizer" v-on:mousedown="sidebarStartInnerResize"></div>
    <div id="sidebar-resize" ref="sidebarResizer" v-on:mousedown="sidebarStartResize"></div>
  </div>
</template>

<script>
// Please do not ask me why I have to explicitly use the "default" property
// of some modules, but not others. The vue-loader is a mess when used with
// ES6 CommonJS-modules in a exports/require-environment.
const tippy = require('tippy.js').default
const findObject = require('../../source/common/util/find-object.js')
const { trans } = require('../../source/common/lang/i18n.js')
const TreeItem = require('./tree-item.vue').default
const FileItem = require('./file-item.vue').default

module.exports = {
  data: () => {
    return {
    previous: '', // Can be "file-list" or "directories"
    lockedTree: false, // Is the file tree locked in?
    sidebarResizing: false, // Only true during sidebar resizes
    sidebarResizeX: 0, // Save the resize cursor position during resizes
    sidebarInnerResizing: false,
    sidebarInnerResizeX: 0
  }
},
  components: {
    'tree-item': TreeItem,
    'file-item': FileItem
  },
  /**
   * Watches some properties to perform actions, if necessary.
   */
  watch: {
    /**
     * Switches to the fileList, if applicable.
     */
    selectedDirectory: function () {
      // If the directory just got de-selected and the fileList
      // is visible, switch to the directories.
      if (!this.selectedDirectory && this.isFileListVisible()) this.toggleFileList()
      // Otherwise make sure the fileList is visible (toggleFileList
      // will return if the mode is combined or expanded)
      else if (!this.isFileListVisible()) this.toggleFileList()
    },
    /**
     * Whenever the directoryContents change, determine if we should
     * display the file list.
     */
    getDirectoryContents: function () {
      // Will update even as the searchResults fill up
      if (this.$store.state.searchResults.length > 0 && !this.isFileListVisible()) this.toggleFileList()
      // Hide the fileList if search results get deleted and we are not in thin mode
      if (this.$store.state.searchResults.length < 1 &&
          this.isCombined &&
          this.isFileListVisible()) {
        this.$refs.fileList.classList.add('hidden')
        this.$refs.directories.classList.remove('hidden')
      }
    },
    /**
     * Listens to changes of the sidebarMode to reset
     * all styles to default for preventing display glitches.
     */
    sidebarMode: function () {
      // Reset all properties from the resize operations.
      this.$refs.directories.style.removeProperty('width')
      this.$refs.directories.style.removeProperty('left')
      this.$refs.fileList.style.removeProperty('width')
      this.$refs.fileList.style.removeProperty('left')
      this.$refs.directories.classList.remove('hidden')
      // Then we want to do some additional
      // failsafes for the different modes
      if (this.isThin || this.isCombined) this.$refs.fileList.classList.add('hidden')
      if (this.isExpanded) this.$refs.fileList.classList.remove('hidden')
      // Enlargen the sidebar, if applicable
      if (this.isExpanded && this.$el.offsetWidth < 100) this.$el.style.width = '100px'
    }
  },
  /**
   * Updates associated stuff whenever an update operation on the sidebar
   * has finished (such as tippy).
   */
  updated: function () {
    this.$nextTick(function () {
      // Update all tippy instances, where appropriate.
      tippy('#sidebar [data-tippy-content]', {
        delay: 100,
        arrow: true,
        duration: 100,
        flip: true,
        theme: 'light' // TODO: can be used to change to light in light mode (or better: vice versa)
      })
    })
  },
  computed: {
    /**
     * Mapper functions to map state properties onto the sidebar.
     */
    getFiles: function () { return this.$store.getters.rootFiles },
    getDirectories: function () { return this.$store.getters.rootDirectories },
    getDirectoryContents: function () { return this.$store.getters.directoryContents },
    selectedFile: function () { return this.$store.state.selectedFile },
    selectedDirectory: function () { return this.$store.state.selectedDirectory },
    sidebarClass: function () { return (this.isExpanded) ? 'expanded' : '' },
    isThin: function () { return this.$store.state.sidebarMode === 'thin' },
    isCombined: function () { return this.$store.state.sidebarMode === 'combined' },
    isExpanded: function () { return this.$store.state.sidebarMode === 'expanded' },
    // We need the sidebarMode separately to watch the property
    sidebarMode: function () { return this.$store.state.sidebarMode },
    noRootsMessage: function () { return trans('gui.empty_directories') }
  },
  methods: {
    /**
     * Determines whether the file list is currently visible
     * @returns {Boolean}  Whether the file list is visible.
     */
    isFileListVisible: function () {
      return !this.$refs.fileList.classList.contains('hidden')
    },
    /**
     * Toggles the fileList's visibility, if applicable.
     */
    toggleFileList: function () {
      if (this.isExpanded) return // Don't toggle if the mode is not thin
      // Toggle the fileList during combined mode only if there are search results
      if (this.isCombined && this.$store.state.searchResults.length < 1) return
      if (this.lockedTree) return // Don't toggle in case of a lockdown
      if (this.isFileListVisible()) {
        // Display directories
        this.$refs.directories.classList.remove('hidden')
        this.$refs.fileList.classList.add('hidden')
        this.$refs.arrowButton.classList.add('hidden') // Hide the arrow button
      } else {
        // Display the file list
        this.$refs.directories.classList.add('hidden')
        this.$refs.fileList.classList.remove('hidden')
      }
    },
    /**
     * Display the arrow button for nagivation, if applicable.
     * @param {MouseEvent} evt The associated event.
     */
    handleMouseOver: function (evt) {
      // The fileList is not visible after all
      if (this.$refs.fileList.classList.contains('hidden')) return
      if (this.isExpanded) return
      // This only displays the arrow button if
      // it's in non-combined mode and the
      // fileList is displayed and the user moves
      // up to an area about 100px at the top
      if (this.combined && this.$store.state.searchResults.length < 1) return
      if (evt.clientY > 100) this.$refs.arrowButton.classList.add('hidden')
      else this.$refs.arrowButton.classList.remove('hidden')
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
      let elem = this.$refs.directories
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
      if (!this.isFileListVisible()) this.toggleFileList()
    },
    /**
     * Locks the directory tree (mostly in preparation for a drag operation)
     */
    lockDirectoryTree: function () {
      if (this.isExpanded) return // Don't lock the file tree if we aren't in a thin mode
      // This function is called whenever the file list
      // should be hidden and only the file tree should
      // be visible
      this.previous = this.isFileListVisible() ? 'file-list' : 'directories'
      if (this.isFileListVisible()) this.toggleFileList()
      this.lockedTree = true
    },
    /**
     * Unlocks the directory tree (mostly after a completed drag and drop operation)
     */
    unlockDirectoryTree: function () {
      if (this.isExpanded) return // Don't unlock the file tree if we aren't in a thin mode
      this.lockedTree = false
      if (this.previous === 'file-list') this.toggleFileList()
    },
    /**
     * Begins a sidebar resizing operation.
     * @param {MouseEvent} evt The associated event.
     */
    sidebarStartResize: function (evt) {
      // Begin a resize movement
      this.sidebarResizing = true
      this.sidebarResizeX = evt.clientX
      document.addEventListener('mousemove', this.sidebarResize)
      document.addEventListener('mouseup', this.sidebarStopResize)
    },
    /**
     * Resizes the sidebar according to the event's direction.
     * @param {MouseEvent} evt The associated event.
     */
    sidebarResize: function (evt) {
      // Resize the sidebar
      if (!this.sidebarResizing) return
      let x = this.sidebarResizeX - evt.clientX
      if (this.isExpanded && this.$refs.fileList.offsetWidth <= 50 && x > 0) return // Don't overdo it
      if (this.$el.offsetWidth <= 50 && x > 0) return // The sidebar shouldn't become less than this
      this.sidebarResizeX = evt.clientX
      this.$el.style.width = (this.$el.offsetWidth - x) + 'px'
      // TODO: This is monkey-patched, emit regular events, like a grown up
      $('#editor').css('left', this.$el.offsetWidth + 10 + 'px') // 10px resizer width
      if (this.isExpanded) {
        // We don't have a thin sidebar, so resize the fileList accordingly
        this.$refs.fileList.style.width = (this.$el.offsetWidth - this.$refs.directories.offsetWidth) + 'px'
      }
    },
    /**
     * Stops the sidebar resize on mouse button release.
     * @param {MouseEvent} evt The associated event.
     */
    sidebarStopResize: function (evt) {
      // Stop the resize movement
      this.sidebarResizing = false
      this.sidebarResizeX = 0
      document.removeEventListener('mousemove', this.sidebarResize)
      document.removeEventListener('mouseup', this.sidebarStopResize)
    },
    /**
     * Begins a resize of the inner sidebar components.
     * @param {MouseEvent} evt The associated event.
     */
    sidebarStartInnerResize: function (evt) {
      // Begin to resize the inner sidebar
      this.sidebarInnerResizing = true
      this.sidebarInnerResizeX = evt.clientX
      this.$el.addEventListener('mousemove', this.sidebarInnerResize)
      this.$el.addEventListener('mouseup', this.sidebarStopInnerResize)
    },
    /**
     * Resizes the inner components according to the drag direction.
     * @param {MouseEvent} evt The associated event.
     */
    sidebarInnerResize: function (evt) {
      if (!this.sidebarInnerResizing) return
      let x = this.sidebarInnerResizeX - evt.clientX
      // Make sure both the fileList and the tree view are at least 50 px in width
      if (!this.isThin && this.$refs.directories.offsetWidth <= 50 && x > 0) return
      if (!this.isThin && this.$refs.fileList.offsetWidth <= 50 && x < 0) return
      this.sidebarInnerResizeX = evt.clientX
      // Now resize everything accordingly
      this.$refs.directories.style.width = (this.$refs.directories.offsetWidth - x) + 'px'
      this.$refs.fileList.style.left = this.$refs.directories.offsetWidth + 'px'
      // Reposition the resizer handle exactly on top of the divider, hence
      // substract the half width
      this.$refs.sidebarInnerResizer.style.left = (this.$refs.directories.offsetWidth - 5) + 'px'
      this.$refs.fileList.style.width = (this.$el.offsetWidth - this.$refs.directories.offsetWidth) + 'px'
    },
    /**
     * Stops resizing of the inner elements on release of the mouse button.
     * @param {MouseEvent} evt The associated event
     */
    sidebarStopInnerResize: function (evt) {
      this.sidebarInnerResizing = false
      this.sidebarInnerResizeX = 0
      this.$el.removeEventListener('mousemove', this.sidebarInnerResize)
      this.$el.removeEventListener('mouseup', this.sidebarStopInnerResize)
    },
    /**
     * Called whenever the user clicks on the "No open files or folders"
     * message -- it requests to open a new folder from the main process.
     * @param  {MouseEvent} evt The click event.
     * @return {void}     Does not return.
     */
    requestOpenRoot: function (evt) { global.ipc.send('dir-open') }
  }
}
</script>
