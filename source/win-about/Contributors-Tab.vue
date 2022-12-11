<template>
  <div id="contributors-tab">
    <div v-for="(translation, idx) in translationMetadata" v-bind:key="idx">
      <h3>
        {{ getLocalisedTranslationName(translation.bcp47) }}
        <small>
          last updated {{ formattedDate(translation.updated_at) }}
        </small>
      </h3>
      <ul>
        <li v-for="author in translation.authors" v-bind:key="author.name">
          {{ author.name }}
          <template v-if="author.email">
            (<a v-bind:href="linkifyEmail(author.email)">{{ author.email }}</a>)
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ContributorsTab
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The contributors tab inside the about window
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import formatDate from '@common/util/format-date'
import { defineComponent } from 'vue'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'ContributorsTab',
  data: function () {
    return {
      translationMetadata: [] as any[]
    }
  },
  computed: {
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
  created: function () {
    // Retrieve the translation metadata
    ipcRenderer.invoke('translation-provider', { command: 'get-translation-metadata' })
      .then(data => {
        this.translationMetadata = data

        // Before actually returning, make sure to resolve the author names which
        // may contain email addresses.
        for (const translation of this.translationMetadata) {
          translation.authors = translation.authors.map((author: string) => {
            const match = /(.+)<(.+)>/.exec(author)
            if (match !== null) {
              return {
                name: match[1].trim(),
                email: match[2].trim()
              }
            } else {
              return {
                name: author
              }
            }
          })
        }
      })
      .catch(e => console.error(e))
  },
  methods: {
    getLocalisedTranslationName: function (bcp47: string) {
      return this.langMap[bcp47] ?? bcp47
    },
    formattedDate: function (dateString: string) {
      return formatDate(new Date(dateString), window.config.get('appLang'))
    },
    linkifyEmail: function (email: string) {
      return `mailto:${email}`
    }
  }
})
</script>

<style lang="less">
div#contributors-tab * {
  margin: revert;
}
</style>
