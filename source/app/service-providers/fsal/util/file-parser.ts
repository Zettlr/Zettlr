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

import { countChars, countWords } from '@common/util/counter'
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
    file.linefeed = '\n'
    if (content.includes('\r\n')) file.linefeed = '\r\n'
    if (content.includes('\n\r')) file.linefeed = '\n\r'
    file.id = extractFileId(file.name, content, idREPattern)

    // Parse the file into our AST
    const ast = md2ast(content)

    const tags = extractASTNodes(ast, 'ZettelkastenTag') as ZettelkastenTag[]
    file.tags = tags.map(tag => tag.value.substring(1))

    const links = extractASTNodes(ast, 'ZettelkastenLink') as ZettelkastenLink[]
    file.links = links.map(link => link.value)

    const headings = extractASTNodes(ast, 'Heading') as Heading[]
    const firstH1 = headings.find(h => h.level === 1)
    file.firstHeading = firstH1 !== undefined ? firstH1.value.value : null

    file.wordCount = countWords(ast)
    file.charCount = countChars(ast)

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

      const tagsFromFrontmatter = []
      if (file.frontmatter.tags) {
        tagsFromFrontmatter.push(...file.frontmatter.tags)
      }
      if (file.frontmatter.keywords) {
        tagsFromFrontmatter.push(...file.frontmatter.keywords)
      }
      if (tagsFromFrontmatter.length > 0) {
        for (let i = 0; i < tagsFromFrontmatter.length; i++) {
          if (!file.tags.includes(tagsFromFrontmatter[i])) {
            file.tags.push(tagsFromFrontmatter[i])
          }
        }
      }
    } catch (err: any) {
      // The frontmatter was invalid, but it's not of concern for us here
    }
  }
}
