<template>
  <div class="tag-cloud">
    <h3>{{ tagCloudTitle }}</h3>

    <p v-if="suggestions.length > 0">
      <TokenList
        v-model="suggestions"
        v-bind:label="tagSuggestionsLabel"
      ></TokenList>

      <ButtonControl
        v-bind:label="addButtonLabel"
        v-on:click="shouldAddSuggestions = true"
      ></ButtonControl>
    </p>

    <hr v-if="suggestions.length > 0">

    <TextControl
      ref="filter"
      v-model="query"
      v-bind:placeholder="filterPlaceholder"
    ></TextControl>

    <div
      v-for="tag, idx in filteredTags"
      v-bind:key="idx"
      class="tag"
      v-on:click="handleClick(tag.text)"
    >
      <!-- Tags have a count, text, and a className -->
      {{ tag.text }} ({{ tag.count }}x)
    </div>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tag Cloud Popover
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A popover which displays a tag cloud
 *
 * END HEADER
 */

import TextControl from '../common/vue/form/elements/Text.vue'
import ButtonControl from '../common/vue/form/elements/Button.vue'
import TokenList from '../common/vue/form/elements/TokenList.vue'
import { trans } from '../common/i18n-renderer'

export default {
  name: 'PopoverTags',
  components: {
    TextControl,
    TokenList,
    ButtonControl
  },
  data: function () {
    return {
      tags: [],
      suggestions: [], // Tag suggestions for the currently active file
      query: '',
      searchForTag: '',
      shouldAddSuggestions: false
    }
  },
  computed: {
    popoverData: function () {
      return {
        // As soon as this is !== '', the app will begin a search for the tag
        searchForTag: this.searchForTag,
        addSuggestionsToFile: this.shouldAddSuggestions,
        suggestions: this.suggestions
      }
    },
    filterPlaceholder: function () {
      return trans('dialog.filter_tags')
    },
    tagCloudTitle: function () {
      return trans('dialog.tag_cloud.title')
    },
    tagSuggestionsLabel: function () {
      return trans('dialog.tag_cloud.suggestions_label')
    },
    addButtonLabel: function () {
      return trans('dialog.tag_cloud.add_to_file')
    },
    filteredTags: function () {
      return this.tags.filter(tag => {
        return tag.text.toLowerCase().includes(this.query.toLowerCase())
      })
    }
  },
  mounted: function () {
    this.$refs.filter.focus()
  },
  methods: {
    handleClick: function (text) {
      this.searchForTag = text // Handle click here means: Start a search
    }
  }
}
</script>

<style lang="less">
body {
  .tag-cloud {
    padding: 5px;

    .tag {
      display: inline-block;
      background-color: rgba(0, 0, 0, .3);
      color: white;
      padding: 3px;
      margin: 3px;
      border-radius: 3px;

      &:hover {
        background-color: rgba(70, 70, 70, .3);
      }
    }
  }
}
</style>
