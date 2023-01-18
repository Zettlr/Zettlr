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
import '@cds/core/icon/register.js'

import CodeAltIcon from './icons/clarity-custom/code-alt.svg'
import FootnoteIcon from './icons/clarity-custom/footnote.svg'
import FileExtIcon from './icons/clarity-custom/file-ext.svg'
import IndentedViewListIcon from './icons/clarity-custom/indented-view-list.svg'
import RegExpIcon from './icons/clarity-custom/regexp.svg'
import GitIcon from './icons/clarity-custom/git.svg'

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
  ClarityIcons.addIcons(
    [ 'code-alt', CodeAltIcon ],
    [ 'file-ext', FileExtIcon ],
    [ 'indented-view-list', IndentedViewListIcon ],
    [ 'regexp', RegExpIcon ],
    [ 'footnote', FootnoteIcon ],
    [ 'git', GitIcon ]
  )

  console.log(ClarityIcons.registry)
}
