<template>
  <div class="main-editor-search">
    <div class="row">
      <input
        ref="searchinput"
        v-model="query"
        type="text"
        v-bind:placeholder="findPlaceholder"
        v-bind:class="{'has-regex': regexpSearch }"
        v-on:keypress.enter.exact="searchNext()"
        v-on:keypress.shift.enter.exact="searchPrevious()"
        v-on:keydown.esc.exact="endSearch()"
      >
      <!-- RegExp Search Button -->
      <button
        v-bind:title="regexLabel"
        v-bind:class="{ 'active': regexpSearch }"
        v-on:click="regexpSearch = !regexpSearch; toggleQueryRegexp()"
      >
        <clr-icon shape="regexp"></clr-icon>
      </button>

      <!-- Case Sensitive Search Button -->
      <button
        v-bind:title="'Case sensitive search'"
        v-bind:class="{ 'active': caseSensitive }"
        v-on:click="caseSensitive = !caseSensitive"
      >
        <clr-icon shape="text"></clr-icon>
      </button>

      <!-- Whole Word Search Button -->
      <button
        v-bind:title="'Whole Word Search'"
        v-bind:class="{ 'active': wholeWord }"
        v-on:click="wholeWord = !wholeWord"
      >
        <clr-icon shape="text" style="border-bottom: 1px solid black"></clr-icon>
      </button>
    </div>
    <div class="row">
      <input
        v-model="replaceString"
        type="text"
        v-bind:placeholder="replacePlaceholder"
        v-bind:class="{'monospace': regexpSearch }"
        v-on:keypress.enter.exact="replaceNext()"
        v-on:keypress.alt.enter.exact="replaceAll()"
        v-on:keydown.esc.exact="endSearch()"
      >

      <!-- Replace Next Button -->
      <button
        v-bind:title="replaceNextLabel"
        v-on:click="replaceNext()"
      >
        <clr-icon shape="two-way-arrows"></clr-icon>
      </button>

      <!-- Replace All Button -->
      <button
        v-bind:title="replaceAllLabel"
        v-on:click="replaceAll()"
      >
        <clr-icon shape="step-forward-2"></clr-icon>
      </button>

      <!-- Close Button -->
      <button
        v-bind:title="closeLabel"
        v-on:click="endSearch()"
      >
        <clr-icon shape="times"></clr-icon>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, toRef, nextTick } from 'vue'
import { trans } from '@common/i18n-renderer'
import { SearchQuery } from '@codemirror/search'

const props = defineProps({
  showSearch: {
    type: Boolean,
    required: true
  }
})

const findPlaceholder = trans('Find…')
const replacePlaceholder = trans('Replace with')
const replaceNextLabel = trans('Replace next occurrence')
const replaceAllLabel = trans('Replace all occurrences')
const closeLabel = trans('Close search')
const regexLabel = trans('Toggle regular expression search')

const regexpSearch = ref(false)
const caseSensitive = ref(false)
const wholeWord = ref(false)
const query = ref('')
const replaceString = ref('')

const searchinput = ref<HTMLInputElement|null>(null)

let currentSearchQuery = new SearchQuery({
  search: query.value,
  caseSensitive: caseSensitive.value,
  regexp: regexpSearch.value,
  wholeWord: wholeWord.value,
  replace: replaceString.value
})

function recomputeSearchQuery () {
  currentSearchQuery = new SearchQuery({
    search: query.value,
    caseSensitive: caseSensitive.value,
    regexp: regexpSearch.value,
    wholeWord: wholeWord.value,
    replace: replaceString.value
  })
}

watch([ regexpSearch, query, replaceString ], () => {
  recomputeSearchQuery()
})

watch(toRef(props, 'showSearch'), () => {
  if (props.showSearch) {
    nextTick()
      .then(() => {
        searchinput.value?.focus()
        searchinput.value?.select()
      })
      .catch(e => {})
  }
})

watch(query, (newValue) => {
  // Make sure to switch the regexp search depending on the search input
  const isRegexp = /^\/.+\/[gimy]{0,4}$/.test(newValue)
  if (isRegexp && regexpSearch.value === false) {
    regexpSearch.value = true
  } else if (!isRegexp && regexpSearch.value === true) {
    regexpSearch.value = false
  }
})

function toggleQueryRegexp () {
  const isRegexp = /^\/.+\/[gimy]{0,4}$/.test(query.value.trim())

  if (isRegexp) {
    const match = /^\/(.+)\/[gimy]{0,4}$/.exec(query.value.trim())
    if (match !== null) {
      query.value = match[1]
    }
  } else {
    query.value = `/${query.value}/`
  }
}

const emit = defineEmits<{(e: 'searchNext', query: any): void
  (e: 'searchPrevious', query: any): void
  (e: 'replaceNext', query: any): void
  (e: 'replaceAll', query: any): void
  (e: 'endSearch'): void
}>()

function searchNext () { emit('searchNext', currentSearchQuery) }
function searchPrevious () { emit('searchPrevious', currentSearchQuery) }
function replaceNext () { emit('replaceNext', currentSearchQuery) }
function replaceAll () { emit('replaceAll', currentSearchQuery) }
function endSearch () { emit('endSearch') }

</script>

<style lang="less">
  body div.main-editor-wrapper div.main-editor-search {
    position: absolute;
    width: 300px;
    top: 0;
    right: 0;
    z-index: 7; // One less and the scrollbar will on top of the input field
    padding: 5px 10px;

    div.row { display: flex; }

    input {
      flex: 3;
      &.has-regex { font-family: monospace; }
    }

    button {
      width: 24px;
      min-width: 20px;
    }
  }

  body.darwin .main-editor-wrapper div.main-editor-search {
    background-color: rgba(230, 230, 230, 1);
    border-bottom-left-radius: 6px;
    padding: 6px;
    box-shadow: -2px 2px 4px 1px rgba(0, 0, 0, .3);

    input[type="text"], button {
      border-radius: 0;
      margin: 0;
    }

    button:hover { background-color: rgb(240, 240, 240); }
    button.active { background-color: rgb(200, 200, 200) }
  }

body.darwin.dark .main-editor-wrapper div.main-editor-search {
  background-color: rgba(60, 60, 60, 1);
}

body.win32 .main-editor-wrapper div.main-editor-search,
body.linux .main-editor-wrapper div.main-editor-search {
    background-color: rgba(230, 230, 230, 1);
    box-shadow: -2px 2px 4px 1px rgba(0, 0, 0, .3);

    button { max-width: fit-content; }
    button, input { border-width: 1px; }

    button:hover { background-color: rgb(240, 240, 240); }
    button.active { background-color: rgb(200, 200, 200) }
}
</style>
