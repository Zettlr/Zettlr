/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Clarity icons helper
 * CVM-Role:        Utility
 * Maintainer:      Wieke Kanters
 * License:         GNU GPL v3
 *
 * Description:     This module loads the clarity library and adds custom icons.
 *
 * END HEADER
 */

import '@cds/core/icon/register.js'
import {
  essentialCollectionIcons,
  coreCollectionIcons,
  commerceCollectionIcons,
  mediaCollectionIcons,
  socialCollectionIcons,
  travelCollectionIcons,
  textEditCollectionIcons,
  technologyCollectionIcons,
  chartCollectionIcons,
  ClarityIcons
} from '@cds/core/icon'

import CodeAltIcon from './icons/clarity-custom/code-alt.svg'
import FootnoteIcon from './icons/clarity-custom/footnote.svg'
import FileExtIcon from './icons/clarity-custom/file-ext.svg'
import IndentedViewListIcon from './icons/clarity-custom/indented-view-list.svg'
import RegExpIcon from './icons/clarity-custom/regexp.svg'
import GitIcon from './icons/clarity-custom/git.svg'
import MarkdownIcon from './icons/clarity-custom/markdown.svg'

export default async function loadIcons (): Promise<void> {
  // I don't know why they decided to not export an "all" collection, but so be it.
  ClarityIcons.addIcons(
    ...essentialCollectionIcons,
    ...coreCollectionIcons,
    ...commerceCollectionIcons,
    ...mediaCollectionIcons,
    ...socialCollectionIcons,
    ...travelCollectionIcons,
    ...textEditCollectionIcons,
    ...technologyCollectionIcons,
    ...chartCollectionIcons
  )

  // NOTE: Unlike what VMWare writes on their homepage, adding just the string
  // of the SVG does NOT enable the icon. Rather, one has to actually provide
  // the correct object that can contain multiple SVG files depending on the
  // style. For example, each icon should have an "outline" property so that
  // it's shown by default. If it is also solid, one can add solid as well. Get
  // all available properties by console-logging the ClarityIcons.registry
  ClarityIcons.addIcons(
    [ 'code-alt', { outline: CodeAltIcon }],
    [ 'file-ext', { outline: FileExtIcon }],
    [ 'indented-view-list', { outline: IndentedViewListIcon }],
    [ 'regexp', { outline: RegExpIcon }],
    [ 'footnote', { outline: FootnoteIcon }],
    [ 'markdown', { outline: MarkdownIcon }],
    [ 'git', {
      outline: GitIcon,
      solid: GitIcon
    }]
  )
}
