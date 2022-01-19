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
      <div v-if="getFilteredTree.length === 0" class="empty-file-list">
        {{ noResultsMessage }}
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
import { IpcRenderer } from 'electron'
import { MDFileMeta, CodeFileMeta, DirMeta } from '@dts/common/fsal'

const ipcRenderer: IpcRenderer = (window as any).ipc

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
    return {}
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
      ipcRenderer.invoke('application', { command: 'open-workspace' })
        .catch(err => console.error(err))
    },
    clickHandler: function (event: MouseEvent) {
      // We need to bubble this event upwards so that the file manager is informed of the selection
      this.$emit('selection', event)
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
