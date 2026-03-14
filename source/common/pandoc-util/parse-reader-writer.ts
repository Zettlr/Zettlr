/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Reader and Writer property parsers
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains utility functions that can parse and
 *                  stringify Pandoc-style `reader` and `writer` properties. See
 *                  for a description of the exact syntax:
 *                  https://pandoc.org/MANUAL.html#extensions
 *
 * END HEADER
 */

import type { PandocExtension } from './pandoc-extensions'

/**
 * Represents a parsed `reader` or `writer` property string for Pandoc.
 */
export interface PandocReaderWriter {
  /**
   * The actual reader or writer property (e.g., `markdown`).
   */
  name: PandocReader|PandocWriter|string
  /**
   * Whether the reader is a custom lua reader.
   */
  isCustom: boolean
  /**
   * Extensions that have been explicitly enabled (e.g., `+raw_html`). NOTE that
   * this is separate from extensions that are by default enabled or disabled.
   */
  enabledExtensions: string[]
  /**
   * Extensions that have been explicitly disabled (e.g., `-raw_html`). NOTE
   * that this is separate from extensions that are by default enabled or
   * disabled.
   */
  disabledExtensions: string[]
}

/**
 * A list of all supported readers (input formats) for Pandoc.
 *
 * NOTE: Last date of updating: September 14, 2026.
 *
 * @var {string[]}
 */
export const pandocReaders = [
  'asciidoc', 'biblatex', 'bibtex', 'bits', 'commonmark_x', 'commonmark',
  'creole', 'csljson', 'csv', 'djot', 'docbook', 'docx', 'dokuwiki',
  'endnotexml', 'epub', 'fb2', 'gfm', 'haddock', 'html', 'ipynb', 'jats',
  'jira', 'json', 'latex', 'man', 'markdown_github', 'markdown_mmd',
  'markdown_phpextra', 'markdown_strict', 'markdown', 'mdoc', 'mediawiki',
  'muse', 'native', 'odt', 'opml', 'org', 'pod', 'pptx', 'ris', 'rst', 'rtf',
  't2t', 'textile', 'tikiwiki', 'tsv', 'twiki', 'typst', 'vimwiki', 'xlsx',
  'xml',
] as const
// "as const" allows us to construct a corresponding type from this list, see
// https://steveholgado.com/typescript-types-from-arrays/

export type PandocReader = typeof pandocReaders[number]

/**
 * A list of all supported writers (output formats) for Pandoc.
 *
 * NOTE: Last date of updating: September 14, 2026.
 *
 * @var {string[]}
 */
export const pandocWriters = [
  'ansi', 'asciidoc_legacy', 'asciidoc', 'asciidoctor', 'bbcode',
  'bbcode_fluxbb', 'bbcode_hubzilla', 'bbcode_phpbb', 'bbcode_steam',
  'bbcode_xenforo', 'beamer', 'biblatex', 'bibtex', 'chunkedhtml',
  'commonmark_x', 'commonmark', 'context', 'csljson', 'djot', 'docbook',
  'docbook4', 'doocbook5', 'docx', 'dokuwiki', 'dzslides', 'epub', 'epub2',
  'epub3', 'fb2', 'gfm', 'haddock', 'html', 'html4', 'html5', 'icml', 'ipynb',
  'jats_archiving', 'jats_articleauthoring', 'jats_publishing', 'jats', 'jira',
  'json', 'latex', 'man', 'markdown_github', 'markdown_mmd',
  'markdown_phpextra', 'markdown_strict', 'markdown', 'markua', 'mediawiki',
  'ms', 'muse', 'native', 'odt', 'opendocument', 'opml', 'org', 'pdf', 'plain',
  'pptx', 'revealjs', 'rst', 'rtf', 's5', 'slideous', 'slidy', 't2t', 'tei',
  'texinfo', 'textile', 'typst', 'vimdoc', 'xml', 'xwiki', 'zimwiki',
] as const

export type PandocWriter = typeof pandocWriters[number]

/**
 * Parses a Pandoc-style reader or writer property into its constituent parts.
 *
 * @param   {string}              readerWriter  The string, e.g., `markdown+ascii-ext`
 *
 * @return  {PandocReaderWriter}                The parsed info
 */
export function parseReaderWriter (readerWriter: string): PandocReaderWriter {
  const parsed: PandocReaderWriter = {
    name: readerWriter.split(/[+-]/g)[0],
    isCustom: false,
    enabledExtensions: [],
    disabledExtensions: []
  }

  if (parsed.name.endsWith('.lua')) {
    parsed.isCustom = true
  }

  for (const match of readerWriter.matchAll(/([+-][a-z0-9_]+)/gi)) {
    if (match[0].startsWith('+')) {
      parsed.enabledExtensions.push(match[0].substring(1))
    } else if (match[0].startsWith('-')) {
      parsed.disabledExtensions.push(match[0].substring(1))
    }
  }

  return parsed
}

/**
 * Constructs a Pandoc-style reader or writer property from a descriptor.
 *
 * @param   {PandocReaderWriter}  readerWriter  The descriptor
 *
 * @return  {string}                            The stringified version.
 */
export function readerWriterToString (readerWriter: PandocReaderWriter): string {
  return readerWriter.name
    + readerWriter.enabledExtensions.map(e => '+' + e).join('')
    + readerWriter.disabledExtensions.map(e => '-' + e).join('')
}

/**
 * Enables an extension for the provided reader/writer
 *
 * @param   {PandocReaderWriter}  readerWriter  The ReaderWriter.
 * @param   {PandocExtension}     extension     The extension to enable.
 *
 * @return  {void}                              Modifies in place.
 *
 */
export function enableExtension (readerWriter: PandocReaderWriter, extension: PandocExtension): void {
  const disabledIdx = readerWriter.disabledExtensions.indexOf(extension)
  const hasExt = readerWriter.enabledExtensions.includes(extension)
  if (disabledIdx > -1) {
    readerWriter.disabledExtensions.splice(disabledIdx, 1)
  }

  if (!hasExt) {
    readerWriter.enabledExtensions.push(extension)
  }
}

/**
 * Disables an extension for the provided reader/writer
 *
 * @param   {PandocReaderWriter}  readerWriter  The ReaderWriter.
 * @param   {PandocExtension}     extension     The extension to disable.
 *
 * @return  {void}                              Modifies in place.
 */
export function disableExtension (readerWriter: PandocReaderWriter, extension: PandocExtension): void {
  const enabledIdx = readerWriter.enabledExtensions.indexOf(extension)
  const hasExt = readerWriter.disabledExtensions.includes(extension)
  if (enabledIdx > -1) {
    readerWriter.enabledExtensions.splice(enabledIdx, 1)
  }

  if (!hasExt) {
    readerWriter.disabledExtensions.push(extension)
  }
}
