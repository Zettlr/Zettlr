<template>
  <div
    class="tree-item-container"
    v-bind:data-hash="obj.hash"
  >
    <div
      v-bind:class="{
        'tree-item': true,
        [obj.type]: true,
        'selected': (selectedFile !== null && selectedFile.path === obj.path) || (selectedDir !== null && selectedDir.path === obj.path),
        'project': obj.project != null,
        'root': isRoot
      }"
      v-bind:data-hash="obj.hash"
      v-bind:data-id="obj.id || ''"
      v-bind:style="{
        'padding-left': `${depth * 15 + 10}px`
      }"
      v-on:click.stop="requestSelection"
      v-on:auxclick.stop="requestSelection"
      v-on:dragover="acceptDrags"
      v-on:dragenter="enterDragging"
      v-on:dragleave="leaveDragging"
      v-on:drop="handleDrop"
      v-on:contextmenu="handleContextMenu"
    >
      <!-- First: Secondary icon (only if primaryIcon displays the chevron) -->
      <span
        class="item-icon"
        aria-hidden="true"
      >
        <clr-icon
          v-if="secondaryIcon !== false"
          v-bind:shape="secondaryIcon"
          role="presentation"
          v-bind:class="{
            'is-solid': [ 'disconnect', 'blocks-group' ].includes(secondaryIcon)
          }"
        />
      </span>
      <!-- Second: Primary icon (either the chevron, or the custom icon) -->
      <span
        class="toggle-icon"
      >
        <clr-icon
          v-if="primaryIcon !== false"
          v-bind:shape="primaryIcon"
          role="presentation"
          v-bind:class="{
            'is-solid': [ 'disconnect', 'blocks-group' ].includes(primaryIcon)
          }"
          v-on:click.stop="handlePrimaryIconClick"
        ></clr-icon>
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
          {{ basename }}
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
        'padding-left': `${(depth + 2) * 15 + 10}px`
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
    <div v-if="isDirectory && !collapsed">
      <TreeItem
        v-for="child in filteredChildren"
        v-bind:key="child.hash"
        v-bind:obj="child"
        v-bind:depth="depth + 1"
      >
      </TreeItem>
    </div>
  </div>
</template>

<script>
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

import itemMixin from './util/item-mixin'
import generateFilename from '../../common/util/generate-filename'
import { trans } from '../../common/i18n-renderer'

const path = window.path
const ipcRenderer = window.ipc

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
     * The secondary icon's shape -- this is the visually FIRST icon to be displayed
     *
     * @return  {string|boolean}  False if no secondary icon
     */
    secondaryIcon: function () {
      if (this.hasChildren === false) {
        // If whatever the object we're representing has no children, we do not
        // need the secondary icon, since the primary icon will display whatever
        // is necessary.
        return false
      } else {
        // Otherwise, the primaryIcon will display the chevron and we need to
        // transfer the customIcon to this position.
        return this.customIcon
      }
    },
    /**
     * The primary icon's shape -- this is the visually SECOND icon to be displayed
     *
     * @return  {string|boolean}  False if no primary icon
     */
    primaryIcon: function () {
      // The primary icon is _always_ the chevron if we're dealing with a
      // directory and it has children. Otherwise, it will display the custom icon.
      if (this.hasChildren === true) {
        return this.collapsed === true ? 'caret right' : 'caret down'
      } else {
        return this.customIcon
      }
    },
    /**
     * Returns an icon appropriate to the item we are representing, or false if
     * there is no icon available.
     *
     * @return  {string|boolean}  False if no custom icon.
     */
    customIcon: function () {
      if (this.obj.type !== 'directory') {
        // Indicate that this is a file.
        if (this.obj.type === 'file') {
          return 'file'
        } else {
          return 'code'
        }
      } else if (this.obj.dirNotFoundFlag === true) {
        return 'disconnect'
      } else if (this.obj.project !== null) {
        // Indicate that this directory has a project.
        return 'blocks-group'
      } else if (this.obj.icon !== null) {
        // Display the custom icon
        return this.obj.icon
      }

      // No icon available
      return false
    },
    /**
     * Returns true if this item is a root item
     */
    isRoot: function () {
      // Parent apparently can also be undefined BUG
      return this.obj.parent == null
    },
    /**
     * Returns true if the file manager mode is set to "combined"
     */
    combined: function () {
      return this.$store.state.config['fileManagerMode'] === 'combined'
    },
    /**
     * Returns true if there are children that can be displayed
     *
     * @return {boolean} Whether or not this object has children.
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
    basename: function () {
      if (this.obj.type === 'directory' || this.obj.type === 'code') {
        return this.obj.name
      }

      if (this.obj.frontmatter != null && 'title' in this.obj.frontmatter) {
        return this.obj.frontmatter.title
      } else if (this.obj.firstHeading != null && this.$store.state.config['display.useFirstHeadings'] === true) {
        return this.obj.firstHeading
      } else {
        return this.obj.name.replace(this.obj.ext, '')
      }
    }
  },
  watch: {
    selectedFile: function (newVal, oldVal) {
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
          } else if (this.operationType === 'createDir') {
            // Else standard val for new dirs.
            this.$refs['new-object-input'].value = trans('dialog.dir_new.value')
          }
          this.$refs['new-object-input'].focus()
          // Select from the beginning until the last dot
          this.$refs['new-object-input'].setSelectionRange(
            0,
            this.$refs['new-object-input'].value.lastIndexOf('.')
          )
        })
      }
    }
  },
  mounted: function () {
    this.uncollapseIfApplicable()
  },
  methods: {
    uncollapseIfApplicable: function () {
      const filePath = (this.selectedFile !== null) ? String(this.selectedFile.path) : ''
      const dirPath = (this.selectedDir !== null) ? String(this.selectedDir.path) : ''

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
      } catch (err) {
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
    },
    handlePrimaryIconClick: function () {
      if (this.hasChildren === true) {
        this.collapsed = this.collapsed === false
      }
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

      &.project {
        color: rgb(220, 45, 45);
      }

      &.highlight {
        // This class is applied on drag & drop
        background-color: var(--system-accent-color, --c-primary);
        color: var(--system-accent-color-contrast, --c-primary-contrast);
      }

      &.selected .display-text {
        background-color: var(--system-accent-color, --c-primary);
        color: var(--system-accent-color-contrast, --c-primary-contrast);
      }
    }
  }

  &.dark div.tree-item-container {
    .tree-item.project {
      color: rgb(240, 98, 98);
    }
  }
}

body.darwin {
  .tree-item {
    margin: 6px 0px;
    color: rgb(53, 53, 53);

    .item-icon, .toggle-icon {
      display: inline-block;
      width: 18px; // Size of clr-icon with the margin of the icon
    }

    .display-text {
      font-size: 13px;
      padding: 3px 5px;
      border-radius: 4px;
      overflow: hidden;
    }

    &.selected .display-text {
      background-image: linear-gradient(#00000000, #00000022);
    }
  }

  &.dark {
    .tree-item {
      color: rgb(240, 240, 240);
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
    }
  }
}
</style>
