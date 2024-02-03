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
      v-bind:split="'horizontal'"
      v-bind:initial-total-width="100"
    >
      <template #view1>
        <TextControl
          v-model="query"
          v-bind:placeholder="'Find…'"
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

<script lang="ts">
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
import { defineComponent } from 'vue'
import { resolveLangCode } from '@common/util/map-lang-code'
import SplitView from '@common/vue/window/SplitView.vue'
import SelectableList, { type SelectableListItem } from '@common/vue/form/elements/SelectableList.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import { getAppearanceFields } from './schema/appearance'
import { getFileManagerFields } from './schema/file-manager'
import { getImportExportFields } from './schema/import-export'
import { getSnippetsFields } from './schema/snippets'

export enum PreferencesGroups {
  Advanced,
  Appearance,
  Autocorrect,
  Citations,
  Editor,
  FileManager,
  General,
  ImportExport,
  Snippets,
  Spellchecking,
  Zettelkasten
}

export type PreferencesFieldset = Fieldset & { group: PreferencesGroups }

const ipcRenderer = window.ipc
const config = window.config

/**
 * Searches the tree for a given model, traversing as necessary. Uses a depth-
 * first search.
 *
 * @param   {string}            model  The model to be searched for
 * @param   {any}               tree   The object containing a schema to search.
 *
 * @return  {Field|undefined}          The corresponding field or undefined
 */
// function modelToField (model: string, tree: any): any {
//   if (tree === undefined) {
//     throw new Error('Could not map model: tree not defined!')
//   }

//   if (tree.model !== undefined && tree.model === model) {
//     return tree
//   }

//   if (tree.fieldsets !== undefined) {
//     for (const fieldset of tree.fieldsets) {
//       let field = modelToField(model, fieldset)
//       if (field !== undefined) {
//         return field
//       }
//     }
//   }

//   if (tree.fields !== undefined) {
//     for (const fieldElement of tree.fields) {
//       let field = modelToField(model, fieldElement)
//       if (field !== undefined) {
//         return field
//       }
//     }
//   }

//   if (Array.isArray(tree)) {
//     for (const element of tree) {
//       let field = modelToField(model, element)
//       if (field !== undefined) {
//         return field
//       }
//     }
//   }

//   return undefined
// }

export default defineComponent({
  components: {
    FormBuilder,
    WindowChrome,
    SplitView,
    SelectableList,
    TextControl
  },
  data () {
    return {
      currentGroup: 0,
      query: '',
      // Will be populated afterwards, contains the user dict
      userDictionaryContents: [],
      // Will be populated afterwards, contains all dictionaries
      availableDictionaries: [],
      // Will be populated afterwards, contains the available languages
      appLangOptions: {} as any,
      // This will return the full object
      config: config.get()
    }
  },
  computed: {
    noResultsMessage () {
      return trans('No results for "%s"', this.query)
    },
    schema (): FormSchema {
      return {
        fieldsets: this.filteredFieldsets,
        getFieldsetCategory: (fieldset) => {
          if (this.query === '') {
            return undefined
          }

          const group = this.groups.find(g => g.id === fieldset.group)

          if (group !== undefined && group.icon !== undefined) {
            return { icon: group.icon, title: group.displayText }
          } else {
            return undefined
          }
        }
      }
    },
    selectedItem () {
      if (this.query === '') {
        return this.currentGroup
      } else {
        return -1
      }
    },
    fieldsets (): Fieldset[] {
      return [
        ...getAdvancedFields(),
        ...getAppearanceFields(),
        ...getAutocorrectFields(),
        ...getCitationFields(),
        ...getEditorFields(),
        ...getFileManagerFields(),
        ...getGeneralFields(this.appLangOptions),
        ...getImportExportFields(),
        ...getSnippetsFields(),
        ...getSpellcheckingFields(),
        ...getZettelkastenFields()
      ]
    },
    filteredFieldsets (): Fieldset[] {
      if (this.query !== '') {
        const q = this.query.toLowerCase().trim()
        return this.fieldsets.filter(f => {
          // Match relevancy:
          // 1. Search term is in card title
          if (f.title.toLowerCase().includes(q)) {
            return true
          }

          if (f.help?.toLowerCase().includes(q)) {
            return true
          }

          for (const field of f.fields) {
            if ('label' in field && field.label?.toLowerCase().includes(q)) {
              return true
            } else if ('info' in field && field.info?.toLowerCase().includes(q)) {
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
      } else {
        // No active search, so simply return the currently active group
        const activeGroup = this.groups[this.currentGroup].id
        return this.fieldsets.filter(f => f.group === activeGroup)
      }
    },
    groups (): Array<SelectableListItem & { id: PreferencesGroups }> {
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
          displayText: trans('AutoCorrect'),
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
    },
    windowTitle: function (): string {
      if (this.query !== '') {
        return trans('Searching: %s', this.query)
      } else if (process.platform === 'darwin') {
        return this.groups[this.currentGroup].displayText
      } else {
        return trans('Preferences')
      }
    },
    showTitlebar: function (): boolean {
      const isDarwin = document.body.classList.contains('darwin')
      return isDarwin || config.get('nativeAppearance') === false
    },
    model: function (): any {
      // The model to be passed on will simply be a merger of custom values
      // and the configuration object. This way we can safely change some of
      // these values without risking to overwrite the model (which we have
      // done in a previous iteration of the preferences ...)
      return {
        userDictionaryContents: this.userDictionaryContents,
        availableDictionaries: this.availableDictionaries,
        ...this.config
      }
    }
  },
  watch: {
    /**
     * Switches out the preferences tab based on the value of currentTab.
     */
    currentGroup: function () {
      this.setTitle()
      location.hash = '#' + this.currentGroup
    }
  },
  /**
   * Initialise values during component mount
   */
  mounted: function () {
    this.setTitle()
    this.populateDynamicValues()
    if (location.hash !== '') {
      const groupId = parseInt(location.hash.substring(1), 10)
      if (Object.values(PreferencesGroups).includes(groupId)) {
        this.currentGroup = groupId
      }
    }
  },
  /**
   * Listen to events in order to adapt display.
   */
  created: function () {
    // Listen to config updates to propagate down
    ipcRenderer.on('config-provider', (event, message) => {
      const { command } = message
      if (command === 'update') {
        // Don't waste boilerplate, just overwrite that whole thing
        // and let's hope the Vue algorithm of finding out what has
        // to be re-rendered is good!
        this.config = config.get()
        this.populateDynamicValues()
      }
    })

    ipcRenderer.on('dictionary-provider', (event, message) => {
      const { command } = message
      if (command === 'invalidate-dict') {
        this.populateDynamicValues()
      }
    })
  },
  methods: {
    /**
     * Called whenever a form value changes, and updates that specific setting.
     *
     * @param   {string}  prop  The property that has changed
     * @param   {any}     val   The value of that property.
     */
    handleInput: function (prop: string, val: any) {
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
        config.set('selectedDicts', enabled)
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
        config.set(prop, JSON.parse(JSON.stringify(val)))
      }
    },
    /**
     * Sets the window title corresponding to the current tab.
     */
    setTitle: function () {
      if (process.platform === 'darwin') {
        // Apple's Human Interface Guidelines state the window title should be
        // the current tab.
        document.title = this.groups[this.currentGroup].displayText
      }
    },
    /**
     * Populates dynamic fields (that is, those configurations that are not
     * controlled by the configuration provider).
     */
    populateDynamicValues: function () {
      // Get a list of all available languages
      ipcRenderer.invoke('application', {
        command: 'get-available-languages'
      })
        .then((languages) => {
          const options: any = {}
          languages.map((lang: string) => {
            options[lang] = resolveLangCode(lang, 'name')
            return null
          })
          this.appLangOptions = options
        })
        .catch(err => console.error(err))

      // Also, get a list of all available dictionaries
      ipcRenderer.invoke('application', {
        command: 'get-available-dictionaries'
      })
        .then((dictionaries) => {
          const values: any = []
          dictionaries.map((dict: string) => {
            values.push({
              selected: this.model.selectedDicts.includes(dict),
              value: resolveLangCode(dict, 'name'),
              key: dict
            })
            return null
          })

          this.availableDictionaries = values
        })
        .catch(err => console.error(err))

      // Retrieve the user dictionary
      ipcRenderer.invoke('dictionary-provider', {
        command: 'get-user-dictionary'
      })
        .then((dictionary) => {
          this.userDictionaryContents = dictionary
        })
        .catch(err => console.error(err))
    },
    selectGroup (which: number) {
      if (this.query === '') {
        this.currentGroup = which
      }
    }
  }
})
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
