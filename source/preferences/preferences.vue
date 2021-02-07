<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="'Preferences'"
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
      class="columns"
    >
      <Form
        ref="form"
        v-bind:model="model"
        v-bind:schema="schema"
        v-on:input="handleInput"
      ></Form>
    </div>
  </WindowChrome>
</template>

<script>
import Form from '../common/vue/form/Form.vue'
import WindowChrome from '../common/vue/window/Chrome.vue'
import { trans } from '../common/i18n'
import { ipcRenderer } from 'electron'

const SCHEMA = {
  // General tab
  'tab-general': {
    fieldsets: [
      [
        {
          type: 'select',
          label: trans('dialog.preferences.app_lang.title'),
          model: 'appLang',
          options: {} // Will be set dynamically
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.nightmode'),
          model: 'darkMode'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.file_meta'),
          model: 'fileMeta'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.hide_dirs'),
          model: 'hideDirs'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.always_reload_files'),
          model: 'alwaysReloadFiles'
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.auto_dark_mode_explanation'),
          model: 'autoDarkMode',
          options: {
            'off': trans('dialog.preferences.auto_dark_mode_off'),
            'schedule': trans('dialog.preferences.auto_dark_mode_schedule'),
            'system': trans('dialog.preferences.auto_dark_mode_system')
          }
        },
        {
          type: 'time',
          label: 'Start dark mode at',
          model: 'autoDarkModeStart',
          inline: true
        },
        {
          type: 'time',
          label: 'End dark mode at',
          model: 'autoDarkModeEnd',
          inline: true
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.filemanager_explanation'),
          model: 'fileManagerMode',
          options: {
            'thin': trans('dialog.preferences.filemanager_thin'),
            'expanded': trans('dialog.preferences.filemanager_expanded'),
            'combined': trans('dialog.preferences.filemanager_combined')
          }
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.sorting_explanation'),
          model: 'sorting',
          options: {
            'natural': trans('dialog.preferences.sorting_natural'),
            'ascii': trans('dialog.preferences.sorting_ascii')
          }
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.sorting_time_explanation'),
          model: 'sortingTime',
          options: {
            'modtime': trans('dialog.preferences.modtime'),
            'creationtime': trans('dialog.preferences.creationtime')
          }
        },
        {
          type: 'radio',
          label: trans('dialog.preferences.display_time_explanation'),
          model: 'fileMetaTime',
          options: {
            'modtime': trans('dialog.preferences.modtime'),
            'creationtime': trans('dialog.preferences.creationtime')
          }
        }
      ]
    ]
  },
  'tab-editor': {
    fieldsets: [
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.formatting_characters_explanation'),
          model: 'editor.boldFormatting',
          options: {
            '**': '**' + trans('gui.formatting.bold') + '**',
            '__': '__' + trans('gui.formatting.bold') + '__'
          }
        },
        {
          type: 'radio',
          model: 'editor.italicFormatting',
          options: {
            '*': '*' + trans('gui.formatting.italic') + '*',
            '_': '_' + trans('gui.formatting.italic') + '_'
          }
        }
      ],
      [
        {
          type: 'text',
          label: trans('dialog.preferences.default_image_save_path'),
          model: 'editor.defaultSaveImagePath'
        },
        {
          type: 'number',
          label: trans('dialog.preferences.indent_unit'),
          model: 'editor.indentUnit'
        },
        {
          type: 'number',
          label: trans('dialog.preferences.editor_font_size'),
          model: 'editor.fontSize'
        },
        {
          type: 'select',
          label: trans('dialog.preferences.readability_algorithm'),
          model: 'editor.readabilityAlgorithm',
          options: {
            'dale-chall': 'Dale-Chall',
            'gunning-fog': 'Gunning-Fog',
            'coleman-liau': 'Coleman/Liau',
            'automated-readability': 'Automated Readability Index (ARI)'
          }
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.mute_lines'),
          model: 'muteLines'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.auto_close_brackets'),
          model: 'editor.autoCloseBrackets'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.autocomplete_accept_space'),
          model: 'editor.autocompleteAcceptSpace'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.homeEndBehaviour'),
          model: 'editor.homeEndBehaviour'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.enable_table_helper'),
          model: 'editor.enableTableHelper'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.count_chars'),
          model: 'editor.countChars'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.editor_setting.rtl_move_visually'),
          model: 'editor.rtlMoveVisually'
        }
      ],
      [
        {
          type: 'radio',
          label: '', // TODO
          model: 'editor.direction',
          options: {
            'ltr': trans('dialog.preferences.editor_setting.direction_ltr'),
            'rtl': trans('dialog.preferences.editor_setting.direction_rtl')
          }
        }
      ],
      [
        {
          type: 'select',
          label: trans('dialog.preferences.input_mode'),
          model: 'editor.inputMode',
          options: {
            'default': 'Normal',
            'emacs': 'Emacs'
          }
        }
      ]
    ]
  },
  'tab-export': {
    fieldsets: [
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.export.strip_id_label'),
          model: 'export.stripIDs'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.export.strip_tags_label'),
          model: 'export.stripTags'
        }
      ],
      [
        {
          type: 'radio',
          label: '', // TODO
          model: 'export.stripLinks',
          options: {
            'full': trans('dialog.preferences.export.strip_links_full_label'),
            'unlink': trans('dialog.preferences.export.strip_links_unlink_label'),
            'no': trans('dialog.preferences.export.strip_links_no_label')
          }
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.export.dest'),
          model: 'export.dir',
          options: {
            'tmp': trans('dialog.preferences.export.dest_temp_label'),
            'cwd': trans('dialog.preferences.export.dest_cwd_label')
          }
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.export.use_bundled_pandoc'),
          model: 'export.useBundledPandoc'
        },
        {
          type: 'file',
          label: trans('dialog.preferences.citation_database'),
          model: 'export.cslLibrary',
          filter: {
            'json, yaml, yml': 'CSL JSON',
            'tex': 'BibTex'
          }
        },
        {
          type: 'file',
          label: trans('dialog.preferences.project.csl_style'),
          model: 'export.cslStyle',
          filter: {
            'csl': 'CSL Style'
          }
        }
      ]
    ]
  },
  'tab-zettelkasten': {
    fieldsets: [
      [
        {
          type: 'text',
          label: trans('dialog.preferences.zkn.id_label'),
          model: 'zkn.idRE',
          reset: '(\\d{14})' // Default enables the reset button
        },
        {
          type: 'text',
          label: trans('dialog.preferences.zkn.linkstart_label'),
          model: 'zkn.linkStart',
          reset: '[['
        },
        {
          type: 'text',
          label: trans('dialog.preferences.zkn.linkend_label'),
          model: 'zkn.linkEnd',
          reset: ']]'
        },
        {
          type: 'text',
          label: trans('dialog.preferences.zkn.id_generator_label'),
          model: 'zkn.idGen',
          reset: '%Y%M%D%h%m%s'
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.zkn.link_behaviour_description'),
          model: 'zkn.linkWithFilename',
          options: {
            'always': trans('dialog.preferences.zkn.link_behaviour_always'),
            'withID': trans('dialog.preferences.zkn.link_behaviour_id'),
            'never': trans('dialog.preferences.zkn.link_behaviour_never')
          }
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.zkn.auto_create_file'),
          model: 'zkn.autoCreateLinkedFiles'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.zkn.auto_search'),
          model: 'zkn.autoSearch'
        }
      ]
    ]
  },
  'tab-display': {
    fieldsets: [
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.display.render_citations'),
          model: 'display.renderCitations'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.display.render_iframes'),
          model: 'display.renderIframes'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.display.render_images'),
          model: 'display.renderImages'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.display.render_links'),
          model: 'display.renderLinks'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.display.render_math'),
          model: 'display.renderMath'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.display.render_tasks'),
          model: 'display.renderTasks'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.display.render_htags'),
          model: 'display.renderHTags'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.display.use_first_headings'),
          model: 'display.useFirstHeadings'
        }
      ],
      [
        {
          type: 'theme',
          model: 'display.theme',
          options: {
            'berlin': {
              textColor: 'white',
              backgroundColor: '#1cb27e',
              name: 'Berlin',
              fontFamily: 'sans-serif'
            },
            'frankfurt': {
              textColor: 'white',
              backgroundColor: '#1d75b3',
              name: 'Frankfurt',
              fontFamily: 'serif'
            },
            'bielefeld': {
              textColor: 'black',
              backgroundColor: '#ffffdc',
              name: 'Bielefeld',
              fontFamily: 'monospace'
            },
            'karl-marx-stadt': {
              textColor: 'white',
              backgroundColor: '#dc2d2d',
              name: 'Karl-Marx-Stadt',
              fontFamily: 'sans-serif'
            },
            'bordeaux': {
              textColor: '#dc2d2d',
              backgroundColor: '#fffff8',
              name: 'Bordeaux',
              fontFamily: 'monospace'
            }
          }
        }
      ]
    ],
    fields: [
      // TODO: Image size constrainer input!
    ]
  },
  'tab-spellchecking': {
    fieldsets: [
      [
        {
          type: 'list',
          label: trans('dialog.preferences.spellcheck'),
          model: 'selectedDicts',
          listOptions: {
            selectable: true,
            multiSelect: true,
            deletable: false,
            searchable: true,
            searchLabel: trans('dialog.preferences.spellcheck_search_placeholder')
          },
          options: {
            'en-GB': 'English (United Kingdom)'
          }
        },
        {
          type: 'list',
          label: trans('dialog.preferences.user_dictionary'),
          model: 'userDictionaryContents',
          listOptions: {
            deletable: true,
            searchable: true,
            searchLabel: 'Search for entries …'
          }
        }
      ]
    ]
  },
  'tab-autocorrect': {
    fieldsets: [
      [
        {
          type: 'switch',
          label: trans('dialog.preferences.autocorrect.active_label'),
          model: 'editor.autoCorrect.active'
        }
      ],
      [
        {
          type: 'radio',
          model: 'editor.autoCorrect.style',
          options: {
            'Word': trans('dialog.preferences.autocorrect.style_word_label'),
            'LibreOffice': trans('dialog.preferences.autocorrect.style_libre_office_label')
          }
        }
      ],
      [
        // Taken from: https://de.wikipedia.org/wiki/Anf%C3%BChrungszeichen
        // ATTENTION when adding new pairs: They will be SPLIT using the hyphen character!
        {
          type: 'select',
          label: 'Primary Magic Quotes',
          model: 'editor.autoCorrect.magicQuotes.primary',
          options: {
            '"…"': trans('dialog.preferences.autocorrect.quick_select_none_label'),
            '“…”': '“…”',
            '”…”': '”…”',
            '„…“': '„…“',
            '„…”': '„…”',
            '“…„': '“…„',
            '“ … ”': '“ … ”',
            '»…«': '»…«',
            '«…»': '«…»',
            '»…»': '»…»',
            '‘…’': '‘…’',
            '« … »': '« … »',
            '「…」': '「…」',
            '『…』': '『…』'
          }
        },
        {
          type: 'select',
          label: 'Secondary Magic Quotes',
          model: 'editor.autoCorrect.magicQuotes.secondary',
          options: {
            '\'…\'': trans('dialog.preferences.autocorrect.quick_select_none_label'),
            '‘…’': '‘…’',
            '’…’': '’…’',
            '‚…‘': '‚…‘',
            '‚…’': '‚…’',
            '‘…‚': '‘…‚',
            '‘ … ’': '‘ … ’',
            '›…‹': '›…‹',
            '‹…›': '‹…›',
            '›…›': '›…›',
            '‹ … ›': '‹ … ›',
            '«…»': '«…»',
            '„…“': '„…“',
            '„…”': '„…”',
            '「…」': '「…」',
            '『…』': '『…』'
          }
        },
        {
          type: 'list',
          label: 'AutoCorrect',
          model: 'editor.autoCorrect.replacements',
          listOptions: {
            deletable: true,
            isDatatable: true // In this case, the module won't look for options, but take the values for these
          }
        }
      ]
    ]
  },
  'tab-advanced': {
    fieldsets: [
      [
        {
          type: 'text',
          label: trans('dialog.preferences.filename_generator'),
          model: 'newFileNamePattern',
          info: 'Variables: %id, %Y, %y, %M, %D, %W, %h, %m, %s, %X, %uuid4'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.new_file_dont_prompt'),
          model: 'newFileDontPrompt'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.debug'),
          model: 'debug'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.checkForBeta'),
          model: 'checkForBeta'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.use_native_appearance'),
          model: 'window.nativeAppearance'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.delete_on_fail'),
          model: 'system.deleteOnFail'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.watchdog_checkbox_label'),
          model: 'watchdog.activatePolling'
        },
        {
          type: 'number',
          label: trans('dialog.preferences.watchdog_threshold_label'),
          model: 'watchdog.stabilityThreshold'
        }
      ]
    ],
    fields: [
      // {
      //   type: 'list',
      //   label: 'Other files',
      //   listOptions: {},
      //   options: {
      //     '.pdf': 'PDF' // TODO
      //   }
      // },
    ]
  }
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
function modelToField (model, tree) {
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

export default {
  name: 'Preferences',
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
      model: {
        // Will be prepopulated afterwards
        userDictionaryContents: [],
        // This will return the full object
        ...global.config.get()
      },
      schema: SCHEMA['tab-general']
    }
  },
  computed: {
    windowTitle: function () {
      if (document.body.classList.contains('darwin')) {
        return this.tabs[this.currentTab].label
      } else {
        return 'Preferences' // TODO: Translate
      }
    },
    showTitlebar: function () {
      const isDarwin = document.body.classList.contains('darwin')
      return isDarwin || global.config.get('nativeAppearance') === false
    }
  },
  watch: {
    /**
     * Switches out the preferences tab based on the value of currentTab.
     */
    currentTab: function () {
      this.setTitle()

      // Switch out the schema to re-build the form, which makes it appear
      // as though we have switched tabs. Wicked!
      this.schema = SCHEMA[this.tabs[this.currentTab].controls]
    }
  },
  /**
   * Initialise values during component mount
   */
  mounted: function () {
    this.setTitle()
    this.populateDynamicValues()
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
        this.model = global.config.get()
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
    handleInput: function (prop, val) {
      // We do have an easy time here
      if (prop === 'userDictionaryContents') {
        // The user dictionary is not handled by the config
        const newDictionary = []
        for (const word of Object.values(val)) {
          newDictionary.push(word)
        }
        ipcRenderer.invoke('dictionary-provider', {
          command: 'set-user-dictionary',
          payload: newDictionary
        })
          .catch(err => console.error(err))
      } else {
        global.config.set(prop, val)
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
            const options = {}
            languages.map(lang => {
              options[lang] = trans('dialog.preferences.app_lang.' + lang)
              return null
            })
            field.options = options

            // Manually re-trigger a re-draw
            // this.$refs.form.renderForm()
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
          const field = modelToField('selectedDicts', SCHEMA['tab-spellchecking'])

          if (field !== undefined) {
            const options = {}
            dictionaries.map(dict => {
              options[dict] = trans('dialog.preferences.app_lang.' + dict)
              return null
            })
            field.options = options

            // this.$refs.form.renderForm()
          } else {
            console.error('Could not set available dictionaries')
          }
        })
        .catch(err => console.error(err))

      // Retrieve the user dictionary
      ipcRenderer.invoke('dictionary-provider', {
        command: 'get-user-dictionary'
      })
        .then((dictionary) => {
          const field = modelToField('userDictionaryContents', SCHEMA['tab-spellchecking'])

          if (field !== undefined) {
            field.options = {}
            for (const key in dictionary) {
              field.options[key] = dictionary[key]
            }
            // this.$refs.form.renderForm()
          } else {
            console.error('Could not set user dictionary')
          }
        })
        .catch(err => console.error(err))
    }
  }
}
</script>

<style lang="less">
div[role="tabpanel"] {
  overflow: auto; // Enable scrolling, if necessary
  padding: 10px;
  width: 100vw;
}
</style>
