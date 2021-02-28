<template>
  <div>
    <h4>Properties: {{ filename }}</h4>
    <div class="properties-info-container">
      <span>Created: {{ creationTime }}</span>
      <span>Modified: {{ modificationTime }}</span>
    </div>
    <template v-if="tags.length > 0">
      <hr>
      <div>
        <div v-for="(item, idx) in tags" v-bind:key="idx" class="badge">
          <span
            v-if="retrieveTagColour(item)"
            class="color-circle"
            v-bind:style="{
              'background-color': retrieveTagColour(item)
            }"
          ></span>
          <span>#{{ item }}</span>
        </div>
      </div>
    </template>
    <hr>
    <p>
      Writing Target
    </p>
    <NumberControl
      v-model="targetValue"
      v-bind:inline="true"
    ></NumberControl>
    <SelectControl
      v-model="targetMode"
      v-bind:inline="true"
      v-bind:options="{
        'words': wordsLabel,
        'chars': charactersLabel
      }"
    ></SelectControl>
    <button v-on:click="reset">
      Reset
    </button>
  </div>
</template>

<script>
import NumberControl from '../../common/vue/form/elements/Number'
import SelectControl from '../../common/vue/form/elements/Select'
import { trans } from '../../common/i18n'
import formatDate from '../../common/util/format-date'

export default {
  name: 'Popover',
  components: {
    NumberControl,
    SelectControl
  },
  data: function () {
    return {
      filename: '',
      creationtime: 0,
      modtime: 0,
      tags: [],
      colouredTags: [],
      targetValue: 0,
      targetMode: 'words'
    }
  },
  computed: {
    // This property needs to be exposed on every Popover. The popover needs to
    // return the data that will then be reported back to the caller.
    popoverData: function () {
      return {
        target: {
          value: this.targetValue,
          mode: this.targetMode
        }
      }
    },
    wordsLabel: function () {
      return trans('dialog.target.words')
    },
    charactersLabel: function () {
      return trans('dialog.target.chars')
    },
    creationTime: function () {
      return formatDate(new Date(this.creationtime), true)
    },
    modificationTime: function () {
      return formatDate(new Date(this.modtime), true)
    }
  },
  methods: {
    /**
     * Resets the data, a.k.a. removes the writing target
     */
    reset: function () {
      this.value = 0
      this.mode = 'words'
    },
    retrieveTagColour: function (tagName) {
      const foundTag = this.colouredTags.find(tag => tag.name === tagName)
      if (foundTag !== undefined) {
        return foundTag.color
      } else {
        return false
      }
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
  }
}

body.dark div.popover {
  .badge {
    background-color: rgb(60, 60, 60);
  }
}
</style>
