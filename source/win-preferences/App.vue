<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="'Preferences'"
    v-bind:disable-vibrancy="true"
    v-on:tab="currentTab = $event"
  >
    <!--
      To comply with ARIA, we have to wrap the form in a tab container because
      we make use of the tabbar on the window chrome.
    -->
    <div
      v-bind:id="tabs[currentTab].controls"
      role="tabpanel"
      v-bind:aria-labelledby="tabs[currentTab].id"
    >
      <FormBuilder
        ref="form"
        v-bind:model="model"
        v-bind:schema="schema"
        v-on:update:model-value="handleInput"
      ></FormBuilder>
    </div>
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

import FormBuilder from '@common/vue/form/Form.vue'
import WindowChrome from '@common/vue/window/Chrome.vue'
import { trans } from '@common/i18n-renderer'

import generalSchema from './schema/general'
import editorSchema from './schema/editor'
import exportSchema from './schema/export'
import citationSchema from './schema/citations'
import zettelkastenSchema from './schema/zettelkasten'
import displaySchema from './schema/display'
import spellcheckingSchema from './schema/spellchecking'
import autocorrectSchema from './schema/autocorrect'
import advancedSchema from './schema/advanced'
import toolbarSchema from './schema/toolbar'
import { defineComponent } from 'vue'
import { WindowTab } from '@dts/renderer/window'

const ipcRenderer = window.ipc

/**
 * Searches the tree for a given model, traversing as necessary. Uses a depth-
 * first search.
 *
 * @param   {string}            model  The model to be searched for
 * @param   {any}               tree   The object containing a schema to search.
 *
 * @return  {Field|undefined}          The corresponding field or undefined
 */
function modelToField (model: string, tree: any): any {
  if (tree === undefined) {
    throw new Error('Could not map model: tree not defined!')
  }

  if (tree.model !== undefined && tree.model === model) {
    return tree
  }

  if (tree.fieldsets !== undefined) {
    for (const fieldset of tree.fieldsets) {
      let field = modelToField(model, fieldset)
      if (field !== undefined) {
        return field
      }
    }
  }

  if (tree.fields !== undefined) {
    for (const fieldElement of tree.fields) {
      let field = modelToField(model, fieldElement)
      if (field !== undefined) {
        return field
      }
    }
  }

  if (Array.isArray(tree)) {
    for (const element of tree) {
      let field = modelToField(model, element)
      if (field !== undefined) {
        return field
      }
    }
  }

  return undefined
}

export default defineComponent({
  components: {
    FormBuilder,
    WindowChrome
  },
  data () {
    return {
      currentTab: 0,
      tabs: [
        {
          label: trans('General'),
          controls: 'tab-general',
          id: 'tab-general-control',
          icon: 'cog'
        },
        {
          label: trans('Editor'),
          controls: 'tab-editor',
          id: 'tab-editor-control',
          icon: 'note'
        },
        {
          label: trans('Export'),
          controls: 'tab-export',
          id: 'tab-export-control',
          icon: 'share'
        },
        {
          label: trans('Citations'),
          controls: 'tab-citations',
          id: 'tab-citations-control',
          icon: 'block-quote'
        },
        {
          label: trans('Zettelkasten'),
          controls: 'tab-zettelkasten',
          id: 'tab-zettelkasten-control',
          icon: 'details'
        },
        {
          label: trans('Display'),
          controls: 'tab-display',
          id: 'tab-display-control',
          icon: 'display'
        },
        {
          label: trans('Spellchecking'),
          controls: 'tab-spellchecking',
          id: 'tab-spellchecking-control',
          icon: 'text'
        },
        {
          label: trans('AutoCorrect'),
          controls: 'tab-autocorrect',
          id: 'tab-autocorrect-control',
          icon: 'wand' // 'block-quote'
        },
        {
          label: trans('Advanced'),
          controls: 'tab-advanced',
          id: 'tab-advanced-control',
          icon: 'tools'
        },
        {
          label: trans('Toolbar'),
          controls: 'tab-toolbar',
          id: 'tab-toolbar-control',
          icon: 'container'
        }
      ] as WindowTab[],
      // Will be populated afterwards, contains the user dict
      userDictionaryContents: [],
      // Will be populated afterwards, contains all dictionaries
      availableDictionaries: [],
      // Will be populated afterwards, contains the available languages
      appLangOptions: {} as any,
      // This will return the full object
      config: (global as any).config.get(),
      schema: {}
    }
  },
  computed: {
    windowTitle: function (): string {
      if (process.platform === 'darwin') {
        return this.tabs[this.currentTab].label
      } else {
        return trans('Preferences')
      }
    },
    showTitlebar: function (): boolean {
      const isDarwin = document.body.classList.contains('darwin')
      return isDarwin || (global as any).config.get('nativeAppearance') === false
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
    },
    langMap: function (): { [key: string]: string } {
      return {
        'af-ZA': trans('Afrikaans (South Africa)'),
        'ar-AR': trans('Arabic'),
        'be-BE': trans('Belarus'),
        'bg-BG': trans('Bulgarian'),
        'bs-BS': trans('Bosnian'),
        'ca-CA': trans('Catalan (Catalonia)'),
        'cs-CZ': trans('Czech (Czech Republic)'),
        'da-DA': trans('Danish'),
        'de-AT': trans('German (Austria)'),
        'de-CH': trans('German (Switzerland)'),
        'de-DE': trans('German (Germany)'),
        'el-GR': trans('Greek'),
        'en-AU': trans('English (Australia)'),
        'en-CA': trans('English (Canada)'),
        'en-GB': trans('English (United Kingdom)'),
        'en-IN': trans('English (India)'),
        'en-US': trans('English (United States)'),
        'en-ZA': trans('English (South Africa)'),
        'eo-EO': trans('Esperanto'),
        'es-ES': trans('Spanish (Spain)'),
        'et-ET': trans('Estonian'),
        'eu-EU': trans('Basque'),
        'fa-IR': trans('Persian (Farsi)'),
        'fi-FI': trans('Finnish'),
        'fo-FO': trans('Faroese'),
        'fr-FR': trans('French (France)'),
        'ga-GA': trans('Irish'),
        'gd-GD': trans('Scottish (Gaelic)'),
        'gl-ES': trans('Galician (Spain)'),
        'he-HE': trans('Hebrew'),
        'hi-IN': trans('Hindi'),
        'hr-HR': trans('Croatian'),
        'hu-HU': trans('Hungarian'),
        'hy-AM': trans('Armenian'),
        'id-ID': trans('Indonesian'),
        'is-IS': trans('Icelandic'),
        'it-IT': trans('Italian (Italy)'),
        'ja-JP': trans('Japanese'),
        'ka-KA': trans('Georgian'),
        'ko-KO': trans('Korean'),
        'la-LA': trans('Latin'),
        'lb-LB': trans('Luxembourgian'),
        'lt-LT': trans('Lithuanian'),
        'lv-LV': trans('Latvian'),
        'mk-MK': trans('Macedonian'),
        'mn-MN': trans('Mongolian'),
        'ms-MY': trans('Malaysian (Malaysia)'),
        'nb-NO': trans('Norwegian (Bokmål)'),
        'ne-NE': trans('Nepalese'),
        'nl-BE': trans('Dutch (Belgium)'),
        'nl-NL': trans('Dutch (Netherlands)'),
        'nn-NO': trans('Norwegian (Nyorsk)'),
        'pl-PL': trans('Polish'),
        'pt-BR': trans('Portuguese (Brazil)'),
        'pt-PT': trans('Portuguese (Portugal)'),
        'ro-RO': trans('Romanian'),
        'ru-RU': trans('Russian'),
        'rw-RW': trans('Rwandan (Kinyarwanda)'),
        'sk-SK': trans('Slovakian'),
        'sl-SL': trans('Slovenian'),
        'sr-SR': trans('Serbian'),
        'sv-SV': trans('Swedish'),
        'tr-TR': trans('Turkish'),
        'uk-UK': trans('Ukrainian'),
        'ur-PK': trans('Urdu (Pakistan)'),
        'vi-VI': trans('Vietnamese'),
        'zh-CN': trans('Chinese (China)'),
        'zh-TW': trans('Chinese (Taiwan)')
      }
    }
  },
  watch: {
    /**
     * Switches out the preferences tab based on the value of currentTab.
     */
    currentTab: function () {
      this.setTitle()
      this.recreateSchema()
    }
  },
  /**
   * Initialise values during component mount
   */
  mounted: function () {
    this.setTitle()
    this.populateDynamicValues()
    this.recreateSchema()
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
        this.config = (global as any).config.get()
        this.populateDynamicValues()
        this.recreateSchema()
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
        ;(global as any).config.set('selectedDicts', enabled)
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
        (global as any).config.set(prop, JSON.parse(JSON.stringify(val)))
      }
    },
    /**
     * Sets the window title corresponding to the current tab.
     */
    setTitle: function () {
      if (process.platform === 'darwin') {
        // Apple's Human Interface Guidelines state the window title should be
        // the current tab.
        document.title = this.tabs[this.currentTab].label
      }
    },
    /**
     * Populates dynamic fields (that is, those configurations that are not
     * controlled by the configuration provider).
     */
    populateDynamicValues: function () {
      // Get a list of all available languages
      ipcRenderer.invoke('translation-provider', {
        command: 'get-available-languages'
      })
        .then((languages) => {
          const options: any = {}
          languages.map((lang: string) => {
            options[lang] = this.langMap[lang] ?? lang
            return null
          })
          this.appLangOptions = options
          // Since we're setting something on the schema-side of things, we must
          // regenerate the form here.
          this.recreateSchema()
        })
        .catch(err => console.error(err))

      // Also, get a list of all available dictionaries
      ipcRenderer.invoke('translation-provider', {
        command: 'get-available-dictionaries'
      })
        .then((dictionaries) => {
          const values: any = []
          dictionaries.map((dict: string) => {
            values.push({
              selected: this.model.selectedDicts.includes(dict),
              key: dict,
              value: this.langMap[dict] ?? dict
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
    recreateSchema: function () {
      const currentTab = this.tabs[this.currentTab].controls

      switch (currentTab) {
        case 'tab-general':
          this.schema = generalSchema()
          break
        case 'tab-editor':
          this.schema = editorSchema()
          break
        case 'tab-export':
          this.schema = exportSchema()
          break
        case 'tab-citations':
          this.schema = citationSchema()
          break
        case 'tab-zettelkasten':
          this.schema = zettelkastenSchema()
          break
        case 'tab-display':
          this.schema = displaySchema()
          break
        case 'tab-spellchecking':
          this.schema = spellcheckingSchema()
          break
        case 'tab-autocorrect':
          this.schema = autocorrectSchema()
          break
        case 'tab-advanced':
          this.schema = advancedSchema()
          break
        case 'tab-toolbar':
          this.schema = toolbarSchema()
          break
      }

      // Populate the appLang field with available options
      if (this.tabs[this.currentTab].controls === 'tab-general') {
        const field = modelToField('appLang', this.schema)
        field.options = this.appLangOptions
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
</style>
