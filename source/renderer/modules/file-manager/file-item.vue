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
    class="container"
    v-bind:style="getStyle"
    v-on:mouseenter="hover=true"
    v-on:mouseleave="hover=false"
    v-on:contextmenu="handleContextMenu"
  >
    <div
      v-bind:class="classList"
      v-bind:data-hash="getHash"
      v-bind:data-id="getId"
      v-bind:data-filename="getFilename"
      v-bind:draggable="isDraggable"
      v-on:click="requestSelection"
      v-on:dragstart.stop="beginDragging"
      v-on:dragend.stop="stopDragging"
    >
      <p class="filename">
        <clr-icon shape="blocks-group" class="is-solid" v-if="isProject"></clr-icon>
        {{ basename }}
      </p>
      <Sorter
        v-if="isDirectory"
        v-show="hover"
        v-bind:sorting="obj.sorting"
        v-on:sort-change="sort"
      ></Sorter>
      <tag-list
        v-if="!isDirectory"
        v-bind:tags="getTags"
      ></tag-list>
      <template v-if="fileMeta">
        <div class="meta">
          <template v-if="isDirectory">
            <span class="directories">{{ countDirs }}</span>
            <span class="files">{{ countFiles }}</span>
          </template>
          <template v-else>
            <span
              v-if="isTex"
              class="tex-indicator"
            >
              TeX
            </span>
            <span class="date">{{ getDate }}</span>
            <span
              v-if="getId"
              class="id"
            >
              {{ getId }}
            </span>
            <span
              v-if="hasTags"
              class="tags"
              v-bind:data-tippy-content="getTagList"
            >
              #{{ countTags }}
            </span>
            <svg
              v-if="hasWritingTarget"
              class="target-progress-indicator"
              width="16"
              height="16"
              viewBox="-1 -1 2 2"
              v-bind:data-tippy-content="writingTargetInfo"
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
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
  /* eslint indent: 0 */
  const TagList = require('./tag-list.vue').default
  const Sorter = require('./sorter.vue').default
  const formatDate = require('../../../common/util/format-date.js')
  const { trans } = require('../../../common/lang/i18n.js')
  const fileContextMenu = require('./file-item-context.js')
  const dirContextMenu = require('./dir-item-context.js')

  module.exports = {
    name: 'file-item',
    // Bind the actual object to the container
    props: ['obj'],
    data: () => {
      return {
        hover: false // True as long as the user hovers over the element
      }
    },
    components: {
      'tag-list': TagList,
      'Sorter': Sorter
      },
    computed: {
      // We have to explicitly transform ALL properties to computed ones for
      // the reactivity in conjunction with the recycle-scroller.
      basename: function () {
        if (this.obj.frontmatter && this.obj.frontmatter.hasOwnProperty('title')) {
          return this.obj.frontmatter.title
        } else if (this.obj.firstHeading && this.$store.state.useFirstHeadings) {
          return this.obj.firstHeading
        } else {
          return this.obj.name.replace(this.obj.ext, '')
        }
      },
      getHash: function () { return this.obj.hash },
      getId: function () { return this.obj.id },
      getFilename: function () { return this.obj.name },
      getTags: function () { return this.obj.tags },
      getTagList: function () { return this.obj.tags.join(', ') },
      hasTags: function () { return this.obj.tags && this.obj.tags.length > 0 },
      isDirectory: function () { return this.obj.type !== 'file' },
      isProject: function () { return this.isDirectory && this.obj.project !== null },
      isDraggable: function () { return !this.isDirectory },
      fileMeta: function () { return this.$store.state.fileMeta },
      displayTime: function () { return this.$store.state.displayTime },
      hasChildren: function () {
        // Return true if it's a directory, with at least one directory as children
        if (!this.obj.hasOwnProperty('children')) return false
        let dirChildren = this.obj.children.filter(e => e.type === 'directory')
        return this.isDirectory && dirChildren.length > 0
      },
      classList: function () {
        let list = 'list-item ' + this.obj.type
        if (this.$store.state.selectedFile === this.obj.hash) list += ' selected'
        if (this.obj.type === 'directory' && this.obj.project !== null) list += ' project'
        return list
      },
      isTex: function () { return this.obj.ext === '.tex' },
      getDate: function () {
        let time = (this.displayTime === 'modtime') ? this.obj.modtime : this.obj.creationtime
        if (!time) return 'Wrong Date provided!'
        return formatDate(new Date(time))
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
        if (!this.obj.hasOwnProperty('children')) return 0
        return this.obj.children.filter(e => e.type === 'directory').length + ' ' + trans('system.directories') || 0
      },
      countFiles: function () {
        if (!this.obj.hasOwnProperty('children')) return 0
        return this.obj.children.filter(e => e.type === 'file').length + ' ' + trans('system.files') || 0
      },
      countTags: function () { return this.obj.tags.length },
      hasWritingTarget: function () {
        if (!this.obj.hasOwnProperty('target') || !this.obj.target) return false
        if (!this.obj.target.mode ||
          !this.obj.target.count ||
          ![ 'words', 'chars' ].includes(this.obj.target.mode)) {
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
          if (this.obj.target.mode === 'words') current = this.obj.wordCount

          let progress = Math.round(current / this.obj.target.count * 100)
          if (progress > 100) progress = 100 // Never exceed 100 %

          return `${current} / ${this.obj.target.count} (${progress} %)`
        }
      },
      methods: {
        handleContextMenu: function (event) {
          if (this.isDirectory) {
            dirContextMenu(event, this.obj, this.$el)
          } else {
            fileContextMenu(event, this.obj, this.$el)
          }
        },
        requestSelection: function (event) {
          // Determine if we have a middle (wheel) click
          const middleClick = (event.type === 'auxclick' && event.button === 1)
          const ctrl = event.ctrlKey && process.platform !== 'darwin'
          const cmd = event.metaKey && process.platform === 'darwin'

          if (this.obj.type === 'file' && event.altKey) {
            // QuickLook the file
            global.ipc.send('open-quicklook', this.obj.hash)
          } else if (this.obj.type === 'file') {
            // Request the clicked file
            if (!middleClick && !ctrl && !cmd) {
              global.editor.announceTransientFile(this.obj.hash)
            }
            global.ipc.send('file-get', this.obj.hash)
          } else if (event.altKey && this.obj.parent) {
            // Select the parent directory
            global.ipc.send('dir-select', this.obj.parent.hash)
          } else {
            // Select this directory
            global.ipc.send('dir-select', this.obj.hash)
          }
        },
        /**
         * Request to re-sort this directory
         */
        sort: function (sorting) {
          global.ipc.send('dir-sort', { 'hash': this.obj.hash, 'type': sorting })
        },
        beginDragging: function (event) {
          if (event.ctrlKey || event.altKey) {
            // If the alt key was pressed when the drag begins, initiate
            // an out-of-window drag
            global.ipc.send('file-drag-start', { 'hash': this.obj.hash })
            event.preventDefault()
            return false
          }
          // Tell the file manager component to lock the directory tree (only necessary for thin mode)
          this.$root.lockDirectoryTree()
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/x-zettlr-file', JSON.stringify({
            'hash': this.obj.hash,
            'type': this.obj.type, // Can be file or directory
            'path': this.obj.path,
            'id': this.obj.id // Convenience
          }))
        },
        stopDragging: function (evt) {
          // Unlock the directory tree
          this.$root.unlockDirectoryTree()
        }
      }
    }
  </script>
