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
import { toDoubleQuotes } from '../commands/transforms/to-double-quotes'
import { toSentenceCase } from '../commands/transforms/to-sentence-case'
import { toTitleCase } from '../commands/transforms/to-title-case'
import { configField } from '../util/configuration'

export function getTransformSubmenu (view: EditorView): SubmenuItem {
  return {
    label: trans('Transform'),
    id: 'submenuTransform',
    type: 'submenu',
    submenu: [
      {
        label: trans('Zap gremlins'),
        type: 'normal',
        action () { zapGremlins(view) }
      },
      {
        label: trans('Strip duplicate spaces'),
        type: 'normal',
        action () { stripDuplicateSpaces(view) }
      },
      {
        label: trans('Italics to quotes'),
        type: 'normal',
        action () { console.log('Running italics to quotes'); italicsToQuotes(view) }
      },
      {
        label: trans('Quotes to italics'),
        type: 'normal',
        action () { quotesToItalics(view.state.field(configField).italicFormatting)(view) }
      },
      {
        label: trans('Remove line breaks'),
        type: 'normal',
        action () { removeLineBreaks(view) }
      },
      {
        type: 'separator'
      },
      {
        label: trans('Straighten quotes'),
        type: 'normal',
        action () { straightenQuotes(view) }
      },
      {
        label: trans('Ensure double quotes'),
        type: 'normal',
        action () { toDoubleQuotes(view) }
      },
      {
        label: trans('Double quotes to single'),
        type: 'normal',
        action () { doubleQuotesToSingle(view) }
      },
      {
        label: trans('Single quotes to double'),
        type: 'normal',
        action () { singleQuotesToDouble(view) }
      },
      {
        type: 'separator'
      },
      {
        label: trans('Emdash — Add spaces around'),
        type: 'normal',
        action () { addSpacesAroundEmdashes(view) }
      },
      {
        label: trans('Emdash — Remove spaces around'),
        type: 'normal',
        action () { removeSpacesAroundEmdashes(view) }
      },
      {
        type: 'separator'
      },
      {
        label: trans('To sentence case'),
        type: 'normal',
        action () { toSentenceCase(String(window.config.get('appLang')))(view) }
      },
      {
        label: trans('To title case'),
        type: 'normal',
        action () { toTitleCase(String(window.config.get('appLang')))(view) }
      }
    ]
  }
}
