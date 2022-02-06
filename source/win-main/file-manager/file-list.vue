<template>
  <div
    id="file-list"
    tabindex="1"
    role="region"
    aria-label="File List"
    v-bind:class="{ hidden: !isVisible }"
    v-bind:aria-hidden="!isVisible"
    v-bind:data-hash="selectedDirectoryHash"
    v-on:focus="onFocusHandler"
    v-on:blur="activeDescriptor = null"
  >
    <template v-if="getDirectoryContents.length > 1">
      <div v-if="getFilteredDirectoryContents.length === 0" class="empty-file-list">
        {{ noResultsMessage }}
      </div>
      <template v-else>
        <!--
        For the "real" file list, we need the virtual scroller to maintain
        performance, because it may contain thousands of elements.
        Provide the virtual scroller with the correct size of the list
        items (60px in mode with meta-data, 30 in cases without).
        NOTE: The page-mode MUST be true, because it will speed up
        performance incredibly!
        -->
        <RecycleScroller
          v-slot="{ item, index }"
          v-bind:items="getFilteredDirectoryContents"
          v-bind:item-size="itemHeight"
          v-bind:emit-update="true"
          v-bind:page-mode="true"
          v-on:update="updateDynamics"
        >
          <FileItem
            v-bind:obj="item.props"
            v-bind:active-file="activeDescriptor"
            v-bind:index="index"
            v-on:create-file="handleOperation('file-new', item.id)"
            v-on:create-dir="handleOperation('dir-new', item.id)"
            v-on:begin-dragging="$emit('lock-file-tree')"
          ></FileItem>
        </RecycleScroller>
      </template>
    </template>
    <template v-else-if="getDirectoryContents.length === 1">
      <!--
        We don't need the mock item here, because if any operation is started
        the actual directory contents will be larger than 1.
      -->
      <FileItem
        v-for="item in getDirectoryContents"
        v-bind:key="item.id"
        v-bind:index="0"
        v-bind:obj="item.props"
        v-on:create-file="handleOperation('file-new', item.id)"
        v-on:create-dir="handleOperation('dir-new', item.id)"
      >
      </FileItem>
      <div
        v-if="getDirectoryContents[0].props.type === 'directory'"
        class="empty-directory"
      >
        {{ emptyDirectoryMessage }}
      </div>
    </template>
    <template v-else>
      <!-- Same as above: Detect combined file manager mode -->
      <div class="empty-file-list">
        {{ emptyFileListMessage }}
      </div>
    </template>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileList
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component renders the contents of a single directory as
 *                  a flat list.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import tippy from 'tippy.js'
import FileItem from './file-item.vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import objectToArray from '@common/util/object-to-array'
import matchQuery from './util/match-query'

import { nextTick, defineComponent } from 'vue'
import { MDFileMeta, CodeFileMeta, DirMeta } from '@dts/common/fsal'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'FileList',
  components: {
    FileItem,
    RecycleScroller
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
      activeDescriptor: null as any|null // Can contain the active ("focused") item
    }
  },
  computed: {
    selectedDirectory: function (): any {
      return this.$store.state.selectedDirectory
    },
    selectedDirectoryHash: function (): string {
      if (this.selectedDirectory === null) {
        return ''
      } else {
        return this.selectedDirectory.hash
      }
    },
    noResultsMessage: function (): string {
      return trans('gui.no_search_results')
    },
    emptyFileListMessage: function (): string {
      return trans('gui.no_dir_selected')
    },
    emptyDirectoryMessage: function (): string {
      return trans('gui.empty_dir')
    },
    selectedFile: function (): string {
      return this.$store.state.activeFile
    },
    itemHeight: function (): number {
      if (this.$store.state.config['fileMeta'] === true) {
        return 70
      } else {
        return 30
      }
    },
    getDirectoryContents: function (): Array<{ id: number, props: MDFileMeta|CodeFileMeta|DirMeta}> {
      if (this.$store.state.selectedDirectory === null) {
        return []
      }

      const ret: Array<{ id: number, props: MDFileMeta|CodeFileMeta|DirMeta}> = []
      const items = objectToArray(this.$store.state.selectedDirectory, 'children')
      for (let i = 0; i < items.length; i++) {
        ret.push({
          id: i, // This helps the virtual scroller to adequately position the items
          props: items[i] // The actual item
        })
      }
      return ret
    },
    useH1: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('heading')
    },
    useTitle: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('title')
    },
    getFilteredDirectoryContents: function (): any[] {
      // Returns a list of directory contents, filtered
      const originalContents = this.getDirectoryContents

      const q = String(this.filterQuery).trim().toLowerCase() // Easy access

      if (q === '') {
        return originalContents
      }

      const filter = matchQuery(q, this.useTitle, this.useH1)

      // Filter based on the query (remember: there's an ID and a "props" property)
      return originalContents.filter(element => {
        return filter(element.props)
      })
    }
  },
  watch: {
    getFilteredDirectoryContents: function () {
      // Whenever the directory contents change, reset the active file if it's
      // no longer in the list
      const foundDescriptor = this.getFilteredDirectoryContents.find((elem) => {
        return elem.props === this.activeDescriptor
      })

      if (foundDescriptor === undefined) {
        this.activeDescriptor = null
      }
    },
    selectedFile: function () {
      this.scrollIntoView()
    },
    getDirectoryContents: function () {
      nextTick()
        .then(() => { this.scrollIntoView() })
        .catch(err => console.error(err))
    }
  },
  mounted: function () {
  },
  /**
   * Updates associated stuff whenever an update operation on the file manager
   * has finished (such as tippy).
   */
  updated: function () {
    nextTick()
      .then(() => { this.updateDynamics() })
      .catch(err => console.error(err))
  },
  methods: {
    /**
     * Navigates the filelist to the next/prev file or directory.
     * Hold Shift for moving by 10 files, Command or Control to
     * jump to the very end.
     */
    navigate: function (evt: KeyboardEvent) {
      // Only capture arrow movements
      if (![ 'ArrowDown', 'ArrowUp', 'Enter' ].includes(evt.key)) {
        return
      }

      evt.stopPropagation()
      evt.preventDefault()

      const shift = evt.shiftKey === true
      const cmd = evt.metaKey === true && process.platform === 'darwin'
      const ctrl = evt.ctrlKey === true && process.platform !== 'darwin'
      const cmdOrCtrl = cmd || ctrl

      // getDirectoryContents accomodates the virtual scroller
      // by packing the actual items in a props property.
      const list = this.getFilteredDirectoryContents.map(e => e.props)
      const descriptor = list.find(e => {
        if (this.activeDescriptor !== null) {
          return e === this.activeDescriptor
        } else {
          return e === this.selectedFile
        }
      })

      // On pressing enter, that's the same as clicking
      if (evt.key === 'Enter' && this.activeDescriptor !== null) {
        if (descriptor.type === 'directory') {
          ipcRenderer.invoke('application', {
            command: 'set-open-directory',
            payload: descriptor.path
          })
            .catch(e => console.error(e))
        } else {
          // Select the active file (if there is one)
          ipcRenderer.invoke('application', {
            command: 'open-file',
            payload: {
              path: descriptor.path,
              newTab: false
            }
          })
            .catch(e => console.error(e))
        }
        return // Stop handling
      }

      let index = list.indexOf(descriptor)

      switch (evt.key) {
        case 'ArrowDown':
          index++
          if (shift) {
            index += 9 // Fast-scrolling
          }
          if (index >= list.length) {
            index = list.length - 1
          }
          if (cmdOrCtrl) {
            // Select the last file
            this.activeDescriptor = list[list.length - 1]
          } else if (index < list.length) {
            this.activeDescriptor = list[index]
          }
          break
        case 'ArrowUp':
          index--
          if (shift) {
            index -= 9 // Fast-scrolling
          }
          if (index < 0) {
            index = 0
          }
          if (cmdOrCtrl) {
            // Select the first file
            this.activeDescriptor = list[0]
          } else if (index >= 0) {
            this.activeDescriptor = list[index]
          }
          break
      }
      this.scrollIntoView()
    },
    scrollIntoView: function () {
      // In case the file changed, make sure it's in view.
      let scrollTop = this.$el.scrollTop
      let index = this.getFilteredDirectoryContents.find(e => {
        if (this.activeDescriptor !== null) {
          return e.props === this.activeDescriptor
        } else {
          return e.props === this.selectedFile
        }
      })

      if (index === undefined) {
        return
      }

      index = this.getFilteredDirectoryContents.indexOf(index)

      let modifier = this.itemHeight
      let position = index * modifier
      const quickFilterModifier = 40 // Height of the quick filter

      if (position < scrollTop) {
        this.$el.scrollTop = position
      } else if (position > scrollTop + this.$el.offsetHeight - modifier) {
        this.$el.scrollTop = position - this.$el.offsetHeight + modifier + quickFilterModifier
      }
    },
    /**
     * Called everytime when there is an update to the DOM, so that we can
     * dynamically enable all newly rendered tippy instances.
     * @return {void}     Does not return.
     */
    updateDynamics: function () {
      // Tippy.js cannot observe changes within attributes, so because
      // the instances are all created in advance, we have to update
      // the content so that it reflects the current content of
      // the data-tippy-content-property.
      let elements = this.$el.querySelectorAll('[data-tippy-content]')
      for (let elem of elements) {
        // Either there's already an instance on the element,
        // then only update its contents ...
        if ('_tippy' in elem) {
          elem._tippy.setContent(elem.dataset.tippyContent)
        } else {
          // ... or there is none, so let's add a tippy instance.
          tippy(elem, {
            delay: 100,
            arrow: true,
            duration: 100
          })
        }
      }
    },
    onFocusHandler: function (event: any) {
      this.activeDescriptor = this.selectedFile
    },
    focusFilter: function () {
      (this.$refs.quickFilter as HTMLInputElement).focus()
    },
    handleOperation: async function (type: string, idx: number) {
      // Creates files and directories, or duplicates a file.
      const source = this.getDirectoryContents.find(item => item.id === idx)?.props
      if (source === undefined) {
        throw new Error('Could not handle file list operation: Source was undefined')
      }

      await ipcRenderer.invoke('application', {
        command: type,
        payload: { path: source.path }
      })
    }
  }
})
</script>

<style lang="less">
// Import the necessary styles for the virtual scroller
@import '~vue-virtual-scroller/dist/vue-virtual-scroller.css';

body {
  #file-list {
    transition: left 0.3s ease;
    position: relative;
    width: 100%;
    top: -100%;
    left: 0%;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    outline: none;

    &.hidden { left: 100%; }

    .empty-file-list, .empty-directory {
      display: block;
      text-align: center;
      padding: 10px;
      margin-top: 50%;
      font-weight: bold;
      font-size: 200%;
    }
  }
}

body.darwin {
  #file-list {
    background-color: white;
  }

  &.dark #file-list {
    background-color: rgb(40, 40, 50);
  }
}

body.win32 {
  #file-list {
    background-color: rgb(230, 230, 230);
  }

  &.dark {
    #file-list {
      background-color: rgb(40, 40, 50);
    }
  }
}
</style>
