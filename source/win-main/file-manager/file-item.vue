<template>
  <div
    v-bind:class="{
      'list-item-wrapper': true,
      'odd': index % 2 === 1,
      'even': index % 2 === 0
    }"
  >
    <div
      v-bind:class="{
        'list-item': true,
        project: obj.type === 'directory' && obj.project !== null,
        selected: selectedFile !== null && obj.path === selectedFile.path,
        active: activeFile !== null && obj.path === activeFile.path,
        'has-meta-info': fileMeta,
        directory: obj.type === 'directory'
      }"
      v-bind:data-id="obj.id"
      v-bind:data-filename="getFilename"
      v-bind:draggable="isDraggable"
      v-on:click.stop="requestSelection"
      v-on:auxclick.stop="requestSelection"
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
          <span class="badge">{{ countWords }}</span>
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
  </div>
</template>

<script>
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

import { trans } from '../../common/i18n-renderer'
import formatDate from '../../common/util/format-date'
import localiseNumber from '../../common/util/localise-number'
import formatSize from '../../common/util/format-size'
import itemMixin from './util/item-mixin'

export default {
  name: 'FileItem',
  mixins: [itemMixin],
  props: {
    activeFile: {
      type: Object,
      default: function () { return {} }
    },
    index: {
      type: Number,
      required: true
    }
  },
  computed: {
    // We have to explicitly transform ALL properties to computed ones for
    // the reactivity in conjunction with the recycle-scroller.
    basename: function () {
      if (this.obj.type === 'code') {
        return this.obj.name
      }

      if (this.obj.frontmatter != null && 'title' in this.obj.frontmatter) {
        return this.obj.frontmatter.title
      } else if (this.obj.firstHeading != null && this.$store.state.config['display.useFirstHeadings'] === true) {
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
          if (this.obj.tags.includes(colouredTag.name) === true) {
            ret.push(colouredTag)
          }
        }

        return ret
      }
    },
    hasTags: function () {
      return this.obj.tags !== undefined && this.obj.tags.length > 0
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
    countWords: function () {
      if (this.isDirectory === false) {
        return 0
      }

      const wordCount = this.obj.children
        .filter(file => file.type === 'file')
        .map(file => file.wordCount)
        .reduce((prev, cur) => prev + cur, 0)

      return trans('gui.words', localiseNumber(wordCount))
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
  methods: {
    retrieveTagColour: function (tagName) {
      const colouredTags = this.$store.state.colouredTags
      const foundTag = colouredTags.find(tag => tag.name === tagName)
      if (foundTag !== undefined) {
        return foundTag.color
      } else {
        return false
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
    }
  }
}
</script>

<style lang="less">
body {
  div.list-item-wrapper {
    div.list-item {
      overflow: hidden;
      padding-left: 5px;
      position: relative;
      height: 30px;

      &.directory {
        color: var(--system-accent-color, --c-primary);
        border-left-color: var(--system-accent-color, --c-primary);
      }

      &.has-meta-info { height: 70px; }

      // The meta information div in the extended file list
      div.meta-info {
        white-space: nowrap;
        height: 30px;
        line-height: inherit;

        // Small info blocks inside the file meta
        .badge {
          font-size: 11px;
          line-height: 11px;
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
}

body.darwin {
  div.list-item-wrapper {
    // On macOS, the lists have a small margin left and right
    padding: 0px 10px;
    background-color: white;

    div.list-item {
      // Make the borders to the side as thick as the border radius
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 1px solid rgb(213, 213, 213);
      background-color: white;
      border-radius: 6px;

      div.filename div.date {
        background-color: white;
        padding-right: 0px;
      }

      &.selected {
        border-left: 5px solid var(--system-accent-color, --c-primary);
        background-color: var(--system-accent-color, --c-primary);
        color: var(--system-accent-color-contrast, white);

        div.filename div.date {
          background-color: var(--system-accent-color, --c-primary);
          color: var(--system-accent-color-contrast, rgb(235, 235, 235));
        }
      }

      &.active {
        background-color: rgb(200, 200, 200);
        div.filename div.date {
          background-color: rgb(200, 200, 200);
        }
      }

      div.meta-info {
        .badge {
          background-color: rgb(220, 220, 220);
          color: rgb(80, 80, 80);
          border-radius: 4px;

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
  }

  &.dark {
    div.list-item-wrapper {
      background-color: rgb(40, 40, 50);

      div.list-item {
        border-bottom-color: #505050;
        background-color: rgb(40, 40, 50);

        div.filename div.date {
          background-color: rgb(40, 40, 50);
        }

        &.selected {
          background-color: var(--system-accent-color, --c-primary);

          div.filename div.date {
            background-color: var(--system-accent-color, --c-primary);
            color: var(--system-accent-color-contrast, rgb(40, 40, 50));
          }
        }

        &.active {
          background-color: rgb(80, 80, 80);

          div.filename div.date {
            background-color: rgb(80, 80, 80);
          }
        }

        div.meta-info .badge {
          background-color: rgb(80, 80, 80);
          color: rgb(220, 220, 220);
        }
      }
    }
  }
}

body.win32 {
  div.list-item-wrapper {
    div.list-item {
      border-bottom: 1px solid rgb(213, 213, 213);
      background-color: rgb(230, 230, 230);

      &.active {
        background-color: rgb(200, 200, 200);
        div.filename div.date { background-color: rgb(200, 200, 200); }
      }

      &.selected {
        background-color: var(--system-accent-color, --c-primary);
        color: var(--system-accent-color-contrast, white);

        div.filename div.date {
          background-color: var(--system-accent-color, --c-primary);
          color: var(--system-accent-color-contrast, white);
        }
      }

      div.filename div.date { background-color: rgb(230, 230, 230); }

      div.meta-info {
        .badge {
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
  }

  &.dark {
    div.list-item-wrapper {
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
        &.active { background-color: rgb(80, 80, 80); }

        div.meta-info .badge {
          background-color: rgb(80, 80, 80);
          color: rgb(220, 220, 220);
        }
      }
    }
  }
}

body.linux {
  div.list-item-wrapper {
    div.list-item {
      border-bottom: 1px solid rgb(213, 213, 213);
      background-color: rgb(230, 230, 230);

      &.active {
        background-color: rgb(200, 200, 200);
        div.filename div.date { background-color: rgb(200, 200, 200); }
      }

      &.selected {
        background-color: var(--system-accent-color, --c-primary);
        color: var(--system-accent-color-contrast, white);

        div.filename div.date {
          background-color: var(--system-accent-color, --c-primary);
          color: var(--system-accent-color-contrast, white);
        }
      }

      div.filename div.date { background-color: rgb(230, 230, 230); }

      div.meta-info {
        .badge {
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
  }

  &.dark {
    div.list-item-wrapper {
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
        &.active { background-color: rgb(80, 80, 80); }

        div.meta-info .badge {
          background-color: rgb(80, 80, 80);
          color: rgb(220, 220, 220);
        }
      }
    }
  }
}
</style>
