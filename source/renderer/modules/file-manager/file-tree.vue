<template>
  <div id="file-tree" v-on:click="clickHandler">
    <template v-if="$store.state.items.length > 0">
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
import { trans } from '../../../common/i18n'
import TreeItem from './tree-item.vue'

export default {
  name: 'FileTree',
  components: {
    TreeItem
  },
  computed: {
    getFiles: function () {
      return this.$store.getters.rootFiles
    },
    getDirectories: function () {
      return this.$store.getters.rootDirectories
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
      global.ipc.send('dir-open')
    },
    clickHandler: function (event) {
      // We need to bubble this event upwards so that the file manager is informed of the selection
      this.$emit('selection', event)
    }
  }
}
</script>
