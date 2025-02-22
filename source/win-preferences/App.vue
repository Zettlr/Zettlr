<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:tabbar-label="'Preferences'"
    v-bind:disable-vibrancy="true"
  >
    <!--
      To comply with ARIA, we have to wrap the form in a tab container because
      we make use of the tabbar on the window chrome.
    -->
    <SplitView
      v-bind:initial-size-percent="[ 20, 80 ]"
      v-bind:minimum-size-percent="[ 20, 20 ]"
      v-bind:reset-size-percent="[ 20, 80 ]"
      v-bind:split="'horizontal'"
      v-bind:initial-total-width="100"
    >
      <template #view1>
        <TextControl
          v-model="query"
          v-bind:placeholder="searchPlaceholder"
          v-bind:search-icon="true"
          v-bind:autofocus="true"
          v-bind:reset="true"
          style="padding: 5px 10px"
        ></TextControl>
        <SelectableList
          v-bind:items="groups"
          v-bind:editable="false"
          v-bind:selected-item="selectedItem"
          v-on:select="selectGroup($event)"
        ></SelectableList>
      </template>
      <template #view2>
        <FormBuilder
          v-if="schema.fieldsets.length > 0"
          ref="form"
          v-bind:model="model"
          v-bind:schema="schema"
          v-on:update:model-value="handleInput"
        ></FormBuilder>
        <div v-else id="no-results-message">
          {{ noResultsMessage }}
        </div>
      </template>
    </SplitView>
  </WindowChrome>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Preferences
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the entry app for the preferences window.
 *
 * END HEADER
 */

import FormBuilder, { type FormSchema, type Fieldset } from '@common/vue/form/FormBuilder.vue'
import WindowChrome from '@common/vue/window/WindowChrome.vue'
import { trans } from '@common/i18n-renderer'

import { getGeneralFields } from './schema/general'
import { getEditorFields } from './schema/editor'
import { getCitationFields } from './schema/citations'
import { getZettelkastenFields } from './schema/zettelkasten'
import { getSpellcheckingFields } from './schema/spellchecking'
import { getAutocorrectFields } from './schema/autocorrect'
import { getAdvancedFields } from './schema/advanced'
import { ref, computed, watch, onMounted, onBeforeMount } from 'vue'
import { resolveLangCode } from '@common/util/map-lang-code'
import SplitView from '@common/vue/window/SplitView.vue'
import SelectableList, { type SelectableListItem } from '@common/vue/form/elements/SelectableList.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import { getAppearanceFields } from './schema/appearance'
import { getFileManagerFields } from './schema/file-manager'
import { getImportExportFields } from './schema/import-export'
import { getSnippetsFields } from './schema/snippets'
import { useConfigStore } from 'source/pinia'
import { PreferencesGroups } from './schema/_preferences-groups'

export type PreferencesFieldset = Fieldset & { group: PreferencesGroups }

const ipcRenderer = window.ipc
const configStore = useConfigStore()

const currentGroup = ref(0)
const query = ref('')
// Will be populated afterwards, contains the user dict
const userDictionaryContents = ref<any[]>([]) // TODO
// Will be populated afterwards, contains all dictionaries
const availableDictionaries = ref<Array<{ selected: boolean, value: string, key: string }>>([])
// Will be populated afterwards, contains the available languages
const appLangOptions = ref<Record<string, string>>({})

// This will return the full object
const config = computed(() => configStore.config)

const noResultsMessage = computed(() => trans('No results for "%s"', query.value))
const searchPlaceholder = trans('Search')

const schema = computed<FormSchema>(() => {
  return {
    fieldsets: filteredFieldsets.value,
    getFieldsetCategory: (fieldset: Fieldset) => {
      if (query.value === '') {
        return undefined
      }

      const group = groups.value.find(g => g.id === fieldset.group)

      if (group !== undefined && group.icon !== undefined) {
        return { icon: group.icon, title: group.displayText }
      } else {
        return undefined
      }
    }
  }
})

const selectedItem = computed(() => query.value === '' ? currentGroup.value : -1)

const fieldsets = computed<Fieldset[]>(() => {
  return [
    ...getAdvancedFields(configStore.config),
    ...getAppearanceFields(configStore.config),
    ...getAutocorrectFields(),
    ...getCitationFields(),
    ...getEditorFields(configStore.config),
    ...getFileManagerFields(configStore.config),
    ...getGeneralFields(appLangOptions.value),
    ...getImportExportFields(),
    ...getSnippetsFields(),
    ...getSpellcheckingFields(configStore.config),
    ...getZettelkastenFields(configStore.config)
  ]
})

const filteredFieldsets = computed(() => {
  const q = query.value.toLowerCase().trim()

  if (q === '') {
    // No active search, so simply return the currently active group
    const activeGroup = groups.value[currentGroup.value].id
    return fieldsets.value.filter(f => f.group === activeGroup)
  }

  return fieldsets.value.filter(f => {
    // BUG: Somehow TypeScript (and ESLint!) knows that everything here works
    // out but STILL insists on explicitly casting everything to boolean. I
    // don't know why.

    // Match relevancy:
    // 1. Search term is in card title
    if (Boolean(f.title.toLowerCase().includes(q))) {
      return true
    }

    if (Boolean((f.help?.toLowerCase().includes(q)))) {
      return true
    }

    for (const field of f.fields) {
      if ('label' in field && (Boolean((field.label?.toLowerCase().includes(q))))) {
        return true
      } else if ('info' in field && (Boolean((field.info?.toLowerCase().includes(q))))) {
        return true
      } else if (field.type === 'radio' || field.type === 'select') {
        for (const option in field.options) {
          if (option.toLowerCase().includes(q)) {
            return true
          }
        }
      }
    }
    return false
  })
})

const groups = computed<Array<SelectableListItem & { id: PreferencesGroups }>>(() => {
  return [
    {
      displayText: trans('General'),
      icon: 'cog',
      id: PreferencesGroups.General
    },
    {
      displayText: trans('Appearance'),
      icon: 'paint-roller',
      id: PreferencesGroups.Appearance
    },
    {
      displayText: trans('File Manager'),
      icon: 'folder-open',
      id: PreferencesGroups.FileManager
    },
    {
      displayText: trans('Editor'),
      icon: 'align-left-text',
      id: PreferencesGroups.Editor
    },
    {
      displayText: trans('Spellchecking'),
      icon: 'text',
      id: PreferencesGroups.Spellchecking
    },
    {
      displayText: trans('Autocorrect'),
      icon: 'wand', // 'block-quote'
      id: PreferencesGroups.Autocorrect
    },
    {
      displayText: trans('Citations'),
      icon: 'chat-bubble',
      id: PreferencesGroups.Citations
    },
    {
      displayText: trans('Zettelkasten'),
      icon: 'details',
      id: PreferencesGroups.Zettelkasten
    },
    {
      displayText: trans('Snippets'),
      icon: 'add-text',
      id: PreferencesGroups.Snippets
    },
    {
      displayText: trans('Import and Export'),
      icon: 'two-way-arrows',
      id: PreferencesGroups.ImportExport
    },
    {
      displayText: trans('Advanced'),
      icon: 'cpu',
      id: PreferencesGroups.Advanced
    }
  ]
})

const windowTitle = computed(() => {
  if (query.value !== '') {
    return trans('Searching: %s', query.value)
  } else if (process.platform === 'darwin') {
    return groups.value[currentGroup.value].displayText
  } else {
    return trans('Preferences')
  }
})

const model = computed(() => {
  // The model to be passed on will simply be a merger of custom values
  // and the configuration object. This way we can safely change some of
  // these values without risking to overwrite the model (which we have
  // done in a previous iteration of the preferences ...)
  return {
    userDictionaryContents: userDictionaryContents.value,
    availableDictionaries: availableDictionaries.value,
    ...config.value
  }
})

/**
 * Switches out the preferences tab based on the value of currentTab.
 */
watch(currentGroup, () => {
  setTitle()
  location.hash = '#' + currentGroup.value
})

/**
 * Initialise values during component mount
 */
onMounted(() => {
  setTitle()
  populateDynamicValues()
  if (location.hash !== '') {
    const groupId = parseInt(location.hash.substring(1), 10)
    if (Object.values(PreferencesGroups).includes(groupId)) {
      currentGroup.value = groupId
    }
  }
})

/**
   * Listen to events in order to adapt display.
   */
onBeforeMount(() => {
  ipcRenderer.on('dictionary-provider', (event, message) => {
    const { command } = message
    if (command === 'invalidate-dict') {
      populateDynamicValues()
    }
  })
})

/**
 * Called whenever a form value changes, and updates that specific setting.
 *
 * @param   {string}  prop  The property that has changed
 * @param   {any}     val   The value of that property.
 */
function handleInput (prop: string, val: any): void {
  // We do have an easy time here
  if (prop === 'userDictionaryContents') {
    // The user dictionary is not handled by the config
    ipcRenderer.invoke('dictionary-provider', {
      command: 'set-user-dictionary',
      payload: val
    })
      .catch(err => console.error(err))
  } else if (prop === 'availableDictionaries') {
    // We have to extract the selected dictionaries and send their keys only
    const enabled = val.filter((elem: any) => elem.selected).map((elem: any) => elem.key)
    configStore.setConfigValue('selectedDicts', enabled)
    // Additionally, we have to backpropagate the new stuff down the pipe
    // so that the list view has them again
  } else {
    // By default, we should have the correct value already, we just need to
    // treat (complex) lists as special (not even token inputs).

    // NOTE: Due to Vue 3 we MUST deproxy anything here. Since config values
    // are always either dictionaries, lists, or primitives, we can safely
    // do it the brute-force-way and stringify it. This will basically read
    // out every value from the proxy and store it in vanilla objects/arrays
    // again.
    configStore.setConfigValue(prop, JSON.parse(JSON.stringify(val)))
  }
}

/**
 * Sets the window title corresponding to the current tab.
 */
function setTitle (): void {
  if (process.platform === 'darwin') {
    // Apple's Human Interface Guidelines state the window title should be
    // the current tab.
    document.title = groups.value[currentGroup.value].displayText
  }
}

/**
 * Populates dynamic fields (that is, those configurations that are not
 * controlled by the configuration provider).
 */
function populateDynamicValues (): void {
  // Get a list of all available languages
  ipcRenderer.invoke('application', {
    command: 'get-available-languages'
  })
    .then((languages) => {
      const options: Record<string, string> = {}
      languages.map((lang: string) => {
        options[lang] = resolveLangCode(lang, 'name')
        return null
      })
      appLangOptions.value = options
    })
    .catch(err => console.error(err))

  // Also, get a list of all available dictionaries
  ipcRenderer.invoke('application', {
    command: 'get-available-dictionaries'
  })
    .then((dictionaries) => {
      const values: Array<{ selected: boolean, value: string, key: string }> = []
      dictionaries.map((dict: string) => {
        values.push({
          selected: model.value.selectedDicts.includes(dict),
          value: resolveLangCode(dict, 'name'),
          key: dict
        })
        return null
      })

      availableDictionaries.value = values
    })
    .catch(err => console.error(err))

  // Retrieve the user dictionary
  ipcRenderer.invoke('dictionary-provider', {
    command: 'get-user-dictionary'
  })
    .then((dictionary) => {
      userDictionaryContents.value = dictionary
    })
    .catch(err => console.error(err))
}

function selectGroup (which: number): void {
  if (query.value === '') {
    currentGroup.value = which
  }
}
</script>

<style lang="less">
div[role="tabpanel"] {
  overflow: auto; // Enable scrolling, if necessary
  padding: 10px;
  width: 100%;
}

#no-results-message {
  font-size: 200%;
  text-align: center;
  font-weight: bold;
  margin-top: 20vh;
}
</style>
