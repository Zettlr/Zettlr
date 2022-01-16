/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        md2html function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     md2html converts a Markdown string to valid HTML
 *
 * END HEADER
 */

import { IpcRenderer } from 'electron'
import { Converter, ShowdownExtension } from 'showdown'
import extractCitations from './extract-citations'

const ipcRenderer = (typeof window !== 'undefined') ? (window as any).ipc as IpcRenderer : undefined

// Spin up a showdown converter which can be used across the app
const showdownConverter = new Converter({
  strikethrough: true,
  tables: true,
  omitExtraWLInCodeBlocks: true,
  tasklists: true,
  requireSpaceBeforeHeadingText: true,
  ghMentions: false,
  extensions: [showdownCitations]
})

showdownConverter.setFlavor('github')

/**
 * md2html converts the given Markdown to HTML, optionally making any link
 * "renderer" safe, which means that those links will be opened using
 * electron shell to prevent them overriding the content of the window.
 *
 * @param   {string}   markdown                   The input Markdown text
 *
 * @return  {string}                              The final HTML string
 */
export default function md2html (markdown: string): string {
  return showdownConverter.makeHtml(markdown)
}

/**
 * Extension for showdown.js which parses citations using our citeproc provider.
 *
 * @return  {any}  The showdown extension
 */
function showdownCitations (): ShowdownExtension {
  return {
    type: 'lang',
    filter: function (text, converter, options) {
      // First, extract all citations ...
      const allCitations = extractCitations(text)
      // ... and retrieve the rendered ones from the citeproc provider
      const finalCitations = allCitations.map((elem) => {
        if (ipcRenderer !== undefined) {
          // We are in the renderer process
          return ipcRenderer.sendSync('citation-renderer', {
            command: 'get-citation-sync',
            payload: { citations: elem.citations, composite: elem.composite }
          })
        } else {
          // We are in the main process and can immediately access the provider
          return global.citeproc.getCitation(elem.citations, elem.composite)
        }
      })

      // Now get the citations to be replaced
      const toBeReplaced = allCitations.map(citation => {
        return text.substring(citation.from, citation.to - citation.from)
      })

      // Finally, replace every citation with its designated replacement
      for (let i = 0; i < allCitations.length; i++) {
        text = text.replace(toBeReplaced[i], finalCitations[i])
      }

      // Now return the text
      return text
    }
  }
}
