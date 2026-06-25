/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getTransformMenu
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function returns a shim submenu with all transformations
 *
 * END HEADER
 */

import { type EditorView } from '@codemirror/view'
import { type SubmenuItem } from '../../window-register/application-menu-helper'
import { trans } from 'source/common/i18n-renderer'
import { zapGremlins } from '../commands/transforms/zap-gremlins'
import { stripDuplicateSpaces } from '../commands/transforms/strip-duplicate-spaces'
import { italicsToQuotes } from '../commands/transforms/italics-to-quotes'
import { addSpacesAroundEmdashes } from '../commands/transforms/add-spaces-around-emdashes'
import { doubleQuotesToSingle } from '../commands/transforms/double-quotes-to-single-quotes'
import { quotesToItalics } from '../commands/transforms/quotes-to-italics'
import { removeLineBreaks } from '../commands/transforms/remove-line-breaks'
import { removeSpacesAroundEmdashes } from '../commands/transforms/remove-spaces-around-emdashes'
import { singleQuotesToDouble } from '../commands/transforms/single-quotes-to-double-quotes'
import { straightenQuotes } from '../commands/transforms/straighten-quotes'
import { curlQuotes } from '../commands/transforms/curl-quotes'
import { toDoubleQuotes } from '../commands/transforms/to-double-quotes'
import { toSentenceCase } from '../commands/transforms/to-sentence-case'
import { toTitleCase } from '../commands/transforms/to-title-case'
import { configField } from '../util/configuration'
import { getCustomShortcut, type EditorShortcutName } from '../keymaps/shortcuts'
import { cmShortcutToElectron } from 'source/common/util/cm-shortcut-to-electron'

export function getTransformSubmenu (view: EditorView): SubmenuItem {
  const config = view.state.field(configField, false)
  
  const customShortcutMap = config?.shortcuts ?? []
  const sc = (name: EditorShortcutName) => {
    return getCustomShortcut(name, customShortcutMap)
  }

  return {
    label: trans('Transform'),
    id: 'submenuTransform',
    type: 'submenu',
    submenu: [
      {
        label: trans('Zap gremlins'),
        accelerator: cmShortcutToElectron(sc('tr-zap-gremlins')),
        type: 'normal',
        action () { zapGremlins(view) }
      },
      {
        label: trans('Strip duplicate spaces'),
        accelerator: cmShortcutToElectron(sc('tr-strip-duplicate-spaces')),
        type: 'normal',
        action () { stripDuplicateSpaces(view) }
      },
      {
        label: trans('Italics to quotes'),
        accelerator: cmShortcutToElectron(sc('tr-italics-to-quotes')),
        type: 'normal',
        action () { italicsToQuotes(view) }
      },
      {
        label: trans('Quotes to italics'),
        accelerator: cmShortcutToElectron(sc('tr-quotes-to-italics')),
        type: 'normal',
        action () { quotesToItalics(view.state.field(configField).italicFormatting)(view) }
      },
      {
        label: trans('Remove line breaks'),
        accelerator: cmShortcutToElectron(sc('tr-remove-line-breaks')),
        type: 'normal',
        action () { removeLineBreaks(view) }
      },
      {
        type: 'separator'
      },
      {
        label: trans('Straighten quotes'),
        accelerator: cmShortcutToElectron(sc('tr-straighten-quotes')),
        type: 'normal',
        action () { straightenQuotes(view) }
      },
      {
        label: trans('Convert quotes to Magic Quotes'),
        accelerator: cmShortcutToElectron(sc('tr-quotes-to-magic')),
        type: 'normal',
        action () {
          // TODO: I just realized what this is. Screams for an improvement.
          const { magicQuotes } = view.state.field(configField).autocorrect
          const primary = magicQuotes.primary.split('\u2026') as [string, string]
          const secondary = magicQuotes.secondary.split('\u2026') as [string, string]
          curlQuotes(primary, secondary)(view)
        }
      },
      {
        label: trans('Ensure double quotes'),
        accelerator: cmShortcutToElectron(sc('tr-ensure-double-quotes')),
        type: 'normal',
        action () { toDoubleQuotes(view) }
      },
      {
        label: trans('Double quotes to single'),
        accelerator: cmShortcutToElectron(sc('tr-double-quotes-to-single')),
        type: 'normal',
        action () { doubleQuotesToSingle(view) }
      },
      {
        label: trans('Single quotes to double'),
        accelerator: cmShortcutToElectron(sc('tr-single-quotes-to-double')),
        type: 'normal',
        action () { singleQuotesToDouble(view) }
      },
      {
        type: 'separator'
      },
      {
        label: trans('Emdash — Add spaces around'),
        accelerator: cmShortcutToElectron(sc('tr-emdash-add-spaces')),
        type: 'normal',
        action () { addSpacesAroundEmdashes(view) }
      },
      {
        label: trans('Emdash — Remove spaces around'),
        accelerator: cmShortcutToElectron(sc('tr-emdash-remove-spaces')),
        type: 'normal',
        action () { removeSpacesAroundEmdashes(view) }
      },
      {
        type: 'separator'
      },
      {
        label: trans('To sentence case'),
        accelerator: cmShortcutToElectron(sc('tr-sentence-case')),
        type: 'normal',
        action () { toSentenceCase(String(window.config.get('appLang')))(view) }
      },
      {
        label: trans('To title case'),
        accelerator: cmShortcutToElectron(sc('tr-title-case')),
        type: 'normal',
        action () { toTitleCase(String(window.config.get('appLang')))(view) }
      }
    ]
  }
}
