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
      v-on:mousedown.stop="requestSelection"
      v-on:dragover="acceptDrags"
      v-on:dragenter="enterDragging"
      v-on:dragleave="leaveDragging"
      v-on:drop="handleDrop"
      v-on:contextmenu="handleContextMenu"
    >
      <!-- First: Primary icon (either directory icon, file icon, or project icon) -->
      <span
        class="item-icon"
        aria-hidden="true"
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
          role="presentation"
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
      >
        <!-- Display a toggle to collapse/expand the file list -->
        <!-- Only display in this position if the item has a primary icon -->
        <clr-icon
          v-if="hasChildren"
          role="button"
          v-bind:shape="indicatorShape"
          v-bind:aria-label="indicatorARIALabel"
          v-on:mousedown.stop="collapsed = collapsed === false"
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
          aria-hidden="true"
        />
        <!-- Display a file icon -->
        <clr-icon
          v-else-if="obj.type === 'file' && !hasChildren"
          shape="file"
          aria-hidden="true"
        />
      </span>
      <span
        ref="display-text"
        class="display-text"
        role="button"
        v-bind:aria-label="`Select ${obj.name}`"
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
      v-if="operationType !== undefined"
      v-bind:style="{
        'padding-left': `${(depth + 1) * 15 + 10}px`
      }"
    >
      <input
        v-if="operationType !== undefined"
        ref="new-object-input"
        type="text"
        v-on:keyup.esc="operationType = undefined"
        v-on:blur="operationType = undefined"
        v-on:keyup.enter="handleOperationFinish($event.target.value)"
      >
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
import { ipcRenderer } from 'electron'
import path from 'path'
import itemMixin from './util/item-mixin'
import generateFilename from '../../common/util/generate-filename'

export default {
  name: 'TreeItem',
  mixins: [itemMixin],
  props: {
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
      operationType: undefined // Can be createFile or createDir
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
    },
    indicatorARIALabel: function () {
      return this.collapsed ? 'Uncollapse directory' : 'Collapse directory'
    }
  },
  watch: {
    activeFile: function (newVal, oldVal) {
      this.uncollapseIfApplicable()
    },
    selectedDir: function (newVal, oldVal) {
      this.uncollapseIfApplicable()
    },
    operationType: function (newVal, oldVal) {
      if (newVal !== undefined) {
        this.$nextTick(() => {
          if (this.operationType === 'createFile') {
            // If we're generating a file, generate a filename
            this.$refs['new-object-input'].value = generateFilename()
          }
          this.$refs['new-object-input'].focus()
          this.$refs['new-object-input'].select()
        })
      }
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
    handleOperationFinish: function (newName) {
      if (this.operationType === 'createFile' && newName.trim() !== '') {
        ipcRenderer.invoke('application', {
          command: 'file-new',
          payload: {
            path: this.obj.path,
            name: newName.trim()
          }
        }).catch(e => console.error(e))
      } else if (this.operationType === 'createDir' && newName.trim() !== '') {
        ipcRenderer.invoke('application', {
          command: 'dir-new',
          payload: {
            path: this.obj.path,
            name: newName.trim()
          }
        }).catch(e => console.error(e))
      }

      this.operationType = undefined
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

body.win32 {
  .tree-item {
    margin: 8px 0px;

    .item-icon, .toggle-icon {
      display: inline-block;
      width: 18px; // Size of clr-icon with the margin of the icon
    }

    .display-text {
      font-size: 13px;
      padding: 3px 5px;
      overflow: hidden;

      &.highlight {
        background-color: var(--system-accent-color, --c-primary);
        color: white;
      }
    }

    &.selected .display-text {
      color: var(--system-accent-color, --c-primary);
    }
  }
}

body.linux {
  .tree-item {
    margin: 8px 0px;

    .item-icon, .toggle-icon {
      display: inline-block;
      width: 18px; // Size of clr-icon with the margin of the icon
    }

    .display-text {
      font-size: 13px;
      padding: 3px 5px;
      overflow: hidden;

      &.highlight {
        background-color: var(--system-accent-color, --c-primary);
        color: white;
      }
    }

    &.selected .display-text {
      color: var(--system-accent-color, --c-primary);
    }
  }
}
</style>
