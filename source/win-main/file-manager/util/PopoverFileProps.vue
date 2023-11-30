<template>
  <div>
    <h4>{{ filename }}</h4>
    <div class="properties-info-container">
      <div><span>{{ createdLabel }}: {{ creationTime }}</span></div>
      <div v-if="type === 'file'">
        <span>{{ formattedWords }}</span>
      </div>
      <div v-else>
        <span>Type: <span class="badge primary">{{ ext.substring(1) }}</span></span>
      </div>
    </div>
    <div class="properties-info-container">
      <div><span>{{ modifiedLabel }}: {{ modificationTime }}</span></div>
      <div><span>{{ formattedSize }}</span></div>
    </div>
    <template v-if="type === 'file' && tags.length > 0">
      <hr>
      <div>
        <div v-for="(item, idx) in tags" v-bind:key="idx" class="badge">
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
    <template v-if="type === 'file'">
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
  </div>
</template>

<script lang="ts">
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

import NumberControl from '@common/vue/form/elements/Number.vue'
import SelectControl from '@common/vue/form/elements/Select.vue'
import { trans } from '@common/i18n-renderer'
import formatDate from '@common/util/format-date'
import formatSize from '@common/util/format-size'
import localiseNumber from '@common/util/localise-number'
import { ColoredTag } from '@providers/tags'
import { PropType } from 'vue'

const ipcRenderer = window.ipc

export default {
  name: 'PopoverFileProps',
  components: {
    NumberControl,
    SelectControl
  },
  props: {
    filepath: {
      type: String,
      default: ''
    },
    filename: {
      type: String,
      default: ''
    },
    creationtime: {
      type: Number,
      default: 0
    },
    modtime: {
      type: Number,
      default: 0
    },
    tags: {
      type: Object as PropType<Array<string>>,
      default: () => { return {} }
    },
    colouredTags: {
      type: Object as PropType<Array<ColoredTag>>,
      default: () => { return {} }
    },
    targetValue: {
      type: Number,
      default: 0
    },
    targetMode: {
      type: String,
      default: 'words'
    },
    words: {
      type: Number,
      default: 0
    },
    fileSize: {
      type: Number,
      default: 0
    },
    type: {
      type: String,
      default: 'file'
    },
    ext: {
      type: String,
      default: '.md'
    }
  },
  data: function () {
    return {
      internalTargetMode: this.targetMode,
      internalTargetValue: this.targetValue
    }
  },
  computed: {
    // This property needs to be exposed on every Popover. The popover needs to
    // return the data that will then be reported back to the caller.
    popoverData: function () {
      const data: any = {}
      if (this.type === 'file') {
        data.target = {
          value: this.targetValue,
          mode: this.targetMode
        }
      }
      return data
    },
    wordsLabel: function () {
      return trans('Words')
    },
    createdLabel: function () {
      return trans('Created')
    },
    modifiedLabel: function () {
      return trans('Modified')
    },
    resetLabel: function () {
      return trans('Reset')
    },
    writingTargetTitle: function () {
      return trans('Set writing target…')
    },
    charactersLabel: function () {
      return trans('Characters')
    },
    creationTime: function () {
      return formatDate(new Date(this.creationtime), window.config.get('appLang'), true)
    },
    modificationTime: function () {
      return formatDate(new Date(this.modtime), window.config.get('appLang'), true)
    },
    formattedSize: function () {
      return formatSize(this.fileSize)
    },
    formattedWords: function () {
      return trans('%s words', localiseNumber(this.words))
    }
  },
  watch: {
    internalTargetValue () {
      this.updateWritingTarget()
    },
    internalTargetMode () {
      this.updateWritingTarget()
    }
  },
  methods: {
    /**
     * Resets the data, a.k.a. removes the writing target
     */
    reset: function () {
      this.internalTargetValue = 0
      this.internalTargetMode = 'words'
    },
    updateWritingTarget () {
      ipcRenderer.invoke('targets-provider', {
        command: 'set-writing-target',
        payload: {
          mode: this.internalTargetMode,
          count: this.internalTargetValue,
          path: this.filepath
        }
      }).catch(e => console.error(e))
    },
    retrieveTagColour: function (tagName: string) {
      const foundTag = this.colouredTags.find(tag => tag.name === tagName)
      return foundTag !== undefined ? foundTag.color : ''
    }
  }
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
