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
      <Form
        ref="form"
        v-bind:model="model"
        v-bind:schema="schema"
        v-on:update:model-value="handleInput"
      ></Form>
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

import Form from '../common/vue/form/Form.vue'
import WindowChrome from '../common/vue/window/Chrome.vue'
import { trans } from '../common/i18n-renderer'

import generalSchema from './schema/general'
import editorSchema from './schema/editor'
import exportSchema from './schema/export'
import zettelkastenSchema from './schema/zettelkasten'
import displaySchema from './schema/display'
import spellcheckingSchema from './schema/spellchecking'
import autocorrectSchema from './schema/autocorrect'
import advancedSchema from './schema/advanced'
import { IpcRenderer } from 'electron'
import { defineComponent } from 'vue'

const ipcRenderer: IpcRenderer = (window as any).ipc

const SCHEMA: { [key: string]: Function|any } = {
  'tab-general': generalSchema,
  'tab-editor': editorSchema,
  'tab-export': exportSchema,
  'tab-zettelkasten': zettelkastenSchema,
  'tab-display': displaySchema,
  'tab-spellchecking': spellcheckingSchema,
  'tab-autocorrect': autocorrectSchema,
  'tab-advanced': advancedSchema
}

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
    Form,
    WindowChrome
  },
  data () {
    return {
      currentTab: 0,
      tabs: [
        {
          label: trans('dialog.preferences.general'),
          controls: 'tab-general',
          id: 'tab-general-control',
          icon: 'cog'
        },
        {
          label: trans('dialog.preferences.editor'),
          controls: 'tab-editor',
          id: 'tab-editor-control',
          icon: 'note'
        },
        {
          label: trans('dialog.preferences.export.title'),
          controls: 'tab-export',
          id: 'tab-export-control',
          icon: 'share'
        },
        {
          label: trans('dialog.preferences.zkn.title'),
          controls: 'tab-zettelkasten',
          id: 'tab-zettelkasten-control',
          icon: 'details'
        },
        {
          label: trans('dialog.preferences.display.title'),
          controls: 'tab-display',
          id: 'tab-display-control',
          icon: 'display'
        },
        {
          label: trans('dialog.preferences.spellchecking.title'),
          controls: 'tab-spellchecking',
          id: 'tab-spellchecking-control',
          icon: 'text'
        },
        {
          label: trans('dialog.preferences.autocorrect.title'),
          controls: 'tab-autocorrect',
          id: 'tab-autocorrect-control',
          icon: 'block-quote'
        },
        {
          label: trans('dialog.preferences.advanced'),
          controls: 'tab-advanced',
          id: 'tab-advanced-control',
          icon: 'tools'
        }
      ],
      // Will be prepopulated afterwards, contains the user dict
      userDictionaryContents: [],
      // Will be populated afterwards, contains all dictionaries
      availableDictionaries: [],
      // This will return the full object
      config: (global as any).config.get(),
      schema: SCHEMA['tab-general']()
    }
  },
  computed: {
    windowTitle: function (): string {
      if (process.platform === 'darwin') {
        return this.tabs[this.currentTab].label
      } else {
        return trans('dialog.preferences.title')
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

    if (process.env.ZETTLR_IS_TRAY_SUPPORTED === '0') {
      const leaveAppRunningField = modelToField('system.leaveAppRunning', SCHEMA['tab-advanced'])
      if (leaveAppRunningField !== undefined) {
        leaveAppRunningField.disabled = true
        if (process.env.ZETTLR_TRAY_ERROR !== undefined) {
          leaveAppRunningField.info = process.env.ZETTLR_TRAY_ERROR
        }
      }
    }
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
        (global as any).config.set(prop, val)
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
          const field = modelToField('appLang', SCHEMA['tab-general'])

          if (field !== undefined) {
            const options: any = {}
            languages.map((lang: string) => {
              options[lang] = trans('dialog.preferences.app_lang.' + lang)
              return null
            })
            field.options = options
          } else {
            console.error('Could not set available languages')
          }
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
              value: trans('dialog.preferences.app_lang.' + dict)
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
      this.schema = SCHEMA[this.tabs[this.currentTab].controls]()
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
