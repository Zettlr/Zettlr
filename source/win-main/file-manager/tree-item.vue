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
    class="tree-item-container"
    v-bind:data-hash="obj.hash"
  >
    <div
      v-bind:class="{
        'tree-item': true,
        [obj.type]: true,
        'selected': activeFile === obj || selectedDir === obj,
        'project': obj.project != null,
        'root': isRoot
      }"
      v-bind:data-hash="obj.hash"
      v-bind:data-id="obj.id || ''"
      v-bind:style="{
        'padding-left': `${depth * 15 + 10}px`
      }"
      v-on:click="requestSelection"
      v-on:dragover="acceptDrags"
      v-on:dragenter="enterDragging"
      v-on:dragleave="leaveDragging"
      v-on:drop="handleDrop"
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
        ref="display-text"
        class="display-text"
        v-bind:data-hash="obj.hash"
        v-bind:draggable="!isRoot"
        v-on:dragstart="beginDragging"
        v-on:drag="onDragHandler"
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
import fileContextMenu from './util/file-item-context.js'
import dirContextMenu from './util/dir-item-context.js'
import { ipcRenderer } from 'electron'
import path from 'path'
import PopoverFileProps from './PopoverFileProps'
import PopoverDirProps from './PopoverDirProps'

export default {
  name: 'TreeItem',
  components: {
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
      return this.$store.state.config['fileManagerMode'] === 'combined'
    },
    /**
     * Returns true if there are children that can be displayed
     */
    hasChildren: function () {
      // Return true if it's a directory, with at least one directory as children
      if (this.obj.type !== 'directory') {
        return false
      }

      return this.isDirectory === true && this.filteredChildren.length > 0
    },
    /**
     * Returns the (containing) directory name.
     */
    dirname: function () {
      return path.basename(this.obj.dir)
    },
    /**
     * Returns a list of children that can be displayed inside the tree view
     */
    filteredChildren: function () {
      if (this.combined === true) {
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
    }
  },
  watch: {
    activeFile: function (newVal, oldVal) {
      this.uncollapseIfApplicable()
    },
    selectedDir: function (newVal, oldVal) {
      this.uncollapseIfApplicable()
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
  mounted: function () {
    this.uncollapseIfApplicable()
  },
  methods: {
    uncollapseIfApplicable: function () {
      const filePath = (this.activeFile !== null) ? this.activeFile.path : ''
      const dirPath = (this.selectedDir !== null) ? this.selectedDir.path : ''

      // Open the tree, if the selected file is contained in this dir somewhere
      if (filePath.startsWith(this.obj.path)) {
        this.collapsed = false
      }

      // If a directory within this has been selected, open up, lads!
      if (dirPath.startsWith(this.obj.path)) {
        this.collapsed = false
      }
    },
    handleContextMenu: function (event) {
      if (this.isDirectory === true) {
        dirContextMenu(event, this.obj, this.$el, (clickedID) => {
          if (clickedID === 'menu.rename_dir') {
            this.nameEditing = true
          } else if (clickedID === 'menu.new_file') {
            this.$emit('create-file')
          } else if (clickedID === 'menu.new_dir') {
            this.$emit('create-dir')
          } else if (clickedID === 'menu.delete_dir') {
            ipcRenderer.invoke('application', {
              command: 'dir-delete',
              payload: { path: this.obj.path }
            })
              .catch(err => console.error(err))
          } else if (clickedID === 'menu.properties') {
            const data = {
              dirname: this.obj.name,
              creationtime: this.obj.creationtime,
              modtime: this.obj.modtime,
              files: this.obj.children.filter(e => e.type !== 'directory').length,
              dirs: this.obj.children.filter(e => e.type === 'directory').length,
              isProject: this.isProject === true,
              icon: this.obj.icon
            }

            if (this.obj.sorting !== null) {
              data.sortingType = this.obj.sorting.split('-')[0]
              data.sortingDirection = this.obj.sorting.split('-')[1]
            } // Else: Default sorting of name-up

            this.$showPopover(PopoverDirProps, this.$refs['display-text'], data, (data) => {
              // Apply new sorting if applicable
              if (data.sorting !== this.obj.sorting) {
                ipcRenderer.invoke('application', {
                  command: 'dir-sort',
                  payload: {
                    path: this.obj.path,
                    sorting: data.sorting
                  }
                }).catch(e => console.error(e))
              }

              // Set the project flag if applicable
              const projectChanged = data.isProject !== this.isProject
              if (projectChanged && data.isProject) {
                ipcRenderer.invoke('application', {
                  command: 'dir-new-project',
                  payload: { path: this.obj.path }
                }).catch(e => console.error(e))
              } else if (projectChanged && !data.isProject) {
                ipcRenderer.invoke('application', {
                  command: 'dir-remove-project',
                  payload: { path: this.obj.path }
                }).catch(e => console.error(e))
              }

              // Set the icon if it has changed
              if (data.icon !== this.obj.icon) {
                ipcRenderer.invoke('application', {
                  command: 'dir-set-icon',
                  payload: {
                    path: this.obj.path,
                    icon: data.icon
                  }
                }).catch(e => console.error(e))
              }
            })
          }
        })
      } else {
        fileContextMenu(event, this.obj, this.$el, (clickedID) => {
          if (clickedID === 'menu.rename_file') {
            this.nameEditing = true
          } else if (clickedID === 'menu.duplicate_file') {
            // The user wants to duplicate this file --> instruct the file list
            // controller to display a mock file object below this file for the
            // user to enter a new file name.
            this.$emit('duplicate')
          } else if (clickedID === 'menu.properties') {
            const data = {
              filename: this.obj.name,
              creationtime: this.obj.creationtime,
              modtime: this.obj.modtime,
              tags: this.obj.tags,
              // We need to provide the coloured tags so
              // the popover can render them correctly
              colouredTags: this.$store.state.colouredTags,
              targetValue: 0,
              targetMode: 'words',
              fileSize: this.obj.size,
              type: this.obj.type,
              words: 0,
              ext: this.obj.ext
            }

            if (this.hasWritingTarget === true) {
              data.targetValue = this.obj.target.count
              data.targetMode = this.obj.target.mode
            }

            if (this.obj.type === 'file') {
              data.words = this.obj.wordCount
            }

            this.$showPopover(PopoverFileProps, this.$refs['display-text'], data, (data) => {
              // Whenever the data changes, update the target

              // 1.: Writing Target
              if (this.obj.type === 'file') {
                ipcRenderer.invoke('application', {
                  command: 'set-writing-target',
                  payload: {
                    mode: data.target.mode,
                    count: data.target.value,
                    path: this.obj.path
                  }
                }).catch(e => console.error(e))
              }
            })
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
        // QuickLook the file
        ipcRenderer.invoke('application', {
          command: 'open-quicklook',
          payload: this.obj.path
        })
          .catch(e => console.error(e))
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
      this.collapsed = this.collapsed === false
    },
    /**
     * Initiates a drag movement and inserts the correct data
     * @param {DragEvent} event The drag event
     */
    beginDragging: function (event) {
      event.dataTransfer.dropEffect = 'move'
      if (this.obj.type === 'file') {
        event.dataTransfer.setData('text/x-zettlr-file', JSON.stringify({
          type: this.obj.type,
          path: this.obj.path,
          id: this.obj.id
        }))
      } else {
        event.dataTransfer.setData('text/x-zettlr-dir', JSON.stringify({
          path: this.obj.path,
          type: this.obj.type
        }))
      }
    },
    onDragHandler: function (event) {
      if (this.isDirectory === true) {
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

        ipcRenderer.send('window-controls', {
          command: 'drag-start',
          payload: { filePath: this.obj.path }
        })
      }
    },
    /**
     * Called when a drag operation enters this item; adds a highlight class
     */
    enterDragging: function (event) {
      if (this.isDirectory === true) {
        this.$refs['display-text'].classList.add('highlight')
      }
    },
    /**
     * The oppossite of enterDragging; removes the highlight class
     */
    leaveDragging: function (event) {
      if (this.isDirectory === true) {
        this.$refs['display-text'].classList.remove('highlight')
      }
    },
    /**
     * Called whenever something is dropped onto the element.
     * Only executes if it's a valid tree-item/file-list object.
     */
    handleDrop: function (event) {
      this.$refs['display-text'].classList.remove('highlight')
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
      if (data.path === this.obj.path) {
        return
      }

      // Finally, request the move!
      ipcRenderer.invoke('application', {
        command: 'request-move',
        payload: {
          from: data.path,
          to: this.obj.path
        }
      })
        .catch(err => console.error(err))
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
  div.tree-item-container {
    white-space: nowrap;

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
      overflow: hidden;

      &.highlight {
        background-color: var(--system-accent-color, --c-primary);
        color: white;
      }
    }

    &.selected .display-text {
      background-color: var(--system-accent-color, --c-primary);
      background-image: linear-gradient(#00000000, #00000022);
      color: white;
    }
  }
}
</style>
