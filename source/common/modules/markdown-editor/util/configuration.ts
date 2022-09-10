// Since configuration for CodeMirror mainly works via a pair of StateField and
// StateEffect, in order to reduce the amount of boiler plate, we define all
// configuration options relatively similar to Codemirror 5 as an object that
// we can query -- only now with full type support!

import { StateEffect, StateField } from '@codemirror/state'
import safeAssign from '@common/util/safe-assign'

export interface AutocorrectOptions {
  active: boolean
  magicQuotes: { primary: string, secondary: string }
  replacements: Array<{ key: string, value: string }>
}

export interface EditorConfiguration {
  autocorrect: AutocorrectOptions
  renderCitations: boolean
  renderIframes: boolean
  renderImages: boolean
  renderLinks: boolean
  renderMath: boolean
  renderTasks: boolean
  renderHeadings: boolean
  renderTables: boolean
  renderEmphasis: boolean
  imagePreviewWidth: number
  imagePreviewHeight: number
  linkStart: string
  linkEnd: string
  idRE: string
  idGen: string
  indentUnit: number
  indentWithTabs: boolean
  linkPreference: 'always'|'never'|'withID'
  linkFilenameOnly: boolean
  metadata: {
    path: string
    id: string
    library: string
  }
  boldFormatting: '**'|'__'
  italicFormatting: '*'|'_'
  citeStyle: 'in-text'|'in-text-suffix'|'regular'
  muteLines: boolean
  readabilityAlgorithm: 'dale-chall'|'gunning-fog'|'coleman-liau'|'automated-readability'
  readabilityMode: boolean
  typewriterMode: boolean
}

export function getDefaultConfig (): EditorConfiguration {
  return {
    autocorrect: {
      active: true,
      magicQuotes: {
        primary: '“…”', // TODO: Replace with default after testing
        secondary: '‘…’' // TODO: Replace with default after testing
      },
      replacements: []
    },
    renderCitations: true,
    renderIframes: true,
    renderImages: true,
    renderLinks: true,
    renderMath: true,
    renderTasks: true,
    renderHeadings: true,
    renderTables: true,
    renderEmphasis: true,
    imagePreviewWidth: 100,
    imagePreviewHeight: 100,
    linkStart: '[[',
    linkEnd: ']]',
    idRE: '(\\d{14})',
    idGen: '',
    indentUnit: 4,
    indentWithTabs: false,
    linkPreference: 'always',
    linkFilenameOnly: false,
    metadata: {
      path: '',
      id: '',
      library: '' // TODO
    },
    boldFormatting: '**',
    italicFormatting: '_',
    citeStyle: 'regular',
    muteLines: true,
    readabilityAlgorithm: 'dale-chall',
    readabilityMode: false,
    typewriterMode: false
  }
}

export type EditorConfigOptions = Partial<EditorConfiguration>

export const configUpdateEffect = StateEffect.define<EditorConfigOptions>()
export const configField = StateField.define<EditorConfiguration>({
  create (state) {
    return getDefaultConfig()
  },
  update (val, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(configUpdateEffect)) {
        const newConfig = safeAssign(effect.value, val)
        // Perform some housekeeping
        // Make sure the replacements are sorted longest-key-first
        newConfig.autocorrect.replacements.sort((a, b) => b.key.length - a.key.length)
        return newConfig
      }
    }
    return val
  }
})
