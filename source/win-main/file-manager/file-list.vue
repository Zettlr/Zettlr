<template>
  <div
    id="file-list"
    tabindex="1"
    role="region"
    aria-label="File List"
    v-bind:class="{ 'hidden': !isVisible }"
    v-bind:aria-hidden="!isVisible"
    v-bind:data-hash="selectedDirectoryHash"
    v-on:keydown="navigate"
    v-on:focus="onFocusHandler"
    v-on:blur="activeDescriptor = null"
  >
    <template v-if="getDirectoryContents.length > 1">
      <div id="file-manager-filter">
        <input
          id="file-manager-filter-input"
          ref="quickFilter"
          v-model="filterQuery"
          type="search"
          placeholder="Filter …"
          v-on:focus="$event.target.select()"
          v-on:blur="activeDescriptor = null"
        />
      </div>
      <template v-if="getFilteredDirectoryContents.length === 0">
        <div class="empty-file-list">
          {{ noResultsMessage }}
        </div>
      </template>
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
            v-on:duplicate="handleOperation('file-duplicate', item.id)"
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
        v-bind:key="item.hash"
        v-bind:index="0"
        v-bind:obj="item.props"
        v-on:create-file="handleOperation('file-new', item.id)"
        v-on:create-dir="handleOperation('dir-new', item.id)"
      >
      </FileItem>
      <div
        v-if="getDirectoryContents[0].type === 'directory'"
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

<script>
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

import { trans } from '../../common/i18n-renderer'
import tippy from 'tippy.js'
import FileItem from './file-item'
import { RecycleScroller } from 'vue-virtual-scroller'
import objectToArray from '../../common/util/object-to-array'

const ipcRenderer = window.ipc

export default {
  name: 'FileList',
  components: {
    FileItem,
    RecycleScroller
  },
  props: {
    isVisible: {
      type: Boolean,
      required: true
    }
  },
  data: function () {
    return {
      filterQuery: '',
      activeDescriptor: null // Can contain the active ("focused") item
    }
  },
  computed: {
    selectedDirectory: function () {
      return this.$store.state.selectedDirectory
    },
    selectedDirectoryHash: function () {
      if (this.selectedDirectory === null) {
        return ''
      } else {
        return this.selectedDirectory.hash
      }
    },
    noResultsMessage: function () {
      return trans('gui.no_search_results')
    },
    emptyFileListMessage: function () {
      return trans('gui.no_dir_selected')
    },
    emptyDirectoryMessage: function () {
      return trans('gui.empty_dir')
    },
    selectedFile: function () {
      return this.$store.state.activeFile
    },
    itemHeight: function () {
      if (this.$store.state.config['fileMeta'] === true) {
        return 70
      } else {
        return 30
      }
    },
    getDirectoryContents: function () {
      if (this.$store.state.selectedDirectory === null) {
        return []
      }

      let ret = []
      const items = objectToArray(this.$store.state.selectedDirectory, 'children')
      for (let i = 0; i < items.length; i++) {
        ret.push({
          id: i, // This helps the virtual scroller to adequately position the items
          props: items[i] // The actual item
        })
      }
      return ret
    },
    getFilteredDirectoryContents: function () {
      // Returns a list of directory contents, filtered
      const originalContents = this.getDirectoryContents

      const q = String(this.filterQuery).trim().toLowerCase() // Easy access

      if (q === '') {
        return originalContents
      }

      const queries = q.toLowerCase().split(' ').filter(query => query.trim() !== '')

      // Filter based on the query (remember: there's an ID and a "props" property)
      return originalContents.filter(element => {
        if (element.mock !== undefined && element.mock === true) {
          // Never hide mocked elements
          return true
        }

        const item = element.props

        for (const q of queries) {
          // If the query only consists of a "#" also include files that
          // contain tags, no matter which
          if (q === '#') {
            if (item.type === 'file' && item.tags.length > 0) {
              return true
            }
          }

          // Let's check for tag matches
          if (q.startsWith('#') && item.type === 'file') {
            const tagMatch = item.tags.find(tag => tag.indexOf(q.substr(1)) >= 0)
            if (tagMatch !== undefined) {
              return true
            }
          }

          // First, see if the name gives a match.
          if (item.name.toLowerCase().indexOf(q) >= 0) {
            return true
          }

          const hasFrontmatter = item.frontmatter != null
          const hasTitle = hasFrontmatter && item.frontmatter.title !== undefined

          // Does the frontmatter work?
          if (item.type === 'file' && hasTitle) {
            if (item.frontmatter.title.toLowerCase().indexOf(q) >= 0) {
              return true
            }
          }

          // Third, should we use headings 1 and, if so, does it match?
          const useH1 = Boolean(this.$store.state.config['display.useFirstHeadings'])
          if (useH1 && item.type === 'file' && item.firstHeading != null) {
            if (item.firstHeading.toLowerCase().indexOf(q) >= 0) {
              return true
            }
          }
        } // END for

        return false
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
      this.$nextTick(function () {
        this.scrollIntoView()
      })
    },
    selectedDirectory: function () {
      // Reset the local search when a new directory has been selected
      this.filterQuery = ''
    }
  },
  mounted: function () {
    ipcRenderer.on('shortcut', (event, message) => {
      if (message === 'filter-files') {
        // Focus the filter on the next tick. Why? Because it might be that
        // the file manager is hidden, or the global search is visible. In both
        // cases we need to wait for the app to display the file manager.
        this.$nextTick(() => {
          this.$refs['quickFilter'].focus()
        })
      }
    })
  },
  /**
   * Updates associated stuff whenever an update operation on the file manager
   * has finished (such as tippy).
   */
  updated: function () {
    this.$nextTick(function () {
      this.updateDynamics()
    })
  },
  methods: {
    /**
     * Navigates the filelist to the next/prev file or directory.
     * Hold Shift for moving by 10 files, Command or Control to
     * jump to the very end.
     */
    navigate: function (evt) {
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
    onFocusHandler: function (event) {
      this.activeDescriptor = this.selectedFile
    },
    focusFilter: function () {
      this.$refs.quickFilter.focus()
    },
    handleOperation: async function (type, idx) {
      // Creates files and directories, or duplicates a file.
      const source = this.getDirectoryContents.find(item => item.id === idx).props
      await ipcRenderer.invoke('application', {
        command: type,
        payload: { path: source.path }
      })
    }
  }
}
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

      #file-manager-filter {
        padding: 5px;
        position: sticky;
        top: 0;
        z-index: 2;
        left: 0;
        right: 0;

        #file-manager-filter-input {
          border: 1px solid transparent;
          padding: 5px;
          width: 100%;
        }
      }

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

    #file-manager-filter {
      background-color: rgb(230, 230, 230);
      height: 30px;
      padding: 4px;
      border-right: 1px solid #d5d5d5;

      #file-manager-filter-input {
        width: 100%;
        font-size: 11px;
        height: calc(30px - 9px);
      }
    }
  }

  &.dark #file-list {
    background-color: rgb(40, 40, 50);

    #file-manager-filter {
      border-right-color: #505050;
      background-color: rgb(40, 40, 50);
    }
  }
}

body.win32 {
  #file-list {
    background-color: rgb(230, 230, 230);

    #file-manager-filter {
      padding: 0;
      border-bottom: 2px solid rgb(230, 230, 230);
      height: 32px; // The border should be *below* the 30px mark

      #file-manager-filter-input { height: 30px; }
    }
  }
}
</style>
