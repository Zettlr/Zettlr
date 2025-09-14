<template>
  <PopoverWrapper v-bind:target="props.target" v-on:close="emit('close')">
    <div class="tag-cloud">
      <h3>{{ tagCloudTitle }}</h3>
      <TabBar
        v-bind:tabs="tabs"
        v-bind:current-tab="sorting"
        v-on:tab="sorting = $event as 'count'|'name'|'idf'"
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
        v-on:click="searchAndClose(tag.name)"
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
  </PopoverWrapper>
</template>

<script setup lang="ts">
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

import PopoverWrapper from './PopoverWrapper.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import TabBar, { type TabbarControl } from '@common/vue/TabBar.vue'
import { trans } from '@common/i18n-renderer'
import { ref, computed, onMounted } from 'vue'
import { useConfigStore, useTagsStore } from 'source/pinia'

const props = defineProps<{
  target: HTMLElement
  // activeFile?: OpenDocument
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'search-tag', tagName: string): void
}>()

const tagStore = useTagsStore()
const configStore = useConfigStore()

const filter = ref<typeof TextControl|null>(null)

const tabs: TabbarControl[] = [
  { id: 'name', label: trans('Name'), target: 'name' },
  { id: 'count', label: trans('Count'), target: 'count' },
  { id: 'idf', label: 'IDF', target: 'idf' }
]

const query = ref('')
const sorting = ref<'name'|'count'|'idf'>('name')

const filterPlaceholder = trans('Filter tags…')
const tagCloudTitle = trans('Tag Cloud')
// const tagSuggestionsLabel = trans('Suggested tags for the current file')
// const addButtonLabel = trans('Add to file')

const sortedTags = computed(() => {
  // Sorts the tags based on either name or count
  const sorted = tagStore.tags.map(elem => elem)
  const languagePreferences = [ configStore.config.appLang, 'en' ]
  const coll = new Intl.Collator(languagePreferences, { numeric: true })
  sorted.sort((a, b) => {
    if (sorting.value === 'name') {
      return coll.compare(a.name, b.name)
    } else if (sorting.value === 'idf') {
      return b.idf - a.idf
    } else {
      return b.files.length - a.files.length
    }
  })
  return sorted
})

const filteredTags = computed(() => {
  return sortedTags.value.filter(tag => {
    return tag.name.toLowerCase().includes(query.value.toLowerCase())
  })
})

onMounted(() => {
  filter.value?.focus()
})

function searchAndClose (tagName: string): void {
  emit('search-tag', `#${tagName}`)
  emit('close')
}
</script>

<style lang="less">
body {
  .tag-cloud {
    padding: 5px;

    h3 {
      text-align: center;
      padding-bottom: 5px;
    }
    .system-tablist,
    .form-control {
      padding: 5px;
    }

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
