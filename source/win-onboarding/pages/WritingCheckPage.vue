<template>
  <h1>{{ pageHeading }}</h1>

  <template v-if="dictionaryCandidate !== undefined">
    <p>
      {{ dictIntro }}
    </p>
  
    <p>
      <button v-bind:class="{ active: hasChosenDict }" v-on:click="toggleDictionary">
        {{ dictLabel }}
      </button>
    </p>
  </template>

  <p>
    {{ ltIntro }}
  </p>

  <p>
    <button v-bind:class="{ active: hasActivatedLT }" v-on:click="toggleLanguageTool">
      {{ ltLabel }}
    </button>
  </p>

  <p>
    {{ ltOutro }}
  </p>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import findLangCandidates from 'source/common/util/find-lang-candidates'
import { resolveLangCode } from 'source/common/util/map-lang-code'
import { useConfigStore } from 'source/pinia'
import { ref, computed, onMounted } from 'vue'

const pageHeading = trans('Check your writing')
const dictIntro = trans('Here you can configure how you wish to check for spelling errors. You can select a built-in dictionary, or set up LanguageTool.')
const dictLabel = computed(() => {
  return trans('Set %s as a spellchecking dictionary', dictionaryCandidateLanguage.value)
})
const ltIntro = trans('Zettlr integrates with LanguageTool, a free grammar and spellchecker. You can turn it on with simple defaults.')
const ltLabel = trans('Activate LanguageTool (uses online service)')
const ltOutro = trans('You can choose a custom server and provide your LanguageTool username later in the settings.')

const configStore = useConfigStore()

const ipcRenderer = window.ipc
const hasActivatedLT = computed(() => {
  return configStore.config.editor.lint.languageTool.active
})

const hasChosenDict = computed(() => {
  return configStore.config.selectedDicts.length > 0
})

const dictionaryCandidate = ref<string|undefined>(undefined)
const dictionaryCandidateLanguage = computed(() => {
  if (dictionaryCandidate.value === undefined) {
    return false
  }
  return resolveLangCode(dictionaryCandidate.value, 'name')
})

onMounted(async () => {
  const dictionaries: string[] = await ipcRenderer.invoke('application', {
    command: 'get-available-dictionaries'
  })

  const candidates = dictionaries.map(dict => ({ tag: dict }))
  // Now we should have a list of all available dictionaries. Next, we need to
  // search for a best and a close match.
  const { exact, close } = findLangCandidates(String(window.config.get('appLang')), candidates)
  if (exact !== undefined) {
    dictionaryCandidate.value = exact.tag
  } else if (close !== undefined) {
    dictionaryCandidate.value = close.tag
  } else {
    dictionaryCandidate.value = 'en-US' // Fallback
  }
})

function toggleDictionary () {
  if (hasChosenDict.value) {
    window.config.set('selectedDicts', [])
  } else {
    window.config.set('selectedDicts', [dictionaryCandidate.value])
  }
}

function toggleLanguageTool () {
  configStore.setConfigValue('editor.lint.languageTool.active', !hasActivatedLT.value)
}
</script>

<style lang="css" scoped>
</style>
