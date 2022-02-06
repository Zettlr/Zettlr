<template>
  <div
    id="file-manager"
    role="region"
    aria-label="File Manager"
    v-bind:class="{ expanded: isExpanded }"
    v-on:keydown="maybeNavigate"
    v-on:mouseenter="maybeShowArrowButton"
    v-on:mousemove="maybeShowArrowButton"
    v-on:mouseleave="maybeShowArrowButton"
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

    <!-- Filter field -->
    <div class="file-manager-filter">
      <input
        ref="quickFilter"
        v-model="filterQuery"
        class="file-manager-filter-input"
        type="search"
        v-bind:placeholder="filterPlaceholder"
        v-on:focus="($event.target as HTMLInputElement).select()"
      />
    </div>

    <div id="component-container">
      <!-- Render a the file-tree -->
      <FileTree
        ref="directories"
        v-bind:is-visible="fileTreeVisible"
        v-bind:filter-query="filterQuery"
        v-on:selection="selectionListener"
      ></FileTree>
      <!-- Now render the file list -->
      <!--
        Why are we using both class: hidden (via isFileListVisible) as well
        as v-show? Well, there is a super weird display glitch that will show
        the file list and overlay it over the file tree if we start the app in
        combined mode sometimes. This somehow fixes it, but if anyone has an
        idea what is happening, please come forward.
      -->
      <FileList
        v-show="!isCombined"
        ref="fileList"
        v-bind:is-visible="isFileListVisible"
        v-bind:filter-query="filterQuery"
        v-on:lock-file-tree="lockDirectoryTree()"
      ></FileList>
    </div>
  </div>
</template>

<script lang="ts">
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
import findObject from '@common/util/find-object'
import FileTree from './file-tree.vue'
import FileList from './file-list.vue'
import { trans } from '@common/i18n-renderer'
import { nextTick, defineComponent } from 'vue'

const ipcRenderer = window.ipc

export default defineComponent({
  components: {
    FileTree,
    FileList
  },
  data: () => {
    return {
      previous: '', // Can be "file-list" or "directories"
      lockedTree: false, // Is the file tree locked in?
      fileManagerInnerResizing: false,
      fileManagerInnerResizeX: 0,
      // Whether file tree and list are visible
      fileTreeVisible: true,
      fileListVisible: false,
      filterQuery: ''
    }
  },
  computed: {
    /**
     * Mapper functions to map state properties onto the file manager.
     */
    selectedDirectory: function () {
      return this.$store.state.selectedDirectory
    },
    filterPlaceholder: function () {
      return trans('system.common.filter')
    },
    isThin: function () {
      return this.fileManagerMode === 'thin'
    },
    isCombined: function () {
      return this.fileManagerMode === 'combined'
    },
    isExpanded: function () {
      return this.fileManagerMode === 'expanded'
    },
    // We need the fileManagerMode separately to watch the property
    fileManagerMode: function () {
      return this.$store.state.config['fileManagerMode']
    },
    /**
     * Determines whether the file list is currently visible
     * @returns {Boolean}  Whether the file list is visible.
     */
    isFileListVisible: function () {
      return this.isExpanded === true || this.fileListVisible
    },
    getDirectoryContents: function () {
      return this.$store.getters.directoryContents
    }
  },
  watch: {
    /**
     * Switches to the fileList, if applicable.
     */
    selectedDirectory: function () {
      // Reset the local search when a new directory has been selected
      this.filterQuery = ''

      // If the directory just got de-selected and the fileList
      // is visible, switch to the directories.
      if (this.selectedDirectory === null && this.isFileListVisible === true) {
        this.toggleFileList()
      } else if (this.isFileListVisible === false) {
        // Otherwise make sure the fileList is visible (toggleFileList
        // will return if the mode is combined or expanded)
        this.toggleFileList()
      }
    },
    /**
     * Listens to changes of the fileManagerMode to reset
     * all styles to default for preventing display glitches.
     */
    fileManagerMode: function () {
      // Reset all properties from the resize operations.
      const fileTree = (this.$refs.directories as any).$el as HTMLElement
      const fileList = (this.$refs.fileList as any).$el as HTMLElement
      fileTree.style.removeProperty('width')
      fileTree.style.removeProperty('left')
      fileList.style.removeProperty('width')
      fileList.style.removeProperty('left')
      this.fileTreeVisible = true
      this.fileListVisible = false
      // Then we want to do some additional
      // failsafes for the different modes
      if (this.isExpanded === true) {
        this.fileListVisible = true
      }
      // Enlargen the file manager, if applicable
      if (this.isExpanded === true && this.$el.offsetWidth < 100) {
        this.$el.style.width = '100px'
      }
    }
  },
  mounted: function () {
    ipcRenderer.on('shortcut', (event, message) => {
      if (message === 'filter-files') {
        // Focus the filter on the next tick. Why? Because it might be that
        // the file manager is hidden, or the global search is visible. In both
        // cases we need to wait for the app to display the file manager.
        nextTick()
          .then(() => { (this.$refs['quickFilter'] as any).focus() })
          .catch(err => console.error(err))
      }
    })
  },
  methods: {
    /**
     * Toggles the fileList's visibility, if applicable.
     */
    toggleFileList: function () {
      if (this.isThin === false) {
        return // Do not toggle if we're not in thin mode.
      }

      if (this.lockedTree === true) {
        return // Don't toggle in case of a lockdown
      }

      // Switch back to directories in case of fileManagerMode changes
      if (!this.isThin && this.isFileListVisible === true) {
        this.fileTreeVisible = true
        this.fileListVisible = false
        ;(this.$refs.arrowButton as HTMLElement).classList.add('hidden') // Hide the arrow button
        return
      }

      if (this.isFileListVisible === true) {
        // Display directories
        this.fileTreeVisible = true
        this.fileListVisible = false
        ;(this.$refs.arrowButton as HTMLElement).classList.add('hidden') // Hide the arrow button
      } else {
        // Display the file list
        this.fileTreeVisible = false
        this.fileListVisible = true
      }
    },
    /**
     * Display the arrow button for nagivation, if applicable.
     * @param {MouseEvent} evt The associated event.
     */
    maybeShowArrowButton: function (evt: MouseEvent) {
      const canShowFileTree = this.isFileListVisible && this.isThin

      // Only show the button if the mouse is in the top of the file manager.
      // We're adding 10px padding to make sure we have some leeway in case of
      // sudden mouse movements.
      const { top, left, right } = this.$el.getBoundingClientRect()
      if (
        canShowFileTree &&
        evt.clientX >= left && evt.clientX <= right - 10 &&
        evt.clientY >= top + 10 && evt.clientY <= top + 200
      ) {
        (this.$refs.arrowButton as HTMLElement).classList.remove('hidden')
      } else {
        (this.$refs.arrowButton as HTMLElement).classList.add('hidden')
      }
    },
    maybeNavigate: function (evt: KeyboardEvent) {
      // If the file list is visible we can navigate
      if (this.isFileListVisible === true) {
        (this.$refs.fileList as any).navigate(evt)
      }
    },
    /**
     * Scrolls the directory tree if necessary to enable dropping of
     * elements onto elements currently out of viewport.
     * @param {DragEvent} evt The associated event.
     */
    handleDragOver: function (evt: DragEvent) {
      // We have to handle the dragging functionality manually, as all other
      // mouse and keyboard events are suppressed during a drag operation.
      // We need to scroll the tree container probably, and have to check it.
      let y = evt.clientY
      let elem = (this.$refs.directories as any).$el as HTMLElement
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
    handleWheel: function (event: WheelEvent) {
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
        if (this.isFileListVisible === false) {
          event.preventDefault()
          event.stopPropagation()
          this.toggleFileList()
        }
      } else if (event.deltaX < 0 && this.isFileListVisible === true) {
        // Switch to the tree view
        event.preventDefault()
        event.stopPropagation()
        this.toggleFileList()
      }
    },
    /**
     * Registers a click event on an item and toggles
     * the file list, if it's not visible.
     * @param {MouseEvent} evt The bubbled event.
     */
    selectionListener: function (evt: MouseEvent) {
      const target = evt.target as null|HTMLElement
      // No hash property? Nothing to do.
      if (target === null || target.dataset.hash === undefined) {
        return
      }

      const obj = findObject(this.$store.state.fileTree, 'hash', parseInt(target.dataset.hash), 'children')
      // Nothing found/type is a file? Return.
      if (obj != null || obj.type === 'file') return
      if (this.isFileListVisible === false) {
        this.toggleFileList()
      }
    },
    /**
     * Locks the directory tree (mostly in preparation for a drag operation)
     */
    lockDirectoryTree: function () {
      if (this.isThin === false) {
        return // Don't lock the file tree if we aren't in a thin mode
      }

      // This function is called whenever the file list
      // should be hidden and only the file tree should
      // be visible
      if (this.isFileListVisible === true) {
        this.previous = 'file-list'
        this.toggleFileList()
      }

      this.lockedTree = true
    },
    /**
     * Unlocks the directory tree (mostly after a completed drag and drop operation)
     */
    unlockDirectoryTree: function () {
      if (this.isThin === false) {
        return // Don't unlock the file tree if we aren't in a thin mode
      }

      this.lockedTree = false
      if (this.previous === 'file-list') {
        this.toggleFileList()
        this.previous = ''
      }
    },
    /**
     * Begins a resize of the inner file manager components.
     * @param {MouseEvent} evt The associated event.
     */
    fileManagerStartInnerResize: function (evt: MouseEvent) {
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
    fileManagerInnerResize: function (evt: MouseEvent) {
      if (this.fileManagerInnerResizing === false) {
        return
      }

      const fileTree = (this.$refs.directories as any).$el as HTMLElement
      const fileList = (this.$refs.fileList as any).$el as HTMLElement

      // x > 0 means: Direction -->
      // x < 0 means: Direction <--
      let x = evt.clientX - this.fileManagerInnerResizeX
      // Make sure both the fileList and the tree view are at least 50 px in width
      if (this.isThin === false && fileTree.offsetWidth <= 50 && x !== 0) {
        x = 0
      }

      this.fileManagerInnerResizeX = evt.clientX
      // Now resize everything accordingly
      fileTree.style.width = (fileTree.offsetWidth + x) + 'px'
      fileList.style.left = (fileTree.offsetWidth + x) + 'px'
      fileList.style.width = (this.$el.offsetWidth - fileTree.offsetWidth + x) + 'px'
      // Reposition the resizer handle exactly on top of the divider, hence
      // substract the half width
      ;(this.$refs.fileManagerInnerResizer as HTMLElement).style.left = (fileTree.offsetWidth + x - 5) + 'px'
    },
    /**
     * Stops resizing of the inner elements on release of the mouse button.
     * @param {MouseEvent} evt The associated event
     */
    fileManagerStopInnerResize: function (evt: MouseEvent) {
      this.fileManagerInnerResizing = false
      this.fileManagerInnerResizeX = 0
      this.$el.removeEventListener('mousemove', this.fileManagerInnerResize)
      this.$el.removeEventListener('mouseup', this.fileManagerStopInnerResize)
    }
  }
})
</script>

<style lang="less">
body #file-manager {
  width: 100%;
  height: 100%;

  #component-container {
    overflow-x: hidden;
    // NOTE: Due to everything being relative, the component container is file-tree + file-list high
    overflow-y: hidden;
    position: relative;
    width: 100%;
    height: calc(100% - 37px); // 100% minus the filter
  }

  &.expanded {
    #file-tree, #file-list { width: 50%; }
    #file-list, #file-list.hidden { left: 50%; }
    #file-tree, #file-tree.hidden { left: 0%; }
  }

  // File manager arrow button
  #arrow-button {
    line-height: 25px;
    text-align: center;
    vertical-align: middle;
    background-color: white;
    border-radius: 100%;
    box-shadow: 1px 1px 10px 0px rgba(0, 0, 0, .25);
    z-index: 400;

    position: absolute;
    top: 50px;
    left: 10px;
    width: 30px;
    height: 30px;
    transition: 0.4s left ease;

    &.hidden { left:-60px; }
  }

  .file-manager-filter {
    padding: 5px;
    position: sticky;
    top: 0;
    z-index: 2;
    left: 0;
    right: 0;
    height: 37px;

    .file-manager-filter-input {
      border: 1px solid transparent;
      padding: 5px;
      width: 100%;
    }
  }
}

body.dark #file-manager {
  #arrow-button {
    background-color: rgb(80, 80, 80);
    color: rgb(230, 230, 230);
  }
}

body.darwin {
  #file-manager {
    border-top: 1px solid #d5d5d5;

    #component-container { height: calc(100% - 30px); }

    .file-manager-filter {
      background-color: transparent;
      height: 30px;
      padding: 4px;

      .file-manager-filter-input {
        background-color: rgb(255, 255, 255, 0.6);
        width: 100%;
        font-size: 11px;
        height: calc(30px - 9px);
      }
    }
  }

  &.dark {
    #file-manager {
      border-top-color: #505050;

      .file-manager-filter .file-manager-filter-input {
        background-color: rgb(100, 100, 100, 0.6);

        &::placeholder { color: rgb(150, 150, 150); }
      }
    }
  }
}

body.win32 {
  #file-manager {
    #component-container {
      height: calc(100% - 34px);
    }

    .file-manager-filter {
      padding: 0;
      border-bottom: 2px solid rgb(230, 230, 230);
      height: 32px; // The border should be *below* the 30px mark

      .file-manager-filter-input { height: 30px; }
    }
  }

  &.dark #file-manager {
    .file-manager-filter {
      border-bottom-color: rgb(40, 40, 50);
    }
  }
}
</style>
