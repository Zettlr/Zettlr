<template>
  <div
    id="file-tree"
    role="region"
    aria-label="File Tree"
    v-bind:class="{ 'hidden': !isVisible }"
    v-bind:aria-hidden="!isVisible"
    v-on:click="clickHandler"
  >
    <template v-if="$store.state.fileTree.length > 0">
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

<script>
import { ipcRenderer } from 'electron'
import { trans } from '../../common/i18n'
import TreeItem from './tree-item.vue'

export default {
  name: 'FileTree',
  components: {
    TreeItem
  },
  props: {
    fileTree: {
      type: Array,
      default: function () { return [] }
    },
    isVisible: {
      type: Boolean,
      required: true
    }
  },
  computed: {
    getFiles: function () {
      return this.fileTree.filter(item => item.type !== 'directory')
    },
    getDirectories: function () {
      return this.fileTree.filter(item => item.type === 'directory')
    },
    fileSectionHeading: function () {
      return trans('gui.files')
    },
    workspaceSectionHeading: function () {
      return trans('gui.workspaces')
    },
    noRootsMessage: function () {
      return trans('gui.empty_directories')
    }
  },
  methods: {
    /**
     * Called whenever the user clicks on the "No open files or folders"
     * message -- it requests to open a new folder from the main process.
     * @param  {MouseEvent} evt The click event.
     * @return {void}     Does not return.
     */
    requestOpenRoot: function (evt) {
      ipcRenderer.invoke('application', { command: 'open-workspace' })
        .catch(err => console.error(err))
    },
    clickHandler: function (event) {
      // We need to bubble this event upwards so that the file manager is informed of the selection
      this.$emit('selection', event)
    }
  }
}
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
    transition: left 0.3s ease;

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
    #directories-dirs-header, #directories-files-header {
      border-bottom: 1px solid rgb(160, 160, 160);
      font-size: 11px;
      padding: 5px 0px 5px 10px;
      margin: 0px 0px 5px 0px;
    }
  }
}
</style>
