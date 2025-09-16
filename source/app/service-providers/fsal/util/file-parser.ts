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

import { countAll } from '@common/util/counter'
import type { MDFileDescriptor } from '@dts/common/fsal'
import extractBOM from './extract-bom'
import extractFileId from './extract-file-id'
import { parse as parseYAML } from 'yaml'
import {
  markdownToAST as md2ast,
  extractASTNodes
} from '@common/modules/markdown-utils'
import type {
  Heading,
  YAMLFrontmatter,
  ZettelkastenLink,
  ZettelkastenTag
} from '@common/modules/markdown-utils/markdown-ast'
import { extractLinefeed } from './extract-linefeed'
import { getAppServiceContainer, isAppServiceContainerReady } from '../../../app-service-container'

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
  idREPattern: string
): (file: MDFileDescriptor, content: string) => void {
  return function parseMarkdownFile (
    file: MDFileDescriptor,
    content: string
  ): void {
    // First of all, determine all the things that have nothing to do with any
    // Markdown contents.
    file.bom = extractBOM(content)
    file.linefeed = extractLinefeed(content)
    file.id = extractFileId(file.name, content, idREPattern)

    // Parse the file into our AST
    const ast = md2ast(content)

    const tags = extractASTNodes(ast, 'ZettelkastenTag') as ZettelkastenTag[]
    file.tags = tags.map(tag => tag.value.toLowerCase())

    const links = extractASTNodes(ast, 'ZettelkastenLink') as ZettelkastenLink[]
    file.links = links.map(link => link.target)

    file.firstHeading = null
    const headings = extractASTNodes(ast, 'Heading') as Heading[]
    const firstH1 = headings.find(h => h.level === 1)
    if (firstH1 !== undefined) {
      file.firstHeading = firstH1.content
    }

    const locale: string | undefined = isAppServiceContainerReady() ? getAppServiceContainer().config.get('appLang') : undefined

    const counts = countAll(ast, locale)

    file.wordCount = counts.words
    file.charCount = counts.chars

    // Reset frontmatter-related stuff
    file.yamlTitle = undefined
    file.frontmatter = null

    const frontmatterNodes = extractASTNodes(ast, 'YAMLFrontmatter') as YAMLFrontmatter[]
    if (frontmatterNodes.length === 0) {
      return // Nothing more to do
    }

    try {
      const frontmatter = parseYAML(frontmatterNodes[0].source)
      file.frontmatter = {}
      const isPrimitive = [ 'string', 'number', 'boolean' ].includes(typeof frontmatter)

      if (!isPrimitive && !Array.isArray(frontmatter)) {
        file.frontmatter = frontmatter
      }

      for (const [ key, value ] of Object.entries(frontmatter)) {
        // Only keep those values which Zettlr can understand
        if (FRONTMATTER_VARS.includes(key)) {
          file.frontmatter[key] = value
        }
      }

      // Extract the frontmatter title if applicable
      if ('title' in frontmatter && typeof frontmatter.title === 'string') {
        const title = frontmatter.title.trim()
        if (title !== '') {
          file.yamlTitle = title
        }
      }

      for (const prop of [ 'keywords', 'tags' ]) {
        if (frontmatter[prop] != null) {
          // The user can just write "keywords: something", in which case it won't be
          // an array, but a simple string (or even a number <.<). I am beginning to
          // understand why programmers despise the YAML-format.
          if (!Array.isArray(frontmatter[prop]) && typeof frontmatter[prop] === 'string') {
            const keys = frontmatter[prop].split(',')
            if (keys.length > 1) {
              // The user decided to split the tags by comma
              frontmatter[prop] = keys.map((tag: string) => tag.trim())
            } else {
              frontmatter[prop] = [frontmatter[prop]]
            }
          } else if (!Array.isArray(frontmatter[prop])) {
            // It's likely a Number or a Boolean
            frontmatter[prop] = [String(frontmatter[prop]).toString()]
          }

          // If the user decides to use just numbers for the keywords (e.g. #1997),
          // the YAML parser will obviously cast those to numbers, but we don't want
          // this, so forcefully cast everything to string (see issue #1433).
          const sanitizedKeywords: string[] = frontmatter[prop].map((tag: any) => String(tag).toString().toLowerCase())
          file.tags.push(...sanitizedKeywords.filter((each) => !file.tags.includes(each)))
        }
      }
    } catch (err: any) {
      // The frontmatter was invalid, but it's not of concern for us here
    }
  }
}
