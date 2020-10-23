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
    v-bind:class="getClass"
    v-on:mousemove="handleMouseOver"
    v-on:mouseleave="handleMouseOver"
    v-on:dragover="handleDragOver"
  >
    <!-- Display the arrow button in case we have a non-combined view -->
    <div
      id="arrow-button"
      ref="arrowButton"
      class="hidden"
      v-on:click="toggleFileList"
    >
      <clr-icon shape="caret left" class="is-solid" size="20"></clr-icon>
    </div>
    <!-- Render a the file-tree -->
    <div id="component-container">
      <div
        id="file-tree"
        ref="directories"
        v-on:click="selectionListener"
      >
        <template v-if="$store.state.items.length > 0">
          <div
            v-show="getFiles.length > 0"
            id="directories-files-header"
          >
            <clr-icon shape="file"></clr-icon>{{ fileSectionHeading }}
          </div>
          <tree-item
            v-for="item in getFiles"
            v-bind:key="item.hash"
            v-bind:obj="item"
            v-bind:depth="0"
          >
          </tree-item>
          <div
            v-show="getDirectories.length > 0"
            id="directories-dirs-header"
          >
            <clr-icon shape="tree-view"></clr-icon>{{ workspaceSectionHeading }}
          </div>
          <tree-item
            v-for="item in getDirectories"
            v-bind:key="item.hash"
            v-bind:obj="item"
            v-bind:depth="0"
          >
          </tree-item>
        </template>
        <template v-else>
          <div
            class="empty-tree"
            v-on:click="requestOpenRoot"
          >
            <div class="info">
              {{ noRootsMessage }}
            </div>
          </div>
        </template>
      </div>
      <!-- Now render the file list -->
      <div
        id="file-list"
        ref="fileList"
        class="hidden"
        tabindex="1"
        v-bind:data-hash="selectedDirectoryHash"
        v-on:keydown="navigate"
      >
        <template v-if="emptySearchResults">
          <!-- Did we have no search results? -->
          <div class="empty-file-list">
            {{ noResultsMessage }}
          </div>
        </template>
        <template v-else-if="getDirectoryContents.length > 1">
          <!--
            For the "real" file list, we need the virtual scroller to maintain
            performance, because it may contain thousands of elements.
            Provide the virtual scroller with the correct size of the list
            items (60px in mode with meta-data, 30 in cases without).
            NOTE: The page-mode MUST be true, because it will speed up
            performance incredibly!
          -->
          <recycle-scroller
            v-slot="{ item }"
            v-bind:items="getDirectoryContents"
            v-bind:item-size="($store.state.fileMeta) ? 61 : 31"
            v-bind:emit-update="true"
            v-bind:page-mode="true"
            v-on:update="updateDynamics"
          >
            <file-item v-bind:obj="item.props"></file-item>
          </recycle-scroller>
        </template>
        <template v-else-if="getDirectoryContents.length === 1">
          <file-item
            v-for="item in getDirectoryContents"
            v-bind:key="item.hash"
            v-bind:obj="item.props"
          >
          </file-item>
          <div
            v-if="getDirectoryContents[0].type === 'directory'"
            class="empty-directory"
          >
            {{ emptyDirectoryMessage }}
          </div>
        </template>
        <template v-else>
          <!-- Same as above: Detect combined file manager mode -->
          <div class="empty-file-list">
            {{ emptyFileListMessage }}
          </div>
        </template>
      </div>
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
/* global $ */
// Please do not ask me why I have to explicitly use the "default" property
// of some modules, but not others. The vue-loader is a mess when used with
// ES6 CommonJS-modules in a exports/require-environment.
const tippy = require('tippy.js').default
const findObject = require('../../../common/util/find-object')
const { trans } = require('../../../common/lang/i18n')
const TreeItem = require('./tree-item.vue').default
const FileItem = require('./file-item.vue').default
const { RecycleScroller } = require('vue-virtual-scroller')

module.exports = {
  data: () => {
    return {
      previous: '', // Can be "file-list" or "directories"
      lockedTree: false, // Is the file tree locked in?
      fileManagerResizing: false, // Only true during file manager resizes
      fileManagerResizeX: 0, // Save the resize cursor position during resizes
      fileManagerInnerResizing: false,
      fileManagerInnerResizeX: 0
    }
  },
  components: {
    'tree-item': TreeItem,
    'file-item': FileItem,
    'recycle-scroller': RecycleScroller
  },
  /**
   * Watches some properties to perform actions, if necessary.
   */
  watch: {
    /**
     * Switches to the fileList, if applicable.
     */
    selectedDirectoryHash: function () {
      // If the directory just got de-selected and the fileList
      // is visible, switch to the directories.
      if (!this.selectedDirectoryHash && this.isFileListVisible()) this.toggleFileList()
      // Otherwise make sure the fileList is visible (toggleFileList
      // will return if the mode is combined or expanded)
      else if (!this.isFileListVisible()) this.toggleFileList()
    },
    selectedFile: function () { this.scrollIntoView() },
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

      // As soon as the directory contents have changed, scroll to the right file
      this.$nextTick(function () { this.scrollIntoView() })
    },
    /**
     * Listens to changes of the fileManagerMode to reset
     * all styles to default for preventing display glitches.
     */
    fileManagerMode: function () {
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
      // Enlargen the file manager, if applicable
      if (this.isExpanded && this.$el.offsetWidth < 100) this.$el.style.width = '100px'
    }
  },
  /**
   * Updates associated stuff whenever an update operation on the file manager
   * has finished (such as tippy).
   */
  updated: function () {
    this.$nextTick(function () {
      this.updateDynamics()
    })
  },
  computed: {
    /**
     * Mapper functions to map state properties onto the file manager.
     */
    getFiles: function () { return this.$store.getters.rootFiles },
    getDirectories: function () { return this.$store.getters.rootDirectories },
    getDirectoryContents: function () {
      let ret = []
      for (let i = 0; i < this.$store.getters.directoryContents.length; i++) {
        ret.push({
          id: i, // This helps the virtual scroller to adequately position the items
          props: this.$store.getters.directoryContents[i] // The actual item
        })
      }
      return ret
    },
    selectedFile: function () { return this.$store.state.selectedFile },
    selectedDirectoryHash: function () { return this.$store.state.selectedDirectory },
    getClass: function () { return (this.isExpanded) ? 'expanded' : '' },
    isThin: function () { return this.$store.state.fileManagerMode === 'thin' },
    isCombined: function () { return this.$store.state.fileManagerMode === 'combined' },
    isExpanded: function () { return this.$store.state.fileManagerMode === 'expanded' },
    // We need the fileManagerMode separately to watch the property
    fileManagerMode: function () { return this.$store.state.fileManagerMode },
    noRootsMessage: function () { return trans('gui.empty_directories') },
    noResultsMessage: function () { return trans('gui.no_search_results') },
    fileSectionHeading: function () { return trans('gui.files') },
    workspaceSectionHeading: function () { return trans('gui.workspaces') },
    emptyFileListMessage: function () { return trans('gui.no_dir_selected') },
    emptyDirectoryMessage: function () { return trans('gui.empty_dir') },
    emptySearchResults: function () { return this.$store.state.searchNoResults }
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
      // TODO: Handle the case where the mouse is outside this element.
      // The fileList is not visible after all
      if (this.$refs.fileList.classList.contains('hidden')) return
      if (this.isExpanded) return
      // This only displays the arrow button if
      // it's in non-combined mode and the
      // fileList is displayed and the user moves
      // up to an area about 100px at the top
      if (this.combined && this.$store.state.searchResults.length < 1) return
      if (evt.clientY > 100 || evt.clientY < this.$el.offsetTop || evt.clientX < 0 || evt.clientX > this.$el.offsetWidth) {
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
      if (!this.fileManagerResizing) return
      let x = this.fileManagerResizeX - evt.clientX
      if (this.isExpanded && this.$refs.fileList.offsetWidth <= 50 && x > 0) return // Don't overdo it
      if (this.$el.offsetWidth <= 50 && x > 0) return // The file manager shouldn't become less than this
      this.fileManagerResizeX = evt.clientX
      this.$el.style.width = (this.$el.offsetWidth - x) + 'px'
      // TODO: This is monkey-patched, emit regular events, like a grown up
      $('#editor').css('left', this.$el.offsetWidth + 10 + 'px') // 10px resizer width
      if (this.isExpanded) {
        // We don't have a thin file manager, so resize the fileList accordingly
        this.$refs.fileList.style.width = (this.$el.offsetWidth - this.$refs.directories.offsetWidth) + 'px'
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
      if (!this.fileManagerInnerResizing) return
      let x = this.fileManagerInnerResizeX - evt.clientX
      // Make sure both the fileList and the tree view are at least 50 px in width
      if (!this.isThin && this.$refs.directories.offsetWidth <= 50 && x > 0) return
      if (!this.isThin && this.$refs.fileList.offsetWidth <= 50 && x < 0) return
      this.fileManagerInnerResizeX = evt.clientX
      // Now resize everything accordingly
      this.$refs.directories.style.width = (this.$refs.directories.offsetWidth - x) + 'px'
      this.$refs.fileList.style.left = this.$refs.directories.offsetWidth + 'px'
      // Reposition the resizer handle exactly on top of the divider, hence
      // substract the half width
      this.$refs.fileManagerInnerResizer.style.left = (this.$refs.directories.offsetWidth - 5) + 'px'
      this.$refs.fileList.style.width = (this.$el.offsetWidth - this.$refs.directories.offsetWidth) + 'px'
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
    },
    /**
     * Called whenever the user clicks on the "No open files or folders"
     * message -- it requests to open a new folder from the main process.
     * @param  {MouseEvent} evt The click event.
     * @return {void}     Does not return.
     */
    requestOpenRoot: function (evt) { global.ipc.send('dir-open') },
    /**
     * Called everytime when there is an update to the DOM, so that we can
     * dynamically enable all newly rendered tippy instances.
     * @return {void}     Does not return.
     */
    updateDynamics: function () {
      // Tippy.js cannot observe changes within attributes, so because
      // the instances are all created in advance, we have to update
      // the content so that it reflects the current content of
      // the data-tippy-content-property.
      let elements = document.querySelectorAll('#file-manager [data-tippy-content]')
      for (let elem of elements) {
        // Either there's already an instance on the element,
        // then only update its contents ...
        if (elem.hasOwnProperty('_tippy')) {
          elem._tippy.setContent(elem.dataset.tippyContent)
        } else {
          // ... or there is none, so let's add a tippy instance.
          tippy(elem, {
            delay: 100,
            arrow: true,
            duration: 100
          })
        }
      }
    },
    /**
     * Navigates the filelist to the next/prev file.
     * Hold Shift for moving by 10 files, Command or Control to
     * jump to the very end.
     */
    navigate: function (evt) {
      // Only capture arrow movements
      if (![ 'ArrowDown', 'ArrowUp' ].includes(evt.key)) return
      evt.stopPropagation()
      evt.preventDefault()

      // getDirectoryContents accomodates the virtual scroller
      // by packing the actual items in a props property.
      let list = this.getDirectoryContents.map(e => e.props)
      list = list.filter(e => e.type === 'file')
      let index = list.indexOf(list.find(e => e.hash === this.selectedFile))

      switch (evt.key) {
        case 'ArrowDown':
          index++
          if (evt.shiftKey) index += 9 // Fast-scrolling
          if (index >= list.length) index = list.length - 1
          if (evt.ctrlKey || evt.metaKey) {
            // Select the last file
            global.editor.announceTransientFile(list[list.length - 1].hash)
            return global.ipc.send('file-get', list[list.length - 1].hash)
          }
          if (index < list.length) {
            global.editor.announceTransientFile(list[index].hash)
            global.ipc.send('file-get', list[index].hash)
          }
          break
        case 'ArrowUp':
          index--
          if (evt.shiftKey) index -= 9 // Fast-scrolling
          if (index < 0) index = 0
          if (evt.ctrlKey || evt.metaKey) {
            // Select the first file
            global.editor.announceTransientFile(list[0].hash)
            return global.ipc.send('file-get', list[0].hash)
          }
          if (index >= 0) {
            global.editor.announceTransientFile(list[index].hash)
            global.ipc.send('file-get', list[index].hash)
          }
          break
      }
    },
    scrollIntoView: function () {
      // In case the file changed, make sure it's in view.
      let scrollTop = this.$refs.fileList.scrollTop
      let index = this.getDirectoryContents.find(e => e.props.hash === this.selectedFile)
      if (!index) return
      index = this.getDirectoryContents.indexOf(index)
      let modifier = (this.$store.state.fileMeta) ? 61 : 31
      let position = index * modifier
      if (position < scrollTop) this.$refs.fileList.scrollTop = position
      else if (position > scrollTop + this.$refs.fileList.offsetHeight - modifier) {
        this.$refs.fileList.scrollTop = position - this.$refs.fileList.offsetHeight + modifier
      }
    }
  }
}
</script>
