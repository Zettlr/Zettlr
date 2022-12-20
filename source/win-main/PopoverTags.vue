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
      v-on:click="handleClick(tag.text)"
    >
      <!-- Tags have a count, text, and a className -->
      {{ tag.text }} ({{ tag.count }}x)
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
import ButtonControl from '@common/vue/form/elements/Button.vue'
import TokenList from '@common/vue/form/elements/TokenList.vue'
import TabBar from '@common/vue/TabBar.vue'
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'
import { TagDatabase } from '@dts/common/tag-provider'
import { TabbarControl } from '@dts/renderer/window'
import { OpenDocument } from '@dts/common/documents'
import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'
import { MDFileDescriptor } from '@dts/common/fsal'

const ipcRenderer = window.ipc

async function regenerateTagSuggestions (activeFile: null|OpenDocument): Promise<string[]> {
  const suggestions: string[] = []
  if (activeFile === null || !hasMarkdownExt(activeFile.path)) {
    return suggestions // Nothing to do
  }

  const contents: string = await ipcRenderer.invoke('application', {
    command: 'get-file-contents',
    payload: activeFile.path
  })

  const descriptor: MDFileDescriptor = await ipcRenderer.invoke('application', {
    command: 'get-descriptor',
    payload: activeFile.path
  })

  if (contents == null || descriptor == null) {
    throw new Error('Could not generate tag suggestions: Main did not return the file contents!')
  }

  const tags = await ipcRenderer.invoke('tag-provider', { command: 'get-tags-database' })

  for (const tag of Object.keys(tags)) {
    if (String(contents).includes(tag) && !descriptor.tags.includes(tag)) {
      suggestions.push(tag)
    }
  }

  return suggestions
}

export default defineComponent({
  name: 'PopoverTags',
  components: {
    TextControl,
    TokenList,
    ButtonControl,
    TabBar
  },
  data: function () {
    return {
      tags: [] as Array<{ text: string, count: number, className: string }>,
      tabs: [
        // TODO: Translate
        { id: 'name', label: 'Name' },
        { id: 'count', label: 'Count' }
      ] as TabbarControl[],
      activeFile: null as OpenDocument|null,
      // Super hacky way to get some tag suggestions. (Reminder to myself:
      // Create a component for the popovers instead of having them float in the
      // void of the app document.)
      suggestionPromise: undefined as Promise<string[]>|undefined,
      suggestions: [] as string[], // Tag suggestions for the currently active file
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
        searchForTag: this.searchForTag,
        addSuggestionsToFile: this.shouldAddSuggestions,
        suggestions: this.suggestions
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
          return coll.compare(a.text, b.text)
        } else {
          return b.count - a.count
        }
      })
      return sorted
    },
    filteredTags: function () {
      return this.sortedTags.filter(tag => {
        return tag.text.toLowerCase().includes(this.query.toLowerCase())
      })
    },
    filterInput: function () {
      return this.$refs.filter as typeof TextControl
    }
  },
  watch: {
    activeFile () {
      regenerateTagSuggestions(this.activeFile)
        .then(tags => { this.suggestions = tags })
        .catch(err => console.error(err))
    }
  },
  mounted: function () {
    this.filterInput.focus()
    ipcRenderer.invoke('tag-provider', { command: 'get-tags-database' })
      .then((tags: TagDatabase) => {
        this.tags = Object.keys(tags).map(tag => {
          return { ...tags[tag] }
        })
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
    }
  }
}
</style>
