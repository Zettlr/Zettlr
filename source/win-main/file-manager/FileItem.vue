<template>
  <div
    v-bind:class="{
      'list-item-wrapper': true,
      'odd': index % 2 === 1,
      'even': index % 2 === 0
    }"
  >
    <div
      ref="displayText"
      v-bind:class="{
        'list-item': true,
        project: obj.type === 'directory' && obj.settings.project !== null,
        selected: selectedFile !== undefined && obj.path === selectedFile.path,
        active: activeFile !== undefined && obj.path === activeFile.path,
        'has-meta-info': fileMeta,
        directory: obj.type === 'directory'
      }"
      v-bind:data-id="obj.type === 'file' ? obj.id : ''"
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
        <div class="date">
          {{ getDate }}
        </div>
        <cds-icon
          v-if="isProject"
          aria-label="Project"
          shape="blocks-group"
          class="is-solid"
        ></cds-icon>
        <input
          v-if="nameEditing"
          ref="nameEditingInput"
          type="text"
          v-bind:value="obj.name"
          v-on:keyup.enter="finishNameEditing(($event.target as HTMLInputElement).value)"
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
          <span class="badge">{{ countWordsOrCharsOfDirectory }}</span>
        </div>
        <template v-else>
          <div v-if="obj.type === 'file' && obj.tags.length > 0">
            <!-- First line -->
            <div v-for="(tag, idx) in tagsWithColor" v-bind:key="idx" class="tag badge">
              <span
                v-if="tag.color !== undefined"
                class="color-circle"
                v-bind:style="{
                  backgroundColor: tag.color
                }"
              ></span>
              <span>#{{ tag.name }}</span>
            </div>
          </div>
          <div>
            <!-- Second line -->
            <!-- Is this a code file? -->
            <span
              v-if="obj.type === 'code'"
              aria-label="Code-file"
              class="code-indicator badge"
            >
              {{ obj.ext.substring(1) }}
            </span>
            <!-- Display the ID, if there is one -->
            <span v-if="obj.type === 'file' && obj.id !== ''" class="id badge">{{ obj.id }}</span>
            <!-- Display the file size if we have a code file -->
            <span v-if="obj.type === 'code'" class="badge">{{ formattedSize }}</span>
            <!--
              Next, the user will want to know how many words are in here. To save
              space, we will either display only the words, OR the word count in
              relation to a set writing target, if there is one.
            -->
            <span v-else-if="obj.type === 'file' && !hasWritingTarget" class="badge">
              {{ formattedWordCharCountOfFile }}
            </span>
            <span v-else-if="obj.type === 'file'" class="badge">
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

  <!-- Popovers -->
  <PopoverDirProps
    v-if="showPopover && displayText !== null && obj.type === 'directory'"
    v-bind:target="displayText"
    v-bind:directory="obj"
    v-on:close="showPopover = false"
  ></PopoverDirProps>
  <PopoverFileProps
    v-if="showPopover && displayText !== null && obj.type !== 'directory'"
    v-bind:target="displayText"
    v-bind:file="obj"
    v-on:close="showPopover = false"
  ></PopoverFileProps>
</template>

<script setup lang="ts">
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

import { trans } from '@common/i18n-renderer'
import formatDate from '@common/util/format-date'
import localiseNumber from '@common/util/localise-number'
import formatSize from '@common/util/format-size'
import PopoverDirProps from './util/PopoverDirProps.vue'
import PopoverFileProps from './util/PopoverFileProps.vue'

import { ref, computed, toRef, watch } from 'vue'
import { type AnyDescriptor, type MDFileDescriptor } from '@dts/common/fsal'
import { useConfigStore, useTagsStore, useWindowStateStore } from 'source/pinia'
import { useItemComposable } from './util/item-composable'

const props = defineProps<{
  activeFile: AnyDescriptor|undefined
  index: number
  obj: AnyDescriptor
  windowId: string
}>()

const emit = defineEmits<{
  (e: 'begin-dragging'): void
  (e: 'create-file'): void
  (e: 'create-dir'): void
}>()

const configStore = useConfigStore()
const tagStore = useTagsStore()
const windowStateStore = useWindowStateStore()

const shouldCountChars = computed(() => configStore.config.editor.countChars)
const useH1 = computed(() => configStore.config.fileNameDisplay.includes('heading'))
const useTitle = computed(() => configStore.config.fileNameDisplay.includes('title'))
const writingTargets = computed(() => windowStateStore.writingTargets)
const displayMdExtensions = computed(() => configStore.config.display.markdownFileExtensions)

const displayText = ref<HTMLDivElement|null>(null)
const nameEditingInput = ref<HTMLInputElement|null>(null)

const {
  nameEditing,
  showPopover,
  operationType,
  onDragHandler,
  handleContextMenu,
  requestSelection,
  finishNameEditing,
  isDirectory,
  selectedFile,
  updateObject
} = useItemComposable(props.obj, displayText, props.windowId, nameEditingInput)

// We have to explicitly transform ALL properties to computed ones for
// the reactivity in conjunction with the recycle-scroller.
const basename = computed(() => {
  if (props.obj.type !== 'file') {
    return props.obj.name
  }

  if (useTitle.value && props.obj.yamlTitle !== undefined) {
    return props.obj.yamlTitle
  } else if (useH1.value && props.obj.firstHeading !== null) {
    return props.obj.firstHeading
  } else if (displayMdExtensions.value) {
    return props.obj.name
  } else {
    return props.obj.name.replace(props.obj.ext, '')
  }
})

const getFilename = computed(() => props.obj.name)
const isProject = computed(() => props.obj.type === 'directory' && props.obj.settings.project !== null)
const isDraggable = computed(() => !isDirectory.value)
const fileMeta = computed(() => configStore.config.fileMeta)
const getDate = computed(() => {
  if (configStore.config.fileMetaTime === 'modtime') {
    return formatDate(props.obj.modtime, configStore.config.appLang, true)
  } else {
    return formatDate(props.obj.creationtime, configStore.config.appLang, true)
  }
})

const countDirs = computed(() => {
  if (props.obj.type !== 'directory') {
    return '0 ' + trans('Directories')
  }
  return props.obj.children.filter(e => e.type === 'directory').length + ' ' + trans('Directories')
})

const countFiles = computed(() => {
  if (props.obj.type !== 'directory') {
    return '0 ' + trans('Files')
  }
  return props.obj.children.filter(e => [ 'file', 'code' ].includes(e.type)).length + ' ' + trans('Files')
})

const countWordsOrCharsOfDirectory = computed(() => {
  if (props.obj.type !== 'directory') {
    return ''
  }

  const wordOrCharCount = props.obj.children
    .filter((file): file is MDFileDescriptor => file.type === 'file')
    .map(file => shouldCountChars.value ? file.charCount : file.wordCount)
    .reduce((prev: number, cur: number) => prev + cur, 0)

  if (shouldCountChars.value) {
    return trans('%s characters', localiseNumber(wordOrCharCount))
  } else {
    return trans('%s words', localiseNumber(wordOrCharCount))
  }
})

const hasWritingTarget = computed(() => props.obj.type === 'file' && writingTargets.value.map(x => x.path).includes(props.obj.path))

const writingTargetPath = computed(() => {
  if (props.obj.type !== 'file') {
    throw new Error('Could not compute writingTargetPath: Was called on non-file object')
  }

  const target = writingTargets.value.find(x => x.path === props.obj.path)

  if (target === undefined) {
    throw new Error('Could not compute writingTargetPath: No target found')
  }

  let current = props.obj.charCount
  if (target.mode === 'words') {
    current = props.obj.wordCount
  }

  let progress = current / target.count
  let large = (progress > 0.5) ? 1 : 0
  if (progress > 1) {
    progress = 1 // Never exceed 100 %
  }

  let x = Math.cos(2 * Math.PI * progress)
  let y = Math.sin(2 * Math.PI * progress)
  return `M 1 0 A 1 1 0 ${large} 1 ${x} ${y} L 0 0`
})

const writingTargetInfo = computed(() => {
  if (props.obj.type !== 'file') {
    throw new Error('Could not compute writingTargetInfo: Was called on non-file object')
  }

  const target = writingTargets.value.find(x => x.path === props.obj.path)

  if (target === undefined) {
    throw new Error('Could not compute writingTargetInfo: No target found')
  }

  let current = props.obj.charCount
  if (target.mode === 'words') {
    current = props.obj.wordCount
  }

  let progress = Math.round(current / target.count * 100)
  if (progress > 100) {
    progress = 100 // Never exceed 100 %
  }

  let label = trans('Characters')
  if (target.mode === 'words') {
    label = trans('Words')
  }

  return `${localiseNumber(current)} / ${localiseNumber(target.count)} ${label} (${progress} %)`
})

const formattedWordCharCountOfFile = computed(() => {
  if (props.obj.type !== 'file') {
    return '' // Failsafe because code files don't have a word count.
  }
  if (shouldCountChars.value) {
    return trans('%s characters', localiseNumber(props.obj.charCount))
  } else {
    return trans('%s words', localiseNumber(props.obj.wordCount))
  }
})

const formattedSize = computed(() => formatSize(props.obj.size))

const tagsWithColor = computed<Array<{ name: string, color: string|undefined }>>(() => {
  if (props.obj.type !== 'file') {
    return []
  }

  return props.obj.tags.map(tag => {
    return {
      name: tag,
      color: tagStore.coloredTags.find(t => t.name === tag)?.color
    }
  })
})

watch(operationType, () => {
  if (operationType.value === 'createFile') {
    emit('create-file')
    operationType.value = undefined
  } else if (operationType.value === 'createDir') {
    emit('create-dir')
    operationType.value = undefined
  }
})

// I have no idea why passing this as a Ref to the composable doesn't work, but
// this way it does.
watch(toRef(props, 'obj'), function (value) {
  updateObject(value)
})

function beginDragging (event: DragEvent): void {
  if (event.dataTransfer === null) {
    return
  }

  event.dataTransfer.dropEffect = 'move'
  // Tell the file manager component to lock the directory tree
  // (only necessary for thin mode)
  emit('begin-dragging')
  event.dataTransfer.setData('text/x-zettlr-file', JSON.stringify({
    type: props.obj.type, // Can be file, code, or directory
    path: props.obj.path,
    id: props.obj.type === 'file' ? props.obj.id : '' // Convenience
  }))
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

        &.selected {
          background-color: var(--system-accent-color, --c-primary);
          color: var(--system-accent-color-contrast, white);

          div.filename div.date {
            background-color: var(--system-accent-color, --c-primary);
            color: var(--system-accent-color-contrast, white);
          }
        }

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

      &.selected {
        background-color: var(--system-accent-color, --c-primary);
        color: var(--system-accent-color-contrast, white);

        div.filename div.date {
          background-color: var(--system-accent-color, --c-primary);
          color: var(--system-accent-color-contrast, white);
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
