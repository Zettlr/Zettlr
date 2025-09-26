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

/**
 * Represents a parsed `reader` or `writer` property string for Pandoc.
 */
export interface PandocReaderWriter {
  /**
   * The actual reader or writer property (e.g., `markdown`).
   */
  name: PandocReader|PandocWriter|string
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

export const pandocReaders = [
  'bibtex', 'biblatex', 'bits', 'commonmark', 'commonmark_x',
  'creole', 'csljson', 'csv', 'tsv', 'djot', 'docbook', 'docx', 'dokuwiki',
  'endnotexml', 'epub', 'fb2', 'gfm', 'haddock', 'html', 'ipynb', 'jats', 'jira',
  'json', 'latex', 'markdown', 'markdown_mmd', 'markdown_phpextra',
  'markdown_strict', 'mediawiki', 'man', 'muse', 'native', 'odt', 'opml', 'org',
  'ris', 'rtf', 'rst', 't2t', 'textile', 'tikiwiki', 'twiki', 'typst', 'vimwiki',
  'markdown_github'
] as const
// "as const" allows us to construct a corresponding type from this list, see
// https://steveholgado.com/typescript-types-from-arrays/

export type PandocReader = typeof pandocReaders[number]

export const pandocWriters = [
  'asciidoc', 'asciidoc_legacy', 'asciidoctor', 'beamer', 'bibtex', 'biblatex',
  'chunkedhtml', 'commonmark', 'commonmark_x', 'context', 'csljson', 'djot',
  'docbook', 'docbook4', 'doocbook5', 'docx', 'dokuwiki', 'epub', 'epub3',
  'epub2', 'fb2', 'gfm', 'haddock', 'html', 'html5', 'html4', 'icml', 'ipynb',
  'jats_archiving', 'jats_articleauthoring', 'jats_publishing', 'jats', 'jira',
  'json', 'latex', 'man', 'markdown', 'markdown_mmd', 'markdown_phpextra',
  'markdown_strict', 'markua', 'mediawiki', 'ms', 'muse', 'native', 'odt',
  'opml', 'opendocument', 'org', 'pdf', 'plain', 'pptx', 'rst', 'rtf',
  'texinfo', 'textile', 'slideous', 'slidy', 'dzslides', 'revealjs', 's5',
  'tei', 'typst', 'xwiki', 'zimwiki', 'markdown_github'
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
  if (!readerWriter.includes('-') && !readerWriter.includes('+')) {
    return { name: readerWriter, enabledExtensions: [], disabledExtensions: [] }
  }

  const [ name, ...extensions ] = readerWriter.split(/[+-]/g)
  const enabledExtensions = extensions
    .filter(e => e.startsWith('+'))
    .map(e => e.slice(1))
  const disabledExtensions = extensions
    .filter(e => e.startsWith('-'))
    .map(e => e.slice(1))

  return { name, enabledExtensions, disabledExtensions }
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
 * @param   {string}              extension     The extension to enable.
 *
 * @return  {void}                              Modifies in place.
 */
export function enableExtension (readerWriter: PandocReaderWriter, extension: string): void {
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
 * @param   {string}              extension     The extension to disable.
 *
 * @return  {void}                              Modifies in place.
 */
export function disableExtension (readerWriter: PandocReaderWriter, extension: string): void {
  const enabledIdx = readerWriter.enabledExtensions.indexOf(extension)
  const hasExt = readerWriter.disabledExtensions.includes(extension)
  if (enabledIdx > -1) {
    readerWriter.enabledExtensions.splice(enabledIdx, 1)
  }

  if (!hasExt) {
    readerWriter.disabledExtensions.push(extension)
  }
}
