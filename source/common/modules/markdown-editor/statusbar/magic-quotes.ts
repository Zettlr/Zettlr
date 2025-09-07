/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        MagicQuotes Statusbar Item
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file defines the MagicQuotes statusbar item
 *
 * END HEADER
 */

import { type EditorState } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { resolveLangCode } from '@common/util/map-lang-code'
import { hasMarkdownExt } from '@common/util/file-extention-checks'
import { type StatusbarItem } from '.'
import { configField } from '../util/configuration'

/**
 * Contains all available MagicQuotes pairs (primary+secondary) as listed on the
 * Wikipedia, as always: https://de.wikipedia.org/wiki/Anf%C3%BChrungszeichen
 */
const MAGIC_QUOTES_PAIRS: Record<string, { primary: string, secondary: string }> = {
  af: { primary: '“…”', secondary: '‘…’' },
  ar: { primary: '«…»', secondary: '‹…›' },
  be: { primary: '«…»', secondary: '„…“' },
  bg: { primary: '„…“', secondary: '‚…‘' },
  ca: { primary: '«…»', secondary: '“…”' },
  cs: { primary: '„…“', secondary: '‚…‘' },
  da: { primary: '„…“', secondary: '‚…‘' },
  'de-CH': { primary: '«…»', secondary: '‹…›' },
  'de-DE': { primary: '„…“', secondary: '‚…‘' },
  el: { primary: '«…»', secondary: '“…”' },
  'en-GB': { primary: '‘…’', secondary: '“…”' },
  'en-US': { primary: '“…”', secondary: '‘…’' },
  eo: { primary: '“…”', secondary: "'…'" },
  es: { primary: '«…»', secondary: '“…”' },
  et: { primary: '„…”', secondary: '„…”' },
  eu: { primary: '«…»', secondary: '“…”' },
  'fi-FI': { primary: '”…”', secondary: '’…’' },
  'fr-FR': { primary: '« … »', secondary: '‹ … ›' },
  ga: { primary: '“…”', secondary: '‘…’' },
  he: { primary: '“…”', secondary: '«…»' },
  hr: { primary: '„…”', secondary: "'…'" },
  hu: { primary: '„…”', secondary: "'…'" },
  hy: { primary: '«…»', secondary: '„…“' },
  id: { primary: '”…”', secondary: '’…’' },
  is: { primary: '„…“', secondary: '‚…‘' },
  it: { primary: '«…»', secondary: "'…'" },
  'ja-JA': { primary: '「…」', secondary: '『…』' },
  ka: { primary: '„…“', secondary: "'…'" },
  ko: { primary: '“…”', secondary: '‘…’' },
  lt: { primary: '„…“', secondary: '‚…‘' },
  lv: { primary: '„…“', secondary: '‚…‘' },
  nl: { primary: '“…”', secondary: '‘…’' },
  no: { primary: '«…»', secondary: '‘…’' },
  pl: { primary: '„…”', secondary: "'…'" },
  'pt-BR': { primary: '“…”', secondary: '‘…’' },
  'pt-PT': { primary: '«…»', secondary: '“…”' },
  ro: { primary: '„…”', secondary: '«…»' },
  ru: { primary: '«…»', secondary: '„…“' },
  sk: { primary: '„…“', secondary: '‚…‘' },
  sl: { primary: '„…“', secondary: '‚…‘' },
  sq: { primary: '«…»', secondary: '‹…›' },
  sr: { primary: '„…”', secondary: '‚…’' },
  'sv-SV': { primary: '”…”', secondary: '’…’' },
  th: { primary: '“…”', secondary: '‘…’' },
  tr: { primary: '“…”', secondary: '‘…’' },
  uk: { primary: '«…»', secondary: '„…“' },
  wen: { primary: '„…“', secondary: '‚…‘' },
  'zh-CN': { primary: '“…”', secondary: '‘…’' },
  'zh-TW': { primary: '「…」', secondary: '『…』' }
}

/**
 * Displays the current mode of the MagicQuotes setting
 *
 * @param   {EditorState}    state  The editor state
 * @param   {EditorView}     view   The editor view
 *
 * @return  {StatusbarItem}         The statusbar item, or null
 */
export function magicQuotesStatus (state: EditorState, _view: EditorView): StatusbarItem|null {
  const config = state.field(configField, false)
  if (config === undefined) {
    return null
  }

  const { path } = config.metadata
  const { magicQuotes } = config.autocorrect
  const disabled = magicQuotes.primary === '"…"' && magicQuotes.secondary === "'…'"

  if (!hasMarkdownExt(path)) {
    return null
  }

  let currentSetting = 'custom'

  if (disabled) {
    currentSetting = 'disabled'
  } else {
    for (const key in MAGIC_QUOTES_PAIRS) {
      const { primary, secondary } = MAGIC_QUOTES_PAIRS[key]
      if (primary === magicQuotes.primary && secondary === magicQuotes.secondary) {
        currentSetting = key
        break
      }
    }
  }

  const labelStyle = 'border: 1px solid currentColor; border-radius: 4px; padding: 2px 5px;'
  const label = `<span style="${labelStyle}">${magicQuotes.primary}</span> <span style="${labelStyle}">${magicQuotes.secondary}</span>`
  return {
    content: label,
    allowHtml: true,
    title: 'MagicQuotes',
    onClick (event) {
      // Ensure the event doesn't get propagated to the DOM root where it would
      // be picked up by the context menu handler and closed again immediately.
      event.stopPropagation()
      const items: AnyMenuItem[] = [
        {
          type: 'checkbox',
          id: 'disabled',
          label: trans('Disabled'),
          checked: currentSetting === 'disabled'
        },
        {
          type: 'checkbox',
          id: 'custom',
          label: trans('Custom'),
          enabled: false, // You cannot select custom here on the statusbar
          checked: currentSetting === 'custom'
        },
        {
          type: 'separator'
        }
      ]

      const currentlySelected: string[] = []
      for (const key in MAGIC_QUOTES_PAIRS) {
        const { primary, secondary } = MAGIC_QUOTES_PAIRS[key]
        if (primary === magicQuotes.primary && secondary === magicQuotes.secondary) {
          currentlySelected.push(key)
        }
      }

      for (const key in MAGIC_QUOTES_PAIRS) {
        let flag = resolveLangCode(key, 'flag')
        if (flag === key) {
          flag = '🇺🇳' // United Nations flag
        }
        items.push({
          type: 'checkbox',
          id: key,
          label: flag + ' ' + resolveLangCode(key, 'name'),
          checked: currentlySelected.includes(key) // Every candidate is selected
        })
      }

      showPopupMenu({ x: event.clientX, y: event.clientY }, items, clickedID => {
        if (clickedID === 'custom') {
          console.error('How did you manage to click the disabled menu item?')
        } else if (clickedID === 'disabled') {
          // Disable MQ
          window.config.set('editor.autoCorrect.magicQuotes.primary', '"…"')
          window.config.set('editor.autoCorrect.magicQuotes.secondary', "'…'")
        } else {
          // Set them to whatever the user clicked
          const { primary, secondary } = MAGIC_QUOTES_PAIRS[clickedID]
          window.config.set('editor.autoCorrect.magicQuotes.primary', primary)
          window.config.set('editor.autoCorrect.magicQuotes.secondary', secondary)
        }
      })
    }
  }
}
