<template>
  <div>
    <p>{{ introLabel }}</p>
    <NumberControl v-model="value"></NumberControl>
    <SelectControl
      v-model="mode"
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

export default {
  name: 'Popover',
  components: {
    NumberControl,
    SelectControl
  },
  data: function () {
    return {
      value: 0,
      mode: 'words'
    }
  },
  computed: {
    // This property needs to be exposed on every Popover. The popover needs to
    // return the data that will then be reported back to the caller.
    popoverData: function () {
      return {
        value: this.value,
        mode: this.mode
      }
    },
    wordsLabel: function () {
      return trans('dialog.target.words')
    },
    charactersLabel: function () {
      return trans('dialog.target.chars')
    },
    introLabel: function () {
      return 'Writing Target' // TODO: Translate!
    }
  },
  methods: {
    /**
     * Resets the data, a.k.a. removes the writing target
     */
    reset: function () {
      this.value = 0
      this.mode = 'words'
    }
  }
}
</script>

<style lang="less">
//
</style>
