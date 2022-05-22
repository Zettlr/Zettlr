/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileParser
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Ery
 * License:         GNU GPL v3
 *
 * Description:     This utility function takes a file descriptor and some file
 *                  contents and then parses the contents into the descriptor.
 *
 * END HEADER
 */

import { getCodeBlockRE, getIDRE } from '@common/regular-expressions'
import countWords from '@common/util/count-words'
import extractYamlFrontmatter from '@common/util/extract-yaml-frontmatter'
import { MDFileDescriptor } from '@dts/main/fsal'
import extractBOM from './extract-bom'
import extractLinks from './extract-links'
import extractTags from './extract-tags'

// Here are all supported variables for Pandoc:
// https://pandoc.org/MANUAL.html#variables
// Below is a selection that Zettlr may use
const FRONTMATTER_VARS = [
  'title',
  'subtitle',
  'author',
  'date',
  'keywords',
  'tags',
  'lang',
  'bibliography'
]

/**
 * Parses some Markdown `content` into the properties of the `file` descriptor.
 *
 * @param  {string}  linkStart    The link start as indicated by the user
 * @param  {string}  linkEnd      The link end as indicated by the user
 * @param  {string}  idREPattern  The ID RegExp pattern as indicated by the user
 *
 * @returns {Function}            A parser that can then be used to parse files
 */
export default function getMarkdownFileParser (
  linkStart: string,
  linkEnd: string,
  idREPattern: string
): (file: MDFileDescriptor, content: string) => void {
  return function parseMarkdownFile (
    file: MDFileDescriptor,
    content: string
  ): void {
    // Prepare some necessary regular expressions and variables
    const idRE = getIDRE(idREPattern)
    const codeBlockRE = getCodeBlockRE(true)
    const inlineCodeRE = /`[^`]+`/g
    const h1HeadingRE = /^#{1}\s(.+)$/m

    let match

    // First of all, determine all the things that have nothing to do with any
    // Markdown contents.
    file.bom = extractBOM(content)
    file.linefeed = '\n'
    if (content.includes('\r\n')) file.linefeed = '\r\n'
    if (content.includes('\n\r')) file.linefeed = '\n\r'

    // Then prepare the file contents as we need it for most of the function:
    // Strip a potential YAML frontmatter, code, and any HTML comments.
    const extracted = extractYamlFrontmatter(content)
    const frontmatter = extracted.frontmatter

    const contentWithoutYAML = extracted.content
    const contentWithoutCode = contentWithoutYAML.replace(codeBlockRE, '').replace(inlineCodeRE, '')
    const plainMarkdown = contentWithoutCode.replace(/<!--.+?-->/gs, '') // Note the dotall flag

    // Finally, reset all those properties which we will extract from the file's
    // content so that they remain in their default if we don't find those in the
    // file.
    file.id = ''
    file.firstHeading = null
    file.tags = extractTags(content)
    file.links = extractLinks(content, linkStart, linkEnd)
    file.frontmatter = null

    // Search for the file's ID first in the file name, and then in the full contents.
    if ((match = idRE.exec(file.name)) == null) {
      while ((match = idRE.exec(content)) != null) {
        if (content.substr(match.index - linkStart.length, linkStart.length) !== linkStart) {
          // Found the first ID. Precedence should go to the first found.
          // Minor BUG: Takes IDs that are inside links but not literally make up for a link.
          break
        }
      }
    }

    if ((match != null) && (match[1].substr(-(linkEnd.length)) !== linkEnd)) {
      file.id = match[1]
    }

    // At this point, we don't need the full content anymore. The next parsing
    // steps rely on a Markdown string that is stripped of a potential YAML
    // frontmatter, any code -- inline and blocks -- as well as any comments.

    file.wordCount = countWords(plainMarkdown, false)
    file.charCount = countWords(plainMarkdown, true)

    const h1Match = h1HeadingRE.exec(contentWithoutYAML)
    if (h1Match !== null) {
      file.firstHeading = h1Match[1]
    }

    if (frontmatter !== null) {
      file.frontmatter = {}
      for (const [ key, value ] of Object.entries(frontmatter)) {
        // Only keep those values which Zettlr can understand
        if (FRONTMATTER_VARS.includes(key)) {
          file.frontmatter[key] = value
        }
      }
    } // END: We got a frontmatter
  }
}
