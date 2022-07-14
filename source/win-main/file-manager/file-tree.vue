<template>
  <div
    id="file-tree"
    role="region"
    aria-label="File Tree"
    v-bind:class="{ 'hidden': !isVisible }"
    v-bind:aria-hidden="!isVisible"
    v-on:click="clickHandler"
  >
    <template v-if="fileTree.length > 0">
      <div v-if="getFilteredTree.length === 0" class="empty-tree">
        <div class="info">
          {{ noResultsMessage }}
        </div>
      </div>

      <div v-show="getFiles.length > 0" id="directories-files-header">
        <clr-icon
          shape="file"
          role="presentation"
        ></clr-icon>{{ fileSectionHeading }}
      </div>
      <TreeItem
        v-for="item in getFiles"
        v-bind:key="item.hash"
        v-bind:obj="item"
        v-bind:depth="0"
        v-bind:active-item="activeTreeItem?.[0]"
        v-bind:has-duplicate-name="getFiles.filter(i => i.name === item.name).length > 1"
      >
      </TreeItem>
      <div v-show="getDirectories.length > 0" id="directories-dirs-header">
        <clr-icon
          shape="tree-view"
          role="presentation"
        ></clr-icon>{{ workspaceSectionHeading }}
      </div>
      <TreeItem
        v-for="item in getDirectories"
        v-bind:key="item.hash"
        v-bind:obj="item"
        v-bind:is-currently-filtering="filterQuery.length > 0"
        v-bind:depth="0"
        v-bind:active-item="activeTreeItem?.[0]"
        v-bind:has-duplicate-name="getDirectories.filter(i => i.name === item.name).length > 1"
      >
      </TreeItem>
    </template>
    <template v-else>
      <div class="empty-tree" v-on:click="requestOpenRoot">
        <div class="info">
          {{ noRootsMessage }}
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileTree
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays the FSAL file tree contents as a tree.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import TreeItem from './tree-item.vue'
import matchQuery from './util/match-query'
import matchTree from './util/match-tree'
import { defineComponent } from 'vue'
import { MDFileMeta, CodeFileMeta, DirMeta, OtherFileMeta } from '@dts/common/fsal'

const ipcRenderer = window.ipc

type AnyDescriptor = DirMeta|CodeFileMeta|MDFileMeta|OtherFileMeta

/**
 * Flattens one element of the filtered directory tree into a one-dimensional
 * array, taking into account only uncollapsed (=visible) directories.
 *
 * @param   {AnyDescriptor}       elem         The element to flatten
 * @param   {string[]|undefined}  uncollapsed  A list of opened directories. Pass undefined to return all directories
 * @param   {AnyDescriptor[]}     arr          A list to append to (for recursion)
 *
 * @return  {AnyDescriptor[]}                  The flattened list
 */
function getFlattenedVisibleFileTree (elem: AnyDescriptor, uncollapsed: string[]|undefined, arr: AnyDescriptor[] = []): AnyDescriptor[] {
  // Add the current element
  if (elem.type !== 'other') {
    // TODO: Once we enable displaying of otherfiles in the file tree, we MUST
    // replace this with a check of whether that setting is on!
    arr.push(elem)
  }

  // Include children only when we either are filtering (uncollapsed = undefined)
  // or if the directory is actually visible
  if (elem.type === 'directory' && (uncollapsed === undefined || uncollapsed.includes(elem.path))) {
    for (const child of elem.children) {
      arr = getFlattenedVisibleFileTree(child, uncollapsed, arr)
    }
  }

  return arr
}

export default defineComponent({
  name: 'FileTree',
  components: {
    TreeItem
  },
  props: {
    isVisible: {
      type: Boolean,
      required: true
    },
    filterQuery: {
      type: String,
      required: true
    }
  },
  data: function () {
    return {
      // Can contain the path to a tree item that is focused
      activeTreeItem: undefined as undefined|[string, string]
    }
  },
  computed: {
    fileTree: function (): Array<MDFileMeta|CodeFileMeta|DirMeta> {
      return this.$store.state.fileTree
    },
    useH1: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('heading')
    },
    useTitle: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('title')
    },
    getFilteredTree: function (): Array<MDFileMeta|CodeFileMeta|DirMeta> {
      const q = String(this.filterQuery).trim().toLowerCase() // Easy access

      if (q === '') {
        return this.fileTree
      }

      const filter = matchQuery(q, this.useTitle, this.useH1)
      // Now we can actually filter out the file tree. We have to do this recursively.
      // We will perform a depth-first search and keep every directory which either
      // (a) matches directly or (b) has an amount of filtered children > 0
      const filteredTree = []
      for (const item of this.fileTree) {
        if (item.type === 'directory') {
          // Recursively match the directory
          const result = matchTree(item, filter)
          if (result !== undefined) {
            filteredTree.push(result)
          }
        } else if (filter(item)) {
          // Add the file, since it matches
          filteredTree.push(item)
        }
      }
      return filteredTree
    },
    getFiles: function (): Array<MDFileMeta|CodeFileMeta> {
      return this.getFilteredTree.filter(item => item.type !== 'directory') as Array<MDFileMeta|CodeFileMeta>
    },
    getDirectories: function (): DirMeta[] {
      return this.getFilteredTree.filter(item => item.type === 'directory') as DirMeta[]
    },
    uncollapsedDirectories: function (): string[] {
      return this.$store.state.uncollapsedDirectories
    },
    flattenedSimpleFileTree: function (): Array<[string, string]> {
      // First, take the filtered tree and flatten it
      let list: AnyDescriptor[] = []
      const uncollapsedDirs: string[]|undefined = (this.filterQuery.length === 0) ? this.uncollapsedDirectories : undefined

      this.getFilteredTree.forEach(elem => {
        list = list.concat(getFlattenedVisibleFileTree(elem, uncollapsedDirs))
      })

      const flatArray: Array<[string, string]> = []
      for (const elem of list) {
        // We need the type to check if we can uncollapse/collapse a directory
        flatArray.push([ elem.path, elem.type ])
      }
      return flatArray
    },
    fileSectionHeading: function (): string {
      return trans('gui.files')
    },
    workspaceSectionHeading: function (): string {
      return trans('gui.workspaces')
    },
    noRootsMessage: function (): string {
      return trans('gui.empty_directories')
    },
    noResultsMessage: function () {
      return trans('gui.no_search_results')
    }
  },
  methods: {
    /**
     * Called whenever the user clicks on the "No open files or folders"
     * message -- it requests to open a new folder from the main process.
     * @param  {MouseEvent} evt The click event.
     * @return {void}     Does not return.
     */
    requestOpenRoot: function (evt: MouseEvent) {
      ipcRenderer.invoke('application', { command: 'root-open-workspaces' })
        .catch(err => console.error(err))
    },
    clickHandler: function (event: MouseEvent) {
      // We need to bubble this event upwards so that the file manager is informed of the selection
      this.$emit('selection', event)
    },
    navigate: function (event: KeyboardEvent) {
      // The user requested to navigate into the file tree with the keyboard
      // Only capture arrow movements
      if (![ 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape' ].includes(event.key)) {
        return
      }

      event.stopPropagation()
      event.preventDefault()

      if (event.key === 'Escape') {
        this.activeTreeItem = undefined
        return
      }

      if (this.flattenedSimpleFileTree.length === 0) {
        return // Nothing to navigate
      }

      if (event.key === 'Enter' && this.activeTreeItem !== undefined) {
        // Open the currently active item
        if (this.activeTreeItem[1] === 'directory') {
          ipcRenderer.invoke('application', {
            command: 'set-open-directory',
            payload: this.activeTreeItem[0]
          })
            .catch(e => console.error(e))
        } else {
          // Select the active file (if there is one)
          ipcRenderer.invoke('application', {
            command: 'open-file',
            payload: {
              path: this.activeTreeItem[0],
              newTab: false
            }
          })
            .catch(e => console.error(e))
        }
      }

      // Get the current index of the current active file
      let currentIndex = this.flattenedSimpleFileTree.findIndex(val => val[0] === this.activeTreeItem?.[0])

      switch (event.key) {
        case 'ArrowDown':
          currentIndex++
          break
        case 'ArrowUp':
          currentIndex--
          break
        case 'ArrowLeft':
          // Close a directory if applicable
          if (currentIndex > -1 && this.flattenedSimpleFileTree[currentIndex][1] === 'directory') {
            this.$store.commit('removeUncollapsedDirectory', this.flattenedSimpleFileTree[currentIndex][0])
          }
          return
        case 'ArrowRight':
          // Open a directory if applicable
          if (currentIndex > -1 && this.flattenedSimpleFileTree[currentIndex][1] === 'directory') {
            this.$store.commit('addUncollapsedDirectory', this.flattenedSimpleFileTree[currentIndex][0])
          }
          return
      }

      // Sanitize the index
      if (currentIndex > this.flattenedSimpleFileTree.length - 1) {
        currentIndex = this.flattenedSimpleFileTree.length - 1
      } else if (currentIndex < 0) {
        currentIndex = 0
      }

      // Set the active tree item
      this.activeTreeItem = this.flattenedSimpleFileTree[currentIndex]
    },
    stopNavigate: function () {
      this.activeTreeItem = undefined
    }
  }
})
</script>

<style lang="less">
// @list-item-height: 20px;

body {
  #file-tree {
    position: relative;
    width: 100%;
    height: 100%;
    left: 0%;
    overflow-x: hidden;
    overflow-y: auto;
    outline: none;
    transition: left 0.3s ease, background-color 0.2s ease;

    &.hidden { left:-100%; }

    #directories-dirs-header, #directories-files-header {
      clr-icon {
        width: 12px;
        height: 12px;
        margin-left: 3px;
        margin-right: 3px;
        vertical-align: bottom;
      }
    }

    .list-item {
      position: relative;
    }

    .empty-tree {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        text-align: center;
        cursor: pointer; // Indicate that the user can click the area

        .info {
            display: block;
            padding: 10px;
            margin-top: 50%;
            font-weight: bold;
            font-size: 200%;
        }
    }
  }
}

body.darwin {
  #file-tree {
    // On macOS, a file-tree will be a sidebar, cf.:
    // https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/sidebars/

    #directories-dirs-header, #directories-files-header {
      border: none; // TODO: This comes from a theme
      color: rgb(160, 160, 160);
      font-weight: bold;
      font-size: inherit;
      margin: 20px 0px 5px 10px;

      clr-icon { display: none; }
    }
  }
}

body.win32 {
  #file-tree {
    background-color: rgb(230, 230, 230);

    #directories-dirs-header, #directories-files-header {
      border-bottom: 1px solid rgb(160, 160, 160);
      font-size: 11px;
      padding: 5px 0px 5px 10px;
      margin: 0px 0px 5px 0px;
    }
  }

  &.dark {
    #file-tree {
      background-color: rgb(30, 30, 40);
    }
  }
}

body.linux {
  #file-tree {
    background-color: rgb(230, 230, 230);

    #directories-dirs-header, #directories-files-header {
      border-bottom: 1px solid rgb(160, 160, 160);
      font-size: 11px;
      padding: 5px 0px 5px 10px;
      margin: 0px 0px 5px 0px;
    }
  }

  &.dark {
    #file-tree {
      background-color: rgb(rgb(40, 40, 50));
    }
  }
}
</style>
