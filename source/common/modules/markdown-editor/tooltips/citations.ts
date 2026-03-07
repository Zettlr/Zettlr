/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        citationTooltips
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Implements a tooltip extension that displays tooltips with
 *                  pre-rendered citations upon hovering with the mouse over a
 *                  citation cluster in the text.
 *
 * END HEADER
 */
import { syntaxTree } from '@codemirror/language'
import { type EditorView, hoverTooltip, type Tooltip } from '@codemirror/view'
import { NODES, nodeToCiteItem } from '../parser/citation-parser'
import { configField } from '../util/configuration'
import { CITEPROC_MAIN_DB } from 'source/types/common/citeproc'
import type { CiteprocProviderIPCAPI } from 'source/app/service-providers/citeproc'
import { trans } from 'source/common/i18n-renderer'
import type { SyntaxNode } from '@lezer/common'

const ipcRenderer = window.ipc

/**
 * Fetches a bibliography for the provided citekeys from main
 *
 * @param   {string[]}  citekeys  The cite keys
 * @param   {string}    database  The library to use
 *
 * @return  {any}                 The bibliography
 */
async function fetchBibliography (citekeys: string[], database: string): Promise<[BibliographyOptions, string[]]> {
  return await ipcRenderer.invoke('citeproc-provider', {
    command: 'get-bibliography',
    payload: {
      database,
      citations: [...new Set(citekeys)]
    }
  } as CiteprocProviderIPCAPI)
}

/**
 * If the user currently hovers over a footnote, this function returns the specs
 * to create a tooltip with the footnote ref's contents, else null.
 */
function citationTooltip (view: EditorView, pos: number, side: 1 | -1): Tooltip|null {
  let nodeAt: SyntaxNode|null = syntaxTree(view.state).resolve(pos, side)

  while(nodeAt !== null && nodeAt.type.name !== NODES.CITATION) {
    nodeAt = nodeAt.parent
  }

  if (nodeAt === null || nodeAt.type.name !== NODES.CITATION) {
    return null
  }

  return {
    pos: nodeAt.from,
    end: nodeAt.to,
    above: true,
    create (view) {
      const dom = document.createElement('div')
      const content = document.createElement('div')
      content.textContent = trans('Loading…')
      dom.appendChild(content)

      const citation = nodeToCiteItem(nodeAt, view.state.sliceDoc())
      const config = view.state.field(configField).metadata.library
      const database = config === '' ? CITEPROC_MAIN_DB : config

      fetchBibliography(citation.items.map(item => item.id), database)
        .then(bibliography => {
          // Render bibliography into the content dom.
          const options = bibliography[0]

          content.innerHTML = [
            options.bibstart,
            ...bibliography[1],
            options.bibend
          ].join('\n')

          // Adjust styling depending on options
          const entries = content.querySelectorAll<HTMLDivElement>('.csl-entry')
          entries.forEach(entry => {
            entry.style.marginBottom = `${options.entryspacing}em`
            entry.style.lineHeight = `${options.linespacing}em`
            if (options.hangingindent) {
              entry.style.textIndent = '-1em'
              entry.style.paddingLeft = '1em'
            }
          })
        })
        .catch(err => {
          console.error(err)
          content.textContent = trans('Could not fetch bibliography for citation.')
        })

      return { dom }
    }
  }
}

export const citationTooltips = hoverTooltip(citationTooltip, { hoverTime: 100 })
