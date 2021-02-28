/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TreeItem Vue Component
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a single sub-tree in the file manager.
 *
 * END HEADER
 */

<template>
  <div
    class="container"
    v-bind:data-hash="obj.hash"
  >
    <div
      ref="listElement"
      v-bind:class="classList"
      v-bind:data-hash="obj.hash"
      v-bind:data-id="obj.id || ''"
      v-bind:style="{
        'padding-left': `${depth}em`
      }"
      v-bind:draggable="!isRoot"
      v-on:click="requestSelection"
      v-on:dragover="acceptDrags"
      v-on:dragstart="beginDragging"
      v-on:drag="onDragHandler"
      v-on:dragenter="enterDragging"
      v-on:dragleave="leaveDragging"
      v-on:drop="handleDrop"
      v-on:mouseenter="hover=true"
      v-on:mouseleave="hover=false"
      v-on:contextmenu="handleContextMenu"
    >
      <!-- First: Primary icon (either directory icon, file icon, or project icon) -->
      <span
        class="item-icon"
        role="presentation"
      >
        <!-- Is this a project? -->
        <clr-icon
          v-if="obj.project && hasChildren"
          shape="blocks-group"
          class="is-solid"
        />
        <!-- Display a custom icon, if applicable -->
        <clr-icon
          v-else-if="isDirectory && hasChildren"
          v-show="obj.icon"
          v-bind:shape="obj.icon"
        />
        <!-- Display a file icon -->
        <clr-icon
          v-else-if="obj.type === 'file' && hasChildren"
          shape="file"
        />
      </span> <!-- End primary (item) icon -->
      <!-- Second: Secondary icon (the collapse/expand icon) -->
      <span
        class="toggle-icon"
        role="presentation"
      >
        <!-- Display a toggle to collapse/expand the file list -->
        <!-- Only display in this position if the item has a primary icon -->
        <clr-icon
          v-if="hasChildren"
          v-bind:shape="indicatorShape"
          v-on:click.stop="toggleCollapse"
        />
        <!-- Is this a project? -->
        <clr-icon
          v-else-if="obj.project && !hasChildren"
          aria-label="Project"
          shape="blocks-group"
          class="is-solid"
        />
        <!-- Indicate if this is a dead directory -->
        <clr-icon
          v-else-if="obj.dirNotFoundFlag === true"
          aria-label="Directory not found"
          shape="disconnect"
          class="is-solid"
        />
        <!-- Display a custom icon, if applicable -->
        <clr-icon
          v-else-if="isDirectory && !hasChildren"
          v-show="obj.icon"
          v-bind:shape="obj.icon"
          role="presentation"
        />
        <!-- Display a file icon -->
        <clr-icon
          v-else-if="obj.type === 'file' && !hasChildren"
          shape="file"
          role="presentation"
        />
      </span>
      <span
        class="display-text"
        v-bind:data-hash="obj.hash"
      >
        <template v-if="!nameEditing">
          {{ obj.name }}
        </template>
        <template v-else>
          <input
            ref="name-editing-input"
            type="text"
            v-bind:value="obj.name"
            v-on:keyup.enter="finishNameEditing($event.target.value)"
            v-on:keyup.esc="nameEditing = false"
            v-on:blur="nameEditing = false"
            v-on:click.stop=""
          >
        </template>
        <span
          v-if="hasDuplicateName"
          class="dir"
        >
          &nbsp;({{ dirname }})
        </span>
      </span>
      <Sorter
        v-if="isDirectory && combined"
        v-show="hover"
        v-bind:sorting="obj.sorting"
        v-on:sort-change="sort"
      />
    </div>
    <div
      v-if="hasSearchResults"
      class="display-search-results list-item"
      v-bind:style="{
        'padding-left': `${depth + 1}em`
      }"
      v-on:click="this.$root.toggleFileList"
    >
      <p class="filename">
        <clr-icon shape="search"></clr-icon> {{ displayResultsMessage }}
      </p>
    </div>
    <div
      v-if="isDirectory"
      v-show="!collapsed"
    >
      <tree-item
        v-for="child in filteredChildren"
        v-bind:key="child.hash"
        v-bind:obj="child"
        v-bind:depth="depth + 1"
      />
    </div>
  </div>
</template>

<script>
// Tree View item component
import findObject from '../../common/util/find-object.js'
import { trans } from '../../common/i18n'
import Sorter from './sorter.vue'
import fileContextMenu from './util/file-item-context.js'
import dirContextMenu from './util/dir-item-context.js'
import { ipcRenderer } from 'electron'
import path from 'path'

export default {
  name: 'TreeItem',
  components: {
    'Sorter': Sorter
  },
  props: {
    // The actual tree item
    obj: {
      type: Object,
      default: function () { return {} }
    },
    // How deep is this tree item nested?
    depth: {
      type: Number,
      default: 0
    },
    hasDuplicateName: {
      type: Boolean,
      default: false // Can only be true if root and actually has a duplicate name
    }
  },
  data: () => {
    return {
      collapsed: true, // Initial: collapsed list (if there are children)
      hover: false, // True as long as the user hovers over the element
      nameEditing: false // True if the user wants to rename the item
    }
  },
  computed: {
    /**
     * Returns true if this item is a root item
     */
    isRoot: function () {
      // Parent apparently can also be undefined BUG
      return this.obj.parent == null
    },
    /**
     * Returns true if this is a directory
     */
    isDirectory: function () {
      return this.obj.type === 'directory'
    },
    /**
     * Shortcut methods to access the store
     */
    activeFile: function () {
      return this.$store.state.activeFile
    },
    selectedDir: function () {
      return this.$store.state.selectedDirectory
    },
    /**
     * Returns true if the file manager mode is set to "combined"
     */
    combined: function () {
      return this.$store.state.fileManagerMode === 'combined'
    },
    /**
     * Returns true if there are children that can be displayed
     */
    hasChildren: function () {
      // Return true if it's a directory, with at least one directory as children
      if (this.obj.type !== 'directory') {
        return false
      }

      return this.isDirectory && this.filteredChildren.length > 0
    },
    /**
     * Returns the (containing) directory name.
     */
    dirname: function () {
      return path.basename(this.obj.dir)
    },
    /**
     * Computes the classList property for the container and returns it
     */
    classList: function () {
      const list = [ 'tree-item', this.obj.type ]
      if ([ this.activeFile, this.selectedDir ].includes(this.obj)) {
        list.push('selected')
      }

      if (this.obj.project != null) {
        list.push('project')
      }
      // Determine if this is a root component
      if (this.isRoot) {
        list.push('root')
      }

      return list.join(' ')
    },
    /**
     * Returns a list of children that can be displayed inside the tree view
     */
    filteredChildren: function () {
      if (this.combined) {
        return this.obj.children
      } else {
        return this.obj.children.filter(e => e.type === 'directory')
      }
    },
    /**
     * Returns the correct indicator shape
     */
    indicatorShape: function () {
      return this.collapsed ? 'caret right' : 'caret down'
    },
    /**
     * returns true, if this is the current selected directory, there
     * are search results and the file manager is in combined mode
     */
    hasSearchResults: function () {
      // Should return true, if this directory has search results in combined mode
      if (!this.combined) {
        return false
      }
      if (this.$store.state.searchResults.length < 1) {
        return false
      }
      if (this.obj.hash !== this.selectedDir) {
        return false
      }
      return true
    },
    displayResultsMessage: function () {
      return trans('gui.display_search_results')
    }
  },
  watch: {
    activeFile: function (newVal, oldVal) {
      // Open the tree on activeFile change, if the
      // selected file is contained in this dir somewhere
      if (findObject(this.obj, 'hash', this.activeFile, 'children')) {
        this.collapsed = false
      }
    },
    selectedDir: function (newVal, oldVal) {
      // If a directory within this has been selected,
      // open up, lads!
      if (findObject(this.obj, 'hash', this.selectedDir, 'children')) {
        this.collapsed = false
      }
    },
    nameEditing: function (newVal, oldVal) {
      if (newVal === false) {
        return // No need to select
      }

      this.$nextTick(() => {
        this.$refs['name-editing-input'].focus()
        this.$refs['name-editing-input'].select()
      })
    }
  },
  methods: {
    handleContextMenu: function (event) {
      if (this.isDirectory === true) {
        dirContextMenu(event, this.obj, this.$el, (clickedID) => {
          if (clickedID === 'menu.rename_dir') {
            this.nameEditing = true
          }
        })
      } else {
        fileContextMenu(event, this.obj, this.$el, (clickedID) => {
          if (clickedID === 'menu.rename_file') {
            this.nameEditing = true
          }
        })
      }
    },
    /**
     * On click, this will call the selection function.
     */
    requestSelection: function (event) {
      // Determine if we have a middle (wheel) click
      const middleClick = (event.type === 'auxclick' && event.button === 1)
      const ctrl = event.ctrlKey === true && process.platform !== 'darwin'
      const cmd = event.metaKey === true && process.platform === 'darwin'
      const alt = event.altkey === true

      // Dead directories can't be opened, so stop the propagation to
      // the file manager and don't do a thing.
      if (this.obj.dirNotFoundFlag === true) {
        return event.stopPropagation()
      }

      if (this.obj.type === 'file' && alt) {
        // QuickLook the file TODO: application invocation
        global.ipc.send('open-quicklook', this.obj.hash)
      } else if (this.obj.type === 'file') {
        // Request the clicked file
        if (!middleClick && !ctrl && !cmd) {
          // global.editor.announceTransientFile(this.obj.hash)
        }
        ipcRenderer.invoke('application', {
          command: 'open-file',
          payload: this.obj.path
        })
          .catch(e => console.error(e))
      } else {
        // Select this directory
        ipcRenderer.invoke('application', {
          command: 'set-open-directory',
          payload: this.obj.path
        })
          .catch(e => console.error(e))
      }
    },
    /**
     * On a click on the indicator, this'll toggle the collapsed state
     */
    toggleCollapse: function (event) {
      this.collapsed = !this.collapsed
    },
    /**
     * Request to re-sort this directory
     */
    sort: function (sorting) {
      // TODO: application invocation, plus: Move to directory popover
      global.ipc.send('dir-sort', { 'hash': this.obj.hash, 'type': sorting })
    },
    /**
     * Initiates a drag movement and inserts the correct data
     * @param {DragEvent} event The drag event
     */
    beginDragging: function (event) {
      event.dataTransfer.dropEffect = 'move'
      if (this.obj.type === 'file') {
        event.dataTransfer.setData('text/x-zettlr-file', JSON.stringify({
          hash: this.obj.hash,
          type: this.obj.type,
          path: this.obj.path,
          id: this.obj.id
        }))
      } else {
        event.dataTransfer.setData('text/x-zettlr-dir', JSON.stringify({
          hash: this.obj.hash,
          type: this.obj.type
        }))
      }
    },
    onDragHandler: function (event) {
      if (this.isDirectory) {
        return // Directories cannot be dragged out of the app
      }

      // If the drag x/y-coordinates are about to leave the window, we
      // have to continue the drag in the main process (as it's being
      // dragged out of the window)
      const x = Number(event.x)
      const y = Number(event.y)
      const w = window.innerWidth
      const h = window.innerHeight

      if (x === 0 || y === 0 || x === w || y === h) {
        event.stopPropagation()
        event.preventDefault()
        global.ipc.send('file-drag-start', { hash: this.obj.hash })
      }
    },
    /**
     * Called when a drag operation enters this item; adds a highlight class
     */
    enterDragging: function (event) {
      if (this.isDirectory) {
        this.$refs.listElement.classList.add('highlight')
      }
    },
    /**
     * The oppossite of enterDragging; removes the highlight class
     */
    leaveDragging: function (event) {
      if (this.isDirectory) {
        this.$refs.listElement.classList.remove('highlight')
      }
    },
    /**
     * Called whenever something is dropped onto the element.
     * Only executes if it's a valid tree-item/file-list object.
     */
    handleDrop: function (event) {
      this.$refs.listElement.classList.remove('highlight')
      event.preventDefault()
      // Now we have to be careful. The user can now ALSO
      // drag and drop files right onto the list. So we need
      // to make sure it's really an element from in here and
      // NOT a file, because these need to be handled by the
      // app itself.
      let data

      try {
        let eventData = event.dataTransfer.getData('text/x-zettlr-file')
        if (eventData === '') {
          // If the eventData is empty, this suggests there was no corresponding
          // data available, so it might be a directory.
          eventData = event.dataTransfer.getData('text/x-zettlr-dir')
        }
        data = JSON.parse(eventData) // Throws error if eventData === ''
      } catch (e) {
        // Error in JSON stringifying (either b/c malformed or no text)
        return
      }

      // The user dropped the file onto itself
      if (data.hash === this.obj.hash) {
        return
      }

      // Finally, request the move! TODO: application invocation
      global.ipc.send('request-move', {
        from: parseInt(data.hash),
        to: this.obj.hash
      })
    },
    /**
     * Makes sure the browser doesn't do unexpected stuff when dragging, e.g., external files.
     * @param {DragEvent} event The drag event
     */
    acceptDrags: function (event) {
      // We need to constantly preventDefault to ensure
      // that, e.g., a Python or other script file doesn't
      // override the location.href to display.
      event.preventDefault()
    },
    /**
     * Called when the user finishes renaming this tree item
     *
     * @param   {string}  newName  The new name given to the directory
     */
    finishNameEditing: function (newName) {
      if (newName === this.obj.name) {
        return // Not changed
      }

      const command = (this.obj.type === 'directory') ? 'dir-rename' : 'file-rename'

      ipcRenderer.invoke('application', {
        command: command,
        content: { hash: this.obj.hash, name: newName }
      })
        .catch(e => console.error(e))
        .finally(() => { this.nameEditing = false })
    }
  }
}
</script>

<style lang="less">
body {
  .tree-item {
    // These inputs should be more or less "invisible"
    input {
      border: none;
      color: inherit;
      font-family: inherit;
      font-size: inherit;
      background-color: transparent;
      padding: 0;
    }
  }
}

body.darwin {
  .tree-item {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    margin: 6px 0px;

    .item-icon, .toggle-icon {
      display: inline-block;
      width: 18px; // Size of clr-icon with the margin of the icon
    }

    .display-text {
      font-size: 13px;
      padding: 3px 5px;
      border-radius: 4px;
      white-space: nowrap;
      overflow: hidden;
    }

    &.selected .display-text {
      background-color: var(--system-accent-color, --c-primary);
      background-image: linear-gradient(#00000000, #00000022);
      color: white;
    }
  }
}
</style>
