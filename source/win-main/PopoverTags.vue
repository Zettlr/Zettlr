<template>
  <div class="tag-cloud">
    <h3>{{ tagCloudTitle }}</h3>
    <TabBar
      v-bind:tabs="tabs"
      v-bind:current-tab="sorting"
      v-on:tab="sorting = $event"
    ></TabBar>

    <TextControl
      ref="filter"
      v-model="query"
      v-bind:placeholder="filterPlaceholder"
    ></TextControl>

    <div
      v-for="tag, idx in filteredTags"
      v-bind:key="idx"
      class="tag"
      v-bind:title="tag.desc"
      v-on:click="handleClick(tag.name)"
    >
      <!-- Tags have a name, a count, and optionally a color -->
      <span
        v-if="tag.color !== undefined"
        class="color-circle"
        v-bind:style="`background-color: ${tag.color};`"
      ></span>
      {{ tag.name }} ({{ tag.files.length }}x)
    </div>
  </div>
</template>

<script lang="ts">
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

import TextControl from '@common/vue/form/elements/Text.vue'
import TabBar from '@common/vue/TabBar.vue'
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'
import { TabbarControl } from '@dts/renderer/window'
import { OpenDocument } from '@dts/common/documents'
import { TagRecord } from '@providers/tags'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'PopoverTags',
  components: {
    TextControl,
    TabBar
  },
  data: function () {
    return {
      tags: [] as TagRecord[],
      tabs: [
        { id: 'name', label: trans('Name') },
        { id: 'count', label: trans('Count') },
        { id: 'idf', label: 'IDF' }
      ] as TabbarControl[],
      activeFile: null as OpenDocument|null,
      query: '',
      searchForTag: '',
      sorting: 'name', // Can be "name" or "count"
      shouldAddSuggestions: false
    }
  },
  computed: {
    popoverData: function () {
      return {
        // As soon as this is !== '', the app will begin a search for the tag
        searchForTag: this.searchForTag
      }
    },
    filterPlaceholder: function () {
      return trans('Filter tags…')
    },
    tagCloudTitle: function () {
      return trans('Tag Cloud')
    },
    tagSuggestionsLabel: function () {
      return trans('Suggested tags for the current file')
    },
    addButtonLabel: function () {
      return trans('Add to file')
    },
    sortedTags: function () {
      // Sorts the tags based on either name or count
      const sorted = this.tags.map(elem => elem)
      const languagePreferences = [ window.config.get('appLang'), 'en' ]
      const coll = new Intl.Collator(languagePreferences, { 'numeric': true })
      sorted.sort((a, b) => {
        if (this.sorting === 'name') {
          return coll.compare(a.name, b.name)
        } else if (this.sorting === 'idf') {
          return b.idf - a.idf
        } else {
          return b.files.length - a.files.length
        }
      })
      return sorted
    },
    filteredTags: function () {
      return this.sortedTags.filter(tag => {
        return tag.name.toLowerCase().includes(this.query.toLowerCase())
      })
    },
    filterInput: function () {
      return this.$refs.filter as typeof TextControl
    }
  },
  mounted: function () {
    this.filterInput.focus()
    ipcRenderer.invoke('tag-provider', { command: 'get-all-tags' })
      .then((tags: TagRecord[]) => {
        this.tags = tags
      })
      .catch(err => console.error(err))
  },
  methods: {
    handleClick: function (text: string) {
      this.searchForTag = text // Handle click here means: Start a search
    }
  }
})
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

      .color-circle {
        display: inline-block;
        width: 9px;
        height: 9px;
        border: 1px solid white;
        border-radius: 50%;
      }
    }
  }
}
</style>
