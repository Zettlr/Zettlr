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
    v-bind:draggable="!isRoot"
    v-on:dragstart.stop="beginDragging"
    v-on:dragenter.stop="enterDragging"
    v-on:dragleave.stop="leaveDragging"
  >
    <div
      ref="listElement"
      v-bind:class="classList"
      v-bind:data-hash="obj.hash"
      v-bind:data-id="obj.id || ''"
      v-bind:style="pad"
      v-on:click="requestSelection"
      v-on:drop="handleDrop"
      v-on:dragover="acceptDrags"
      v-on:mouseenter="hover=true"
      v-on:mouseleave="hover=false"
      v-on:contextmenu="handleContextMenu"
    >
      <p
        class="filename"
        v-bind:data-hash="obj.hash"
      >
        <!-- First: Primary icon (either directory icon, file icon, or project icon) -->
        <span class="item-icon">
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
        <span class="toggle-icon">
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
            shape="blocks-group"
            class="is-solid"
          />
          <!-- Indicate if this is a dead directory -->
          <clr-icon
            v-else-if="obj.dirNotFoundFlag === true"
            shape="disconnect"
            class="is-solid"
          />
          <!-- Display a custom icon, if applicable -->
          <clr-icon
            v-else-if="isDirectory && !hasChildren"
            v-show="obj.icon"
            v-bind:shape="obj.icon"
          />
          <!-- Display a file icon -->
          <clr-icon
            v-else-if="obj.type === 'file' && !hasChildren"
            shape="file"
          />
        </span>
        {{ obj.name }}
        <span
          v-if="hasDuplicateName"
          class="dir"
        >
          &nbsp;({{ dirname }})
        </span>
      </p>
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
      v-bind:style="searchResultMessagePadding"
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
const findObject = require('../../../common/util/find-object.js')
const { trans } = require('../../../common/i18n')
const Sorter = require('./sorter.vue').default
const fileContextMenu = require('./file-item-context.js')
const dirContextMenu = require('./dir-item-context.js')

module.exports = {
  name: 'tree-item',
  props: [
    'obj', // The actual object
    'depth' // How deep is this item nested?
  ],
  components: {
    'Sorter': Sorter
  },
  watch: {
    selectedFile: function (oldVal, newVal) {
      // Open the tree on selectedFile change, if the
      // selected file is contained in this dir somewhere
      if (findObject(this.obj, 'hash', this.selectedFile, 'children')) this.collapsed = false
    },
    selectedDir: function (oldVal, newVal) {
      // If a directory within this has been selected,
      // open up, lads!
      if (findObject(this.obj, 'hash', this.selectedDir, 'children')) this.collapsed = false
    }
  },
  data: () => {
    return {
      collapsed: true, // Initial: collapsed list (if there are children)
      hover: false // True as long as the user hovers over the element
    }
  },
  computed: {
    /**
     * Returns true if this component is a root
     */
    isRoot: function () { return this.$root === this.$parent },
    /**
     * Returns true if this is a directory
     */
    isDirectory: function () { return this.obj.type === 'directory' },
    /**
     * Shortcut methods to access the store
     */
    selectedFile: function () { return this.$store.state.selectedFile },
    selectedDir: function () { return this.$store.state.selectedDirectory },
    /**
     * Returns true if the file manager mode is set to "combined"
     */
    combined: function () { return this.$store.state.fileManagerMode === 'combined' },
    /**
     * Returns true if there are children that can be displayed
     */
    hasChildren: function () {
      // Return true if it's a directory, with at least one directory as children
      if (!this.obj.hasOwnProperty('children')) return false
      return this.isDirectory && this.filteredChildren.length > 0
    },
    /**
     * Returns the directory name. TODO: Migrate to NodeJS Path
     */
    dirname: function () {
      let name = this.obj.path.replace(/\\/g, '/')
      name = name.substr(0, name.lastIndexOf('/'))
      return name.substr(name.lastIndexOf('/') + 1)
    },
    /**
     * Computes the classList property for the container and returns it
     */
    classList: function () {
      let list = 'list-item ' + this.obj.type
      if ([ this.selectedFile, this.selectedDir ].includes(this.obj.hash)) list += ' selected'
      if (this.obj.project) list += ' project'
      // Determine if this is a root component
      if (this.isRoot) list += ' root'
      return list
    },
    /**
     * Returns true, if this is actually a TeX-file
     */
    isTex: function () { return this.obj.ext === '.tex' },
    /**
     * Returns a list of children that can be displayed inside the tree view
     */
    filteredChildren: function () {
      return this.combined ? this.obj.children : this.obj.children.filter(e => e.type !== 'file')
    },
    /**
     * Returns the correct indicator shape
     */
    indicatorShape: function () { return this.collapsed ? 'caret right' : 'caret down' },
    /**
     * Returns the amount of padding that should be applied, based on the depth
     */
    pad: function () { return `padding-left: ${this.depth}em` },
    searchResultMessagePadding: function () { return `padding-left: ${this.depth + 1}em` },
    /**
     * Returns true if this is a root file and has the same name as another root file
     */
    hasDuplicateName: function () {
      if (this.isRoot) {
        let elem = this.$store.state.items.filter(elem => elem.name === this.obj.name)
        if (elem.length > 1) return true
      }
      return false
    },
    /**
     * returns true, if this is the current selected directory, there
     * are search results and the file manager is in combined mode
     */
    hasSearchResults: function () {
      // Should return true, if this directory has search results in combined mode
      if (!this.combined) return false
      if (this.$store.state.searchResults.length < 1) return false
      if (this.obj.hash !== this.selectedDir) return false
      return true
    },
    displayResultsMessage: function () { return trans('gui.display_search_results') }
  },
  /**
   * Callable methods
   */
  methods: {
    handleContextMenu: function (event) {
      if (this.isDirectory) {
        dirContextMenu(event, this.obj, this.$el)
      } else {
        fileContextMenu(event, this.obj, this.$el)
      }
    },
    /**
     * On click, this will call the selection function.
     */
    requestSelection: function (evt) {
      // Determine if we have a middle (wheel) click
      const middleClick = (event.type === 'auxclick' && event.button === 1)
      const ctrl = event.ctrlKey && process.platform !== 'darwin'
      const cmd = event.metaKey && process.platform === 'darwin'

      // Dead directories can't be opened, so stop the propagation to
      // the file manager and don't do a thing.
      if (this.obj.dirNotFoundFlag === true) return evt.stopPropagation()

      if (this.obj.type === 'file' && event.altKey) {
        // QuickLook the file
        global.ipc.send('open-quicklook', this.obj.hash)
      } else if (this.obj.type === 'file') {
        // Request the clicked file
        if (!middleClick && !ctrl && !cmd) {
          global.editor.announceTransientFile(this.obj.hash)
        }
        global.ipc.send('file-get', this.obj.hash)
      } else {
        // Select this directory
        global.ipc.send('dir-select', this.obj.hash)
        this.collapsed = false // Also open the directory
      }
    },
    /**
     * On a click on the indicator, this'll toggle the collapsed state
     */
    toggleCollapse: function (event) { this.collapsed = !this.collapsed },
    /**
     * Request to re-sort this directory
     */
    sort: function (sorting) {
      global.ipc.send('dir-sort', { 'hash': this.obj.hash, 'type': sorting })
    },
    /**
     * Initiates a drag movement and inserts the correct data
     * @param {DragEvent} event The drag event
     */
    beginDragging: function (event) {
      event.dataTransfer.effectAllowed = 'move'
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
    /**
     * Called when a drag operation enters this item; adds a highlight class
     */
    enterDragging: function (event) {
      if (this.isDirectory) this.$refs.listElement.classList.add('highlight')
    },
    /**
     * The oppossite of enterDragging; removes the highlight class
     */
    leaveDragging: function (event) {
      if (this.isDirectory) this.$refs.listElement.classList.remove('highlight')
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
      if (data.hash === this.obj.hash) return

      // Finally, request the move!
      global.ipc.send('request-move', { 'from': parseInt(data.hash), 'to': this.obj.hash })
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
    }
  }
}
</script>
