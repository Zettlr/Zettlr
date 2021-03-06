<template>
  <div
    id="file-list"
    tabindex="1"
    v-bind:data-hash="selectedDirectoryHash"
    v-on:keydown="navigate"
    v-on:focus="onFocusHandler"
    v-on:blur="activeDescriptor = null"
  >
    <template v-if="emptySearchResults">
      <!-- Did we have no search results? -->
      <div class="empty-file-list">
        {{ noResultsMessage }}
      </div>
    </template>
    <template v-else-if="getDirectoryContents.length > 1">
      <div id="file-manager-filter">
        <input
          id="file-manager-filter-input"
          ref="quickFilter"
          v-model="filterQuery"
          type="search"
          placeholder="Filter …"
          v-on:focus="$event.target.select()"
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
          v-slot="{ item }"
          v-bind:items="getFilteredDirectoryContents"
          v-bind:item-size="itemHeight"
          v-bind:emit-update="true"
          v-bind:page-mode="true"
          v-on:update="updateDynamics"
        >
          <FileItemMock
            v-if="item.mock !== undefined && item.mock === true"
            v-bind:obj="item.props"
            v-on:submit="handleOperationFinish($event)"
            v-on:cancel="handleOperationFinish('')"
          >
          </FileItemMock>
          <FileItem
            v-else
            v-bind:obj="item.props"
            v-bind:active-file="activeDescriptor"
            v-on:duplicate="startOperation('duplicate', item.id)"
            v-on:create-file="startOperation('createFile', item.id)"
            v-on:create-dir="startOperation('createDir', item.id)"
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
        v-bind:obj="item.props"
        v-on:create-file="startOperation('createFile', item.id)"
        v-on:create-dir="startOperation('createDir', item.id)"
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
import { trans } from '../../common/i18n'
import tippy from 'tippy.js'
import FileItem from './file-item'
import FileItemMock from './file-item-mock'
import { RecycleScroller } from 'vue-virtual-scroller'
import { ipcRenderer } from 'electron'
import generateFileName from '../../common/util/generate-filename'

export default {
  name: 'FileList',
  components: {
    FileItem,
    FileItemMock,
    RecycleScroller
  },
  data: function () {
    return {
      filterQuery: '',
      activeDescriptor: null, // Can contain a hash of the active ("focused") item
      // The next two properties are needed for three operations: Create a new
      // file, create a new directory, and duplicate a file.
      // operationType will indicate what we want to do, while the index points
      // to our reference (a file in case of duplication, otherwise a dir).
      operationType: '', // Can be createFile, createDir, duplicate
      operationIndex: null
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
    emptySearchResults: function () {
      return false // TODO this.$store.state.searchNoResults
    },
    selectedFile: function () {
      return this.$store.state.selectedFile
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

      let ret = [{
        id: -1, // ¯\_(ツ)_/¯
        props: this.$store.state.selectedDirectory
      }]
      const children = this.$store.state.selectedDirectory.children
      for (let i = 0; i < children.length; i++) {
        ret.push({
          id: i, // This helps the virtual scroller to adequately position the items
          props: children[i] // The actual item
        })
      }

      // Afterwards, if there is a file-duplication in progress, splice in the
      // mock object at the right position.
      if (this.operationType !== '' && this.operationIndex !== null) {
        const mirroredItem = ret.find(item => item.id === this.operationIndex).props
        if (this.operationType === 'duplicate') {
          // Why plus 2? Because we're actually starting at -1, and we have to
          // add that thing AFTER the item to be duplicated. The index is not
          // the array index but the object's ID.
          ret.splice(this.operationIndex + 2, 0, {
            id: children.length,
            mock: true, // This will help getFilteredDirectoryContents to never exclude it in display
            props: {
              name: 'Copy of ' + mirroredItem.name, // TODO: Translate
              type: mirroredItem.type
            }
          })
        } else if (this.operationType === 'createFile') {
          ret.splice(this.operationIndex + 2, 0, {
            id: children.length,
            mock: true, // This will help getFilteredDirectoryContents to never exclude it in display
            props: {
              name: generateFileName(), // TODO: Generate file name!
              type: 'file' // TODO: Enable file extensions on the mock object so the user can create code files
            }
          })
        } else if (this.operationType === 'createDir') {
          ret.splice(this.operationIndex + 2, 0, {
            id: children.length,
            mock: true, // This will help getFilteredDirectoryContents to never exclude it in display
            props: {
              name: 'New Directory', // TODO: Translate
              type: 'directory'
            }
          })
        }
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

      const queries = q.split(' ')

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
          const useH1 = Boolean(this.$store.state.useFirstHeadings)
          if (useH1 && item.type === 'file' && item.firstHeading !== null) {
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
        return elem.props.hash === this.activeDescriptor
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
          return e.hash === this.activeDescriptor
        } else {
          return e.hash === this.selectedFile
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
            payload: descriptor.path
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
            this.activeDescriptor = list[list.length - 1].hash
          } else if (index < list.length) {
            this.activeDescriptor = list[index].hash
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
            this.activeDescriptor = list[0].hash
          } else if (index >= 0) {
            this.activeDescriptor = list[index].hash
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
          return e.props.hash === this.activeDescriptor
        } else {
          return e.props.hash === this.selectedFile
        }
      })

      if (index === undefined) {
        return
      }

      index = this.getFilteredDirectoryContents.indexOf(index)

      let modifier = this.itemHeight
      let position = index * modifier
      const quickFilterModifier = 40 // Height of the quick filter TODO: This is monkey patched

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
        if (elem.hasOwnProperty('_tippy')) {
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
    startOperation: function (type, idx) {
      // We are told that the user wants to perform operation type on reference
      // object idx.
      this.operationType = type
      this.operationIndex = idx
    },
    handleOperationFinish: function (name) {
      // Called whenever a mock object reports a "submit" event after the user
      // has confirmed the operation.
      const mirroredItem = this.getDirectoryContents.find(item => item.id === this.operationIndex).props
      console.log(this.operationIndex, mirroredItem)
      if (this.operationType === 'duplicate') {
        if (name.trim() !== '') {
          ipcRenderer.invoke('application', {
            command: 'file-duplicate',
            payload: {
              path: mirroredItem.path,
              name: name.trim()
            }
          }).catch(e => console.error(e))
        }
      } else if (this.operationType === 'createFile') {
        if (name.trim() !== '') {
          ipcRenderer.invoke('application', {
            command: 'file-new',
            payload: {
              path: mirroredItem.path,
              name: name.trim()
            }
          }).catch(e => console.error(e))
        }
      } else if (this.operationType === 'createDir') {
        if (name.trim() !== '') {
          ipcRenderer.invoke('application', {
            command: 'dir-new',
            payload: {
              path: mirroredItem.path,
              name: name.trim()
            }
          }).catch(e => console.error(e))
        } else {
          console.log('Canceling operation.')
        }
      }

      this.operationType = ''
      this.operationIndex = null
    }
  }
}
</script>

<style lang="less">
body {
  #file-list {
    transition: left 0.3s ease;
    position: relative;
    width: 100%;
    top: -100%;
    left: 0%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    outline: none;

    &.hidden {
      left: 100%;
    }

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
</style>
