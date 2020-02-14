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
  <div class="container" v-on:mouseenter="hover=true" v-on:mouseleave="hover=false" v-bind:style="getStyle">
    <div
    v-bind:class="classList"
    v-bind:data-hash="getHash"
    v-bind:data-id="getId"
    v-bind:data-filename="getFilename"
    v-on:click="requestSelection"
    v-bind:draggable="isDraggable"
    v-on:dragstart.stop="beginDragging"
    v-on:dragend.stop="stopDragging"
    >
    <p class="filename">{{ basename }}</p>
    <Sorter v-if="isDirectory" v-show="hover" v-bind:sorting="sorting"></Sorter>
    <tag-list v-bind:tags="getTags" v-if="!isDirectory"></tag-list>
    <template v-if="fileMeta">
      <div class="meta">
        <template v-if="isDirectory">
          <span class="directories">{{ countDirs }}</span>
          <span class="files">{{ countFiles }}</span>
          <span class="virtual-directories">{{ countVirtualDirs }}</span>
        </template>
        <template v-else>
          <span class="tex-indicator" v-if="isTex">TeX</span>
          <span class="date">{{ getDate }}</span>
          <span class="id" v-if="getId">{{ getId }}</span>
          <span class="tags" v-if="hasTags" v-bind:data-tippy-content="getTagList">#{{ countTags }}</span>
          <svg v-if="hasWritingTarget" class="target-progress-indicator" width="16" height="16" viewBox="-1 -1 2 2" v-bind:data-tippy-content="writingTargetInfo">
            <circle class="indicator-meter" cx="0" cy="0" r="1" shape-rendering="geometricPrecision"></circle>
            <path v-bind:d="writingTargetPath" fill="" class="indicator-value" shape-rendering="geometricPrecision"></path>
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
  const formatDate = require('../../source/common/util/format-date.js')

  module.exports = {
    name: 'file-item',
    // Bind the actual object to the container
    data: () => {
      return {
        hover: false // True as long as the user hovers over the element
      }
    },
    props: [
      // Generic properties
      'isAlias',
      'creationTime',
      'modtime',
      'dir',
      'name',
      'parent',
      'path',
      'type',
      // File properties
      'charCount',
      'ext',
      'frontmatter',
      'hash',
      'id',
      'linefeed',
      'tags',
      'wordCount',
      // Directory properties
      'sorting',
      'project',
      'attachments',
      'children'
    ],
    components: {
      'tag-list': TagList,
      'Sorter': Sorter
      },
    computed: {
      // We have to explicitly transform ALL properties to computed ones for
      // the reactivity in conjunction with the recycle-scroller.
      basename: function () {
        if (this.frontmatter && this.frontmatter.hasOwnProperty('title')) {
          return this.frontmatter.title
        } else {
          return this.name.replace(this.ext, '')
        }
      },
      getHash: function () { return this.hash },
      getId: function () { return this.id },
      getFilename: function () { return this.name },
      getTags: function () { return this.tags },
      getTagList: function () { return this.tags.join(', ') },
      hasTags: function () { return this.tags && this.tags.length > 0 },
      isDirectory: function () { return this.type !== 'file' },
      isDraggable: function () { return !this.isDirectory && !this.results && !this.isAlias },
      fileMeta: function () { return this.$store.state.fileMeta },
      displayTime: function () { return this.$store.state.displayTime },
      hasChildren: function () {
        // Return true if it's a directory, with at least one directory as children
        if (!this.children) return false
        let dirChildren = this.children.filter(e => e.type === 'directory')
        return this.isDirectory && dirChildren.length > 0
      },
      classList: function () {
        let list = 'list-item ' + this.type
        if (this.hasOwnProperty('isAlias') && this.isAlias) list += ' alias'
        if (this.$store.state.selectedFile === this.hash) list += ' selected'
        return list
      },
      isTex: function () { return this.ext === '.tex' },
      getDate: function () {
        let time = (this.displayTime === 'modtime') ? this.modtime : this.creationtime
        if (!time) return 'Wrong Date provided!'
        return formatDate(new Date(time))
      },
      getStyle: function () {
        if (this.hasOwnProperty('results')) {
          let w = 0
          let hue = window.getComputedStyle(document.documentElement).getPropertyValue('--search-hue') || '159'
          for (let r of this.results) w += r.weight
          w = Math.round(w / this.$store.state.maxWeight * 100) // Percentage
          let bgcolor = `background-color:hsl(${hue}, ${w}%, 50%);`
          // TODO: let color = ` style="color: ${(w > 50) ? 'black' : 'white'};"`
          return bgcolor
        }
        return ''
      },
      countDirs: function () {
        if (!this.children) return 0
        return this.children.filter(e => e.type === 'directory').length + ' Directories' || 0
      },
      countFiles: function () {
        if (!this.children) return 0
        return this.children.filter(e => e.type === 'file').length + ' Files' || 0
      },
      countVirtualDirs: function () {
        if (!this.children) return 0
        return this.children.filter(e => e.type === 'virtual-directory').length + ' Virtual Directories' || 0
      },
      countTags: function () { return this.tags.length },
      hasWritingTarget: function () {
        if (!this.target) return false
        if (!this.target.mode ||
          !this.target.count ||
          ![ 'words', 'chars' ].includes(this.target.mode)) {
            return false
          }

          // We definitely have a target
          return true
        },
        writingTargetPath: function () {
          let current = this.charCount
          if (this.target.mode === 'words') current = this.wordCount
          let progress = current / this.target.count
          let large = (progress > 0.5) ? 1 : 0
          if (progress > 1) progress = 1 // Never exceed 100 %
          let x = Math.cos(2 * Math.PI * progress)
          let y = Math.sin(2 * Math.PI * progress)
          return `M 1 0 A 1 1 0 ${large} 1 ${x} ${y} L 0 0`
        },
        writingTargetInfo: function () {
          let current = this.charCount
          if (this.target.mode === 'words') current = this.wordCount

          let progress = Math.round(current / this.target.count * 100)
          if (progress > 100) progress = 100 // Never exceed 100 %

          return `${current} / ${this.target.count} (${progress} %)`
        }
      },
      methods: {
        requestSelection: function (event) {
          if (this.type === 'file' && event.altKey) {
            // QuickLook the file
            global.ipc.send('open-quicklook', this.hash)
          } else if (this.type === 'file') {
            // Request the clicked file
            global.ipc.send('file-get', this.hash)
          } else if (event.altKey && this.parent) {
            // Select the parent directory
            global.ipc.send('dir-select', this.parent.hash)
          } else {
            // Select this directory
            global.ipc.send('dir-select', this.hash)
          }
        },
        toggleSorting: function (type) {
          let newSorting = 'name-up'
          if (type === 'name') {
            if (this.sorting === 'name-up') newSorting = 'name-down'
          } else if (type === 'time') {
            if (this.sorting === 'time-up') {
              newSorting = 'time-down'
            } else {
              newSorting = 'time-up'
            }
          }

          // Request to re-sort this directory
          global.ipc.send('dir-sort', { 'hash': this.hash, 'type': newSorting })
        },
        beginDragging: function (event) {
          if (event.ctrlKey || event.altKey) {
            // If the alt key was pressed when the drag begins, initiate
            // an out-of-window drag
            global.ipc.send('file-drag-start', { 'hash': this.hash })
            event.preventDefault()
            return false
          }
          // Tell the sidebar component to lock the directory tree (only necessary for thin mode)
          this.$root.lockDirectoryTree()
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/x-zettlr-file', JSON.stringify({
            'hash': this.hash,
            'type': this.type // Can be file or directory
          }))
        },
        stopDragging: function (evt) {
          // Unlock the directory tree
          this.$root.unlockDirectoryTree()
        }
      }
    }
  </script>
