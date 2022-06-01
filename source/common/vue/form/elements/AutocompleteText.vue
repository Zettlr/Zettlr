<template>
  <div v-bind:class="{ 'inline': inline, 'form-control': true }">
    <label v-if="label" v-bind:for="fieldID" v-html="label"></label>
    <!-- AutocompleteText is being implemented as a search for easy emptying of the field -->
    <input
      v-bind:id="fieldID"
      ref="input"
      type="search"
      v-bind:value="modelValue"
      v-bind:class="{ 'inline': inline }"
      v-bind:placeholder="placeholder"
      v-on:input="$emit('update:modelValue', $event.target.value)"
      v-on:keydown.enter="confirmSelection()"
      v-on:keydown.tab.prevent="confirmSelection()"
      v-on:keydown.esc="$emit('escape', $event.target.value)"
      v-on:keydown.down="selectNextMatch()"
      v-on:keydown.up="selectPrevMatch()"
      v-on:focus="onFocusHandler"
      v-on:blur="onBlurHandler"
    >
    <!-- Display the completion list -->
    <div
      v-if="inputHasFocus && modelValue !== '' && matches.length > 0"
      ref="autocomplete-dropdown"
      class="autocomplete-list"
      v-bind:style="{
        'left': $refs.input.getBoundingClientRect().left + 'px',
        'width': $refs.input.getBoundingClientRect().width + 'px',
        'max-height': '150px'
      }"
    >
      <div
        v-for="match, idx in matches"
        v-bind:key="idx"
        v-bind:class="{
          'autocomplete-list-item': true,
          'active': selectedMatch === idx
        }"
        v-on:mouseover="selectedMatch = idx"
        v-on:mousedown.prevent.stop="confirmSelection()"
        v-on:keyup.tab="confirmSelection()"
      >
        {{ match }}
      </div>
    </div>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AutocompleteText
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a text input with autocomplete functionality. NOTE:
 *                  This file is likely going to be relocated to common/vue/form
 *
 * END HEADER
 */

import { nextTick } from 'vue'

export default {
  name: 'AutocompleteText',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    inline: {
      type: Boolean,
      default: false
    },
    autocompleteValues: {
      type: Array,
      default: function () { return [] }
    }
  },
  emits: [ 'update:modelValue', 'blur', 'escape', 'confirm' ],
  data: function () {
    return {
      inputHasFocus: false,
      selectedMatch: -1,
      matches: []
    }
  },
  computed: {
    fieldID: function () {
      return 'field-input-' + this.name
    }
  },
  watch: {
    modelValue: function (newVal, oldVal) {
      // Whenever the value changes, update the list of matches
      this.updateMatches()
    }
  },
  methods: {
    confirmSelection: function () {
      // This method emits a confirm event, either with the text value or, if
      // one is highlighted, an autocomplete result.
      if (this.selectedMatch > -1) {
        this.$emit('confirm', this.matches[this.selectedMatch])
      } else {
        this.$emit('confirm', this.modelValue)
      }
      this.$refs.input.blur() // We are done here and can blur the list
    },
    selectNextMatch: function () {
      if (this.selectedMatch + 1 < this.matches.length) {
        this.selectedMatch += 1
      } else {
        this.selectedMatch = 0
      }

      this.$emit('update:modelValue', this.matches[this.selectedMatch])

      // After the changes have been applied to the DOM,
      // scroll the new match into view
      nextTick().then(() => { this.scrollMatchIntoView() })
        .catch(err => console.error(err))
    },
    selectPrevMatch: function () {
      if (this.selectedMatch - 1 >= 0) {
        this.selectedMatch -= 1
      } else {
        this.selectedMatch = this.matches.length - 1
      }

      this.$emit('update:modelValue', this.matches[this.selectedMatch])

      // After the changes have been applied to the DOM,
      // scroll the new match into view
      nextTick().then(() => { this.scrollMatchIntoView() })
        .catch(err => console.error(err))
    },
    scrollMatchIntoView: function () {
      // Called whenever the match changes to scroll it into view.
      const dropdown = this.$refs['autocomplete-dropdown']

      if (dropdown == null) {
        return // The dropdown was not shown
      }

      const activeElem = dropdown.querySelector('.active')

      if (activeElem === null) {
        return // No active element in the list
      }

      // You have no idea how much code I wrote before I found that function lol
      activeElem.scrollIntoView({ block: 'nearest' })
    },
    updateMatches: function () {
      // This function updates the matches with a list of strings that match
      this.matches = []
      const lowerVal = this.modelValue.toLocaleLowerCase()
      for (const suggestion of this.autocompleteValues) {
        if (suggestion.toLocaleLowerCase().indexOf(lowerVal) > -1) {
          this.matches.push(suggestion)
        }
      }

      // Make sure to check for out of bounds
      if (this.matches.length === 0) {
        this.selectedMatch = -1
      } else if (this.selectedMatch >= this.matches.length) {
        this.selectedMatch = this.matches.length - 1
      }
    },
    onFocusHandler: function (event) {
      this.inputHasFocus = true
    },
    onBlurHandler: function (event) {
      this.inputHasFocus = false
      this.$emit('blur', event.target.modelValue)
    },
    focus: function () {
      this.$refs.input.focus()
    },
    blur: function () {
      this.$refs.input.blur()
    },
    select: function () {
      this.$refs.input.select()
    }
  }
}
</script>

<style lang="less">
body div.form-control label {
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

body {
  div.autocomplete-list {
    position: absolute;
    max-height: 250px;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: rgb(250, 250, 250);
    border: 1px solid rgb(180, 180, 180);
    box-shadow: 0px 0px 10px 2px rgba(0, 0, 0, .2);
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

    div.autocomplete-list-item {
      white-space: nowrap;
      overflow-x: hidden;
      border-radius: 4px;
      padding: 4px;
      font-size: 11px;
      margin: 5px;

      &:hover, &.active {
        background-color: rgb(235, 235, 235);
      }
    }
  }

  &.dark {
    div.autocomplete-list {
      background-color: rgb(50, 50, 50);

      div.autocomplete-list-item.hover, div.autocomplete-list-item.active {
        background-color: rgb(120, 120, 120);
      }
    }
  }
}

body.darwin {
  &.dark div.autocomplete-list {
    background-color: rgb(80, 80, 80);
    border-color: rgb(120, 120, 120);

    div.autocomplete-list-item {
      &:hover, &.active {
        background-color: rgb(120, 120, 120);
      }
    }
  }
}
</style>
