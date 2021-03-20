/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileItem Vue component.
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a single file list item.
 *
 * END HEADER
 */
<template>
  <div
    v-bind:class="{
      'list-item': true,
      'project': obj.type === 'directory' && obj.project !== null,
      'selected': obj === selectedFile,
      'active': obj === activeFile,
      'has-meta-info': fileMeta,
      'directory': obj.type === 'directory'
    }"
    v-bind:data-id="obj.id"
    v-bind:data-filename="getFilename"
    v-bind:draggable="isDraggable"
    v-bind:style="getStyle"
    v-on:click.stop="requestSelection"
    v-on:dragstart.stop="beginDragging"
    v-on:drag="onDragHandler"
    v-on:contextmenu="handleContextMenu"
  >
    <div class="filename">
      <!-- Display the date in the top-right corner -->
      <div v-if="fileMeta" class="date">
        {{ getDate }}
      </div>
      <clr-icon
        v-if="isProject"
        aria-label="Project"
        shape="blocks-group"
        class="is-solid"
      ></clr-icon>
      <input
        v-if="nameEditing"
        ref="name-editing-input"
        type="text"
        v-bind:value="obj.name"
        v-on:keyup.enter="finishNameEditing($event.target.value)"
        v-on:keyup.esc="nameEditing = false"
        v-on:blur="nameEditing = false"
        v-on:click.stop=""
      >
      <span v-else>
        {{ basename }}
      </span>
    </div>
    <div v-if="fileMeta" class="meta-info">
      <div v-if="isDirectory">
        <span class="badge">{{ countDirs }}</span>
        <span class="badge">{{ countFiles }}</span>
      </div>
      <template v-else>
        <div v-if="hasTags">
          <!-- First line -->
          <div v-for="(tag, idx) in obj.tags" v-bind:key="idx" class="tag badge">
            <span
              v-if="retrieveTagColour(tag)"
              class="color-circle"
              v-bind:style="{
                'background-color': retrieveTagColour(tag)
              }"
            ></span>
            <span>#{{ tag }}</span>
          </div>
        </div>
        <div>
          <!-- Second line -->
          <!-- Is this a code file? -->
          <span
            v-if="isCode"
            aria-label="Code-file"
            class="code-indicator badge"
          >
            {{ obj.ext.substr(1) }}
          </span>
          <!-- Display the ID, if there is one -->
          <span v-if="obj.id" class="id badge">{{ obj.id }}</span>
          <!-- Display the file size if we have a code file -->
          <span v-if="obj.type === 'code'" class="badge">{{ formattedSize }}</span>
          <!--
            Next, the user will want to know how many words are in here. To save
            space, we will either display only the words, OR the word count in
            relation to a set writing target, if there is one.
          -->
          <span v-else-if="!hasWritingTarget" class="badge">
            {{ formattedWordCount }}
          </span>
          <span v-else class="badge">
            <svg
              class="target-progress-indicator"
              width="16"
              height="16"
              viewBox="-1 -1 2 2"
            >
              <circle
                class="indicator-meter"
                cx="0"
                cy="0"
                r="1"
                shape-rendering="geometricPrecision"
              ></circle>
              <path
                v-bind:d="writingTargetPath"
                fill=""
                class="indicator-value"
                shape-rendering="geometricPrecision"
              ></path>
            </svg>
            {{ writingTargetInfo }}
          </span>
        </div>
      </template> <!-- END meta info for files -->
    </div>
  </div>
</template>

<script>
import { trans } from '../../common/i18n.js'
import formatDate from '../../common/util/format-date.js'
import localiseNumber from '../../common/util/localise-number'
import formatSize from '../../common/util/format-size'
import fileContextMenu from './util/file-item-context.js'
import dirContextMenu from './util/dir-item-context.js'
import { ipcRenderer } from 'electron'
import PopoverFileProps from './PopoverFileProps'
import PopoverDirProps from './PopoverDirProps'

export default {
  name: 'FileItem',
  components: {
  },
  // Bind the actual object to the container
  props: {
    obj: {
      type: Object,
      default: function () { return {} }
    },
    activeFile: {
      type: Object,
      default: function () { return {} }
    }
  },
  data: () => {
    return {
      nameEditing: false // True as long as the user edits the filename
    }
  },
  computed: {
    selectedFile: function () {
      return this.$store.state.activeFile
    },
    // We have to explicitly transform ALL properties to computed ones for
    // the reactivity in conjunction with the recycle-scroller.
    basename: function () {
      if (this.obj.frontmatter && this.obj.frontmatter.hasOwnProperty('title')) {
        return this.obj.frontmatter.title
      } else if (this.obj.firstHeading && this.$store.state.config['display.useFirstHeadings']) {
        return this.obj.firstHeading
      } else {
        return this.obj.name.replace(this.obj.ext, '')
      }
    },
    getFilename: function () {
      return this.obj.name
    },
    getColoredTags: function () {
      if (this.obj.tags === undefined) {
        return []
      } else {
        const ret = []
        const colouredTags = this.$store.state.colouredTags
        for (const colouredTag in colouredTags) {
          if (this.obj.tags.includes(colouredTag.name)) {
            ret.push(colouredTag)
          }
        }

        return ret
      }
    },
    hasTags: function () {
      return this.obj.tags !== undefined && this.obj.tags.length > 0
    },
    isDirectory: function () {
      return this.obj.type === 'directory'
    },
    isProject: function () {
      return this.isDirectory === true && this.obj.project !== null
    },
    isDraggable: function () {
      return this.isDirectory === false
    },
    fileMeta: function () {
      return this.$store.state.config['fileMeta']
    },
    displayTime: function () {
      return this.$store.state.displayTime
    },
    isCode: function () {
      return this.obj.type === 'code'
    },
    getDate: function () {
      if (this.$store.state.config['fileMetaTime'] === 'modtime') {
        return formatDate(this.obj.modtime, true)
      } else {
        return formatDate(this.obj.creationtime, true)
      }
    },
    getStyle: function () {
      if (this.obj.hasOwnProperty('results')) {
        let w = 0
        let hue = window.getComputedStyle(document.documentElement).getPropertyValue('--search-hue') || '159'
        for (let r of this.obj.results) w += r.weight
        w = Math.round(w / this.$store.state.maxWeight * 100) // Percentage
        let style = `background-color:hsl(${hue}, ${w}%, 50%);`
        style += ` color: ${(w > 50) ? 'black' : 'white'};`
        return style
      }
      return ''
    },
    countDirs: function () {
      if (this.isDirectory === false) {
        return 0
      }
      return this.obj.children.filter(e => e.type === 'directory').length + ' ' + trans('system.directories') || 0
    },
    countFiles: function () {
      if (this.isDirectory === false) {
        return 0
      }
      return this.obj.children.filter(e => [ 'file', 'code' ].includes(e.type)).length + ' ' + trans('system.files') || 0
    },
    countTags: function () {
      if (this.obj.type !== 'file') {
        return 0
      }
      return this.obj.tags.length
    },
    hasWritingTarget: function () {
      if (this.obj.type !== 'file' || this.obj.target === undefined) {
        return false
      }

      // We definitely have a target
      return true
    },
    writingTargetPath: function () {
      let current = this.obj.charCount
      if (this.obj.target.mode === 'words') current = this.obj.wordCount
      let progress = current / this.obj.target.count
      let large = (progress > 0.5) ? 1 : 0
      if (progress > 1) progress = 1 // Never exceed 100 %
      let x = Math.cos(2 * Math.PI * progress)
      let y = Math.sin(2 * Math.PI * progress)
      return `M 1 0 A 1 1 0 ${large} 1 ${x} ${y} L 0 0`
    },
    writingTargetInfo: function () {
      let current = this.obj.charCount
      if (this.obj.target.mode === 'words') {
        current = this.obj.wordCount
      }

      let progress = Math.round(current / this.obj.target.count * 100)
      if (progress > 100) {
        progress = 100 // Never exceed 100 %
      }

      let label = trans('dialog.target.chars')
      if (this.obj.target.mode === 'words') {
        label = trans('dialog.target.words')
      }

      return `${localiseNumber(current)} / ${localiseNumber(this.obj.target.count)} ${label} (${progress} %)`
    },
    formattedWordCount: function () {
      if (this.obj.wordCount === undefined) {
        return '' // Failsafe because code files don't have a word count.
      }
      // TODO: Enable char count as well!!
      return trans('gui.words', localiseNumber(this.obj.wordCount))
    },
    formattedSize: function () {
      return formatSize(this.obj.size)
    }
  },
  watch: {
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
  methods: {
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

            this.$showPopover(PopoverDirProps, this.$el, data, (data) => {
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
          } else if (clickedID === 'menu.delete_file') {
            ipcRenderer.invoke('application', {
              command: 'file-delete',
              payload: { path: this.obj.path }
            })
              .catch(err => console.error(err))
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

            if (this.hasWritingTarget) {
              data.targetValue = this.obj.target.count
              data.targetMode = this.obj.target.mode
            }

            if (this.obj.type === 'file') {
              data.words = this.obj.wordCount
            }

            this.$showPopover(PopoverFileProps, this.$el, data, (data) => {
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
    retrieveTagColour: function (tagName) {
      const colouredTags = this.$store.state.colouredTags
      const foundTag = colouredTags.find(tag => tag.name === tagName)
      if (foundTag !== undefined) {
        return foundTag.color
      } else {
        return false
      }
    },
    requestSelection: function (event) {
      const alt = event.altKey === true

      if (this.obj.type === 'file' && alt) {
        // QuickLook the file
        ipcRenderer.invoke('application', {
          command: 'open-quicklook',
          payload: this.obj.path
        })
          .catch(e => console.error(e))
      } else if ([ 'file', 'code' ].includes(this.obj.type)) {
        // Request the clicked file
        ipcRenderer.invoke('application', {
          command: 'open-file',
          payload: this.obj.path
        })
          .catch(e => console.error(e))
      } else if (alt && this.obj.parent !== null) {
        // Select the parent directory
        ipcRenderer.invoke('application', {
          command: 'set-open-directory',
          payload: this.obj.parent.path
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
    beginDragging: function (event) {
      event.dataTransfer.dropEffect = 'move'
      // Tell the file manager component to lock the directory tree
      // (only necessary for thin mode)
      this.$emit('begin-dragging')
      event.dataTransfer.setData('text/x-zettlr-file', JSON.stringify({
        'type': this.obj.type, // Can be file, code, or directory
        'path': this.obj.path,
        'id': this.obj.id // Convenience
      }))
    },
    onDragHandler: function (event) {
      // We don't need to check if it's a directory because only files are
      // draggable in the file list.
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
     * Called when the user finishes renaming this file item
     *
     * @param   {string}  newName  The new name given to the item
     */
    finishNameEditing: function (newName) {
      if (newName === this.obj.name) {
        return // Not changed
      }

      const command = (this.obj.type === 'directory') ? 'dir-rename' : 'file-rename'

      ipcRenderer.invoke('application', {
        command: command,
        payload: { hash: this.obj.hash, name: newName }
      })
        .catch(e => console.error(e))
        .finally(() => { this.nameEditing = false })
    }
  }
}
</script>

<style lang="less">
body {
  div.list-item {
    overflow: hidden;
    padding-left: 5px;
    position: relative;
    height: 30px;
    border-left: 5px solid transparent;

    &.directory {
      color: var(--system-accent-color, --c-primary);
      border-left-color: var(--system-accent-color, --c-primary);
    }

    &.has-meta-info {
      height: 70px;
    }

    &.selected {
      border-left: 5px solid var(--c-primary);
    }

    // The meta information div in the extended file list
    div.meta-info {
      white-space: nowrap;
      height: 30px;
      line-height: inherit;

      // Small info blocks inside the file meta
      .badge {
        font-size: 11px;
        line-height: 11px;
        border-radius: 4px;
        padding: 2px 4px;
        margin: 2px;
        display: inline-block;
      }

      // Optional target progress meter, if a target has been set
      .target-progress-indicator {
        vertical-align: middle;
        transform: rotateZ(-90deg); // Beginning must be at the top
      }
    }

    div.filename {
      // Prevent line breaking in the titles and give a little spacing
      // before and after
      font-size: 13px;
      white-space: nowrap;
      display: block;
      width: 100%;
      overflow: hidden;
      position: relative;
      margin: 5px 0px 0px 0px;

      // These inputs should be more or less "invisible"
      input {
        border: none;
        width: 100%;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        background-color: transparent;
        padding: 0;
      }

      div.date {
        position: absolute;
        font-size: 11px;
        color: rgb(130, 130, 130);
        background-color: inherit;
        top: 0;
        right: 0;
        padding: 2px 5px;
      }
    }

    &.directory {
      white-space: nowrap;

      .sorter {
        display: block;
        position: absolute;
        top: 0;
        right: 0;
        text-align: right;
        margin: 0;

        .sortDirection, .sortType {
          display: inline-block;
          margin: 3px;
        }
      }
    }
  } // END list item
}

body.darwin {
  div.list-item {
    border-bottom: 1px solid rgb(213, 213, 213);
    background-color: rgb(235, 235, 235);

    &.active {
      background-color: rgb(200, 200, 200);
      div.filename div.date {
        background-color: rgb(200, 200, 200);
      }
    }

    div.filename div.date { background-color: rgb(235, 235, 235); }

    div.meta-info {
      .badge {
        background-color: rgb(220, 220, 220);
        color: rgb(80, 80, 80);

        &.code-indicator {
          background-color: var(--system-accent-color, --c-primary);
          color: white;
        }

        &.tag {
          background-color: rgba(90, 90, 90, 0.5); // Make those tags a little bit translucent
          color: rgb(240, 240, 240);

          .color-circle {
            // If there's a coloured tag in there, display that as well
            display: inline-block;
            width: 9px;
            height: 9px;
            border: 1px solid white;
            border-radius: 50%;
          }
        }

        svg {
          display: inline-block;
          width: 11px;
          height: 11px;
          margin: 0;

          circle { fill: rgb(200, 200, 200); }
          path { fill: rgb(90, 90, 90); }
        }
      }
    }
  }

  &.dark {
    div.list-item {
      border-bottom-color: #505050;
      background-color: rgb(40, 40, 50);

      &.active {
      background-color: rgb(80, 80, 80);
      div.filename div.date {
        background-color: rgb(80, 80, 80);
      }
    }

      div.filename div.date { background-color: rgb(40, 40, 50); }

      &.active {
        background-color: rgb(80, 80, 80);
      }

      div.meta-info .badge {
        background-color: rgb(80, 80, 80);
        color: rgb(220, 220, 220);
      }
    }
  }
}
</style>
