/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LanguageTool Statusbar Item
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file defines the LanguageTool statusbar item
 *
 * END HEADER
 */

import { type EditorState } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { resolveLangCode } from '@common/util/map-lang-code'
import { type StatusbarItem } from '.'
import { languageToolState, updateLTState } from '../linters/language-tool'
import { configField } from '../util/configuration'
import { forceLinting } from '@codemirror/lint'

/**
 * Displays the status of LanguageTool, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *i
 * @return  {StatusbarItem}         Returns the element, or null
 */
export function languageToolStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  // Determine if LanguageTool is currently running
  const config = state.field(configField, false)
  const ltState = state.field(languageToolState, false)

  if (config === undefined || !config.lintLanguageTool || ltState === undefined) {
    return null
  }

  // Three possibilities: It's currently running, there was an error, or
  // LT is idling
  if (ltState.running) {
    return {
      content: 'LanguageTool: <cds-icon shape="hourglass"></cds-icon>',
      allowHtml: true
    }
  }

  if (ltState.lastError !== undefined) {
    return {
      content: `LanguageTool: <cds-icon shape="exclamation-triangle"></cds-icon> (${ltState.lastError})`,
      allowHtml: true
    }
  }

  const displayLanguage = ltState.overrideLanguage !== 'auto'
    ? ltState.overrideLanguage
    : ltState.lastDetectedLanguage

  let lang = `(${displayLanguage})`
  const resolvedFlag = resolveLangCode(displayLanguage, 'flag')
  if (resolvedFlag !== displayLanguage) {
    lang = resolvedFlag
  }

  return {
    content: `LanguageTool: <cds-icon shape="check"></cds-icon> ${lang}`,
    title: resolveLangCode(displayLanguage),
    allowHtml: true,
    onClick (event) {
      // Necessary so that the context menu doesn't close again
      event.stopPropagation()
      // The languages can be a tad tricky: We want the info that we're
      // going to present to the user as concise as possible, but
      // sometimes we lack the information. For example, if we have two
      // language codes sv, and sv-SV, there may be a subtle difference
      // but it could be that we only have the translation for sv. In
      // that case, we need to add the language code to the duplicate
      // to de-duplicate the two entries.
      // We'll go as follows:

      // First, retrieve the translations for all our codes
      const resolved = ltState.supportedLanguages.map(code => {
        let flag = resolveLangCode(code, 'flag')
        if (flag === code) {
          flag = '🇺🇳' // United Nations flag
        }
        return {
          code,
          displayName: resolveLangCode(code, 'name'),
          flag,
          duplicate: false
        }
      })

      // Then, let's have a look if we have duplicates and switch their
      // flags correspondingly
      for (let i = 0; i < resolved.length; i++) {
        if (resolved[i].duplicate) {
          continue
        }

        const indexOfTwin = resolved.findIndex(e => {
          return e.displayName === resolved[i].displayName
        })

        if (indexOfTwin > -1 && indexOfTwin !== i) {
          resolved[i].duplicate = true
          resolved[indexOfTwin].duplicate = true
        }
      }

      // Now sort the items ascending (we can't sort the final items,
      // since they'd be sorted according to the flag emoji order)
      const coll = new Intl.Collator(
        [ window.config.get('appLang'), 'en' ],
        { sensitivity: 'base', usage: 'sort' }
      )

      resolved.sort((a, b) => {
        return coll.compare(a.displayName, b.displayName)
      })

      // At this point, we have the info we need. We only use the
      // displayName property except in situations where there are
      // duplicates, in which case we'll add the code in brackets
      // afterwards to de-duplicate the entries.
      const items: AnyMenuItem[] = resolved.map(entry => {
        const suffix = entry.duplicate ? ` (${entry.code})` : ''

        return {
          label: `${entry.flag} ${entry.displayName}${suffix}`,
          id: entry.code,
          type: 'checkbox',
          checked: ltState.overrideLanguage === entry.code
        }
      })

      // Insert the "auto" item on top
      items.unshift(
        {
          label: trans('Detect automatically'),
          id: 'auto',
          type: 'checkbox',
          checked: ltState.overrideLanguage === 'auto'
        },
        { type: 'separator' }
      )

      showPopupMenu({ x: event.clientX, y: event.clientY }, items, clickedID => {
        view.dispatch({ effects: updateLTState.of({ overrideLanguage: clickedID }) })
        forceLinting(view)
      })
    }
  }
}
