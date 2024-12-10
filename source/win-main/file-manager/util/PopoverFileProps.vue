<template>
  <PopoverWrapper v-bind:target="target" v-on:close="emit('close')">
    <h4>{{ props.file.name }}</h4>
    <div class="properties-info-container">
      <div><span>{{ createdLabel }}: {{ creationTime }}</span></div>
      <div v-if="props.file.type === 'file'">
        <span>{{ formattedWords }}</span>
      </div>
      <div v-else>
        <span>Type: <span class="badge primary">{{ props.file.ext.substring(1) }}</span></span>
      </div>
    </div>
    <div class="properties-info-container">
      <div><span>{{ modifiedLabel }}: {{ modificationTime }}</span></div>
      <div><span>{{ formattedSize }}</span></div>
    </div>
    <template v-if="props.file.type === 'file' && props.file.tags.length > 0">
      <hr>
      <div>
        <div v-for="(item, idx) in props.file.tags" v-bind:key="idx" class="badge">
          <span
            v-if="retrieveTagColour(item) !== ''"
            class="color-circle"
            v-bind:style="{
              'background-color': retrieveTagColour(item)
            }"
          ></span>
          <span>{{ item }}</span>
        </div>
      </div>
    </template>
    <template v-if="props.file.type === 'file'">
      <hr>
      <p>
        {{ writingTargetTitle }}
      </p>
      <NumberControl
        v-model="internalTargetValue"
        v-bind:inline="true"
      ></NumberControl>
      <SelectControl
        v-model="internalTargetMode"
        v-bind:inline="true"
        v-bind:options="{
          words: wordsLabel,
          chars: charactersLabel
        }"
      ></SelectControl>
      <button v-on:click="reset">
        {{ resetLabel }}
      </button>
    </template>
  </PopoverWrapper>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileProps Popover
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a component for displaying and managing file props.
 *
 * END HEADER
 */

import PopoverWrapper from 'source/win-main/PopoverWrapper.vue'
import NumberControl from '@common/vue/form/elements/NumberControl.vue'
import SelectControl from '@common/vue/form/elements/SelectControl.vue'
import { trans } from '@common/i18n-renderer'
import formatDate from '@common/util/format-date'
import formatSize from '@common/util/format-size'
import localiseNumber from '@common/util/localise-number'
import { ref, computed, watch } from 'vue'
import type { CodeFileDescriptor, MDFileDescriptor, OtherFileDescriptor } from 'source/types/common/fsal'
import { useConfigStore, useWritingTargetsStore, useTagsStore } from 'source/pinia'

const ipcRenderer = window.ipc

const props = defineProps<{
  target: HTMLElement
  file: MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor
}>()

const wordsLabel = trans('Words')
const createdLabel = trans('Created')
const modifiedLabel = trans('Modified')
const resetLabel = trans('Reset')
const writingTargetTitle = trans('Set writing target…')
const charactersLabel = trans('Characters')

const emit = defineEmits<(e: 'close') => void>()

const configStore = useConfigStore()
const writingTargetsStore = useWritingTargetsStore()
const tagStore = useTagsStore()

const creationTime = computed(() => {
  return formatDate(new Date(props.file.creationtime), configStore.config.appLang, true)
})
const modificationTime = computed(() => {
  return formatDate(new Date(props.file.modtime), configStore.config.appLang, true)
})
const formattedSize = computed(() => formatSize(props.file.size))
const formattedWords = computed(() => {
  if (props.file.type === 'file') {
    return trans('%s words', localiseNumber(props.file.wordCount))
  } else {
    return ''
  }
})

const fileTarget = computed(() => writingTargetsStore.targets.find(t => t.path === props.file.path))

const internalTargetValue = ref(fileTarget.value?.count ?? 0)
const internalTargetMode = ref(fileTarget.value?.mode ?? 'words')

watch(internalTargetValue, updateWritingTarget)
watch(internalTargetMode, updateWritingTarget)

watch(fileTarget, () => {
  internalTargetValue.value = fileTarget.value?.count ?? 0
  internalTargetMode.value = fileTarget.value?.mode ?? 'words'
})

function reset (): void {
  internalTargetValue.value = 0
  internalTargetMode.value = 'words'
}

function updateWritingTarget (): void {
  ipcRenderer.invoke('targets-provider', {
    command: 'set-writing-target',
    payload: {
      mode: internalTargetMode.value,
      count: internalTargetValue.value,
      path: props.file.path
    }
  }).catch(e => console.error(e))
}

function retrieveTagColour (tagName: string): string {
  const foundTag = tagStore.coloredTags.find(tag => tag.name === tagName)
  return foundTag !== undefined ? foundTag.color : ''
}
</script>

<style lang="less">
body div.popover {

  div.properties-info-container {
    color: rgb(90, 90, 90);
    font-size: 11px;
    display: flex;
    justify-content: space-evenly;

    // Enable a table-like visual experience
    & > div {
      width: 100%;
      padding: 0 10px;
      overflow: hidden;

      & > span {
        white-space: nowrap;
      }
    }
  }

  .badge {
    display: inline-block;
    border-radius: 4px;
    padding: 2px;
    margin: 2px;
    font-size: 11px;
    background-color: rgb(180, 180, 180);
    color: rgb(230, 230, 230);

    .color-circle {
      // If there's a coloured tag in there, display that as well
      display: inline-block;
      width: 9px;
      height: 9px;
      border: 1px solid white;
      border-radius: 50%;
    }

    &.primary {
      background-color: var(--system-accent-color, --c-primary);
      color: rgb(230, 230, 230);
    }
  }
}

body.dark div.popover {
  .badge {
    background-color: rgb(60, 60, 60);
  }
}
</style>
