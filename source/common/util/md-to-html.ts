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

import { Converter, ShowdownExtension } from 'showdown'
import extractCitations from './extract-citations'

type CitationCallback = (items: CiteItem[], composite: boolean) => string|undefined

/**
 * md2html converts the given Markdown to HTML, optionally making any link
 * "renderer" safe, which means that those links will be opened using
 * electron shell to prevent them overriding the content of the window.
 *
 * @param   {string}   markdown                   The input Markdown text
 *
 * @return  {string}                              The final HTML string
 */
export function getConverter (citationCallback?: CitationCallback): (markdown: string) => string {
  // If the caller did not provide a citation callback we'll create a polyfill
  // that will simply return an empty string, effectively stripping any citations
  if (citationCallback === undefined) {
    citationCallback = function (items, composite) { return '' }
  }

  // Spin up a showdown converter
  const showdownConverter = new Converter({
    strikethrough: true,
    tables: true,
    omitExtraWLInCodeBlocks: true,
    tasklists: true,
    requireSpaceBeforeHeadingText: true,
    ghMentions: false,
    extensions: [makeCitationPlugin(citationCallback)]
  })

  showdownConverter.setFlavor('github')

  return function (markdown: string): string {
    return showdownConverter.makeHtml(markdown)
  }
}

/**
 * Extension for showdown.js which parses citations using our citeproc provider.
 *
 * @return  {any}  The showdown extension
 */
function makeCitationPlugin (citationCallback: CitationCallback): () => ShowdownExtension {
  return function (): ShowdownExtension {
    return {
      type: 'lang',
      filter: function (text, converter, options) {
        // First, extract all citations ...
        const allCitations = extractCitations(text)
        // ... and retrieve the rendered ones from the citeproc provider
        const finalCitations = allCitations.map((elem) => {
          return citationCallback(elem.citations, elem.composite) ?? text
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
}
