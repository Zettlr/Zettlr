/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Pandoc Maps
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exports several maps that can be used to convert
 *                  the readers and writers supported by Pandoc to readable
 *                  strings and file extensions (and vice versa).
 *
 * END HEADER
 */

/**
 * This map maps supported Pandoc readers to readable strings that can be
 * displayed to the user in various places around the app.
 *
 * @var {{[reader: string]: string}}
 */
export const PANDOC_READERS: { [reader: string]: string } = {
  'commonmark': 'CommonMark',
  'commonmark_x': 'CommonMark +Ext',
  'creole': 'Creole 1.0',
  'csv': 'CSV',
  'docbook': 'DocBook',
  'docx': 'Word docx',
  'dokuwiki': 'DokuWiki',
  'epub': 'EPUB',
  'fb2': 'FictionBook2',
  'gfm': 'GitHub Markdown',
  'haddock': 'Haddock',
  'html': 'HTML',
  'ipynb': 'Jupyter Notebook',
  'jira': 'Jira/Confluence',
  'latex': 'LaTeX',
  'markdown': 'Markdown',
  'markdown_mmd': 'MultiMarkdown',
  'markdown_phpextra': 'PHP Markdown Extra',
  'markdown_strict': 'Gruber\'s Markdown',
  'mediawiki': 'MediaWiki',
  'man': 'roff man',
  'muse': 'Muse',
  'odt': 'OpenDocument Text',
  'opml': 'OPML',
  'org': 'Org mode',
  'rst': 'reStructuredText',
  'rtf': 'Rich Text Format',
  't2t': 'txt2tags',
  'textile': 'Textile',
  'tikiwiki': 'TikiWiki',
  'twiki': 'TWiki',
  'vimwiki': 'Vimwiki'
}

/**
 * This map maps supported Pandoc writers to readable strings that can be
 * displayed to the user in various places around the app.
 *
 * @var {{[writer: string]: string}}
 */
export const PANDOC_WRITERS: { [writer: string]: string } = {
  'asciidoc': 'AsciiDoc',
  'beamer': 'Beamer slides',
  'commonmark': 'CommonMark',
  'commonmark_x': 'CommonMark +Ext',
  'context': 'ConTeXt',
  'docbook': 'DocBook 4',
  'docbook4': 'DocBook 4',
  'docbook5': 'DocBook 5',
  'docx': 'Word docx',
  'dokuwiki': 'DokuWiki',
  'epub': 'EPUB v3',
  'epub3': 'EPUB v3',
  'epub2': 'EPUB v2',
  'fb2': 'FictionBook2',
  'gfm': 'GitHub Markdown',
  'haddock': 'Haddock',
  'html': 'HTML 5',
  'html5': 'HTML 5',
  'html4': 'XHTML 1.0 Transitional',
  'icml': 'InDesign ICML',
  'ipynb': 'Jupyter Notebook',
  'jira': 'Jira/Confluence',
  'latex': 'LaTeX',
  'man': 'roff man',
  'markdown': 'Markdown',
  'markdown_mmd': 'MultiMarkdown',
  'markdown_phpextra': 'PHP Markdown Extra',
  'markdown_strict': 'Gruber\'s Markdown',
  'markua': 'Markua',
  'mediawiki': 'MediaWiki',
  'ms': 'roff ms',
  'muse': 'Muse',
  'odt': 'OpenDocument Text',
  'org': 'Org mode',
  'pdf': 'PDF',
  'plain': 'Plain Text',
  'pptx': 'PowerPoint',
  'rst': 'reStructuredText',
  'rtf': 'Rich Text Format',
  'texinfo': 'GNU Texinfo',
  'textile': 'Textile',
  'slideous': 'Slideous',
  'slidy': 'Slidy',
  'dzslides': 'DZSlides',
  'revealjs': 'reveal.js',
  's5': 'S5 Slides',
  'tei': 'TEI Simple',
  'xwiki': 'XWiki',
  'zimwiki': 'ZimWiki'
}

/**
 * This array contains all readers/writers that correspond to internally
 * supported file types (i.e. those that the main editor can display)
 *
 * @var {string[]}
 */
export const SUPPORTED_READERS = [
  'commonmark',
  'commonmark_x',
  'gfm',
  'latex',
  'markdown',
  'markdown_mmd',
  'markdown_phpextra',
  'markdown_strict'
]

/**
 * This map maps writers to their most common extension
 *
 * @var {{[writer: string]: string }}
 */
export const WRITER2EXT: { [writer: string]: string } = {
  'asciidoc': 'adoc', // See https://asciidoctor.org/docs/asciidoc-recommended-practices/#document-extension
  'beamer': 'pdf',
  'commonmark': 'md',
  'commonmark_x': 'md',
  'context': 'tex',
  'docbook': 'dbk', // See https://en.wikipedia.org/wiki/DocBook
  'docbook4': 'dbk',
  'docbook5': 'dbk',
  'docx': 'docx',
  'dokuwiki': 'dokuwiki', // There is not really a file extension
  'epub': 'epub',
  'epub3': 'epub',
  'epub2': 'epub',
  'fb2': 'db2',
  'gfm': 'md',
  'haddock': 'hs', // It's basically Haskell source code
  'html': 'html',
  'html5': 'html',
  'html4': 'html',
  'icml': 'icml',
  'ipynb': 'ipynb',
  'jira': 'jira', // Again, not really a file extension
  'latex': 'tex',
  'man': 'roff',
  'markdown': 'md',
  'markdown_mmd': 'md',
  'markdown_phpextra': 'md',
  'markdown_strict': 'md',
  'markua': 'md',
  'mediawiki': 'mediawiki', // Again, not really a file extension
  'ms': 'ms',
  'muse': 'muse',
  'odt': 'odt',
  'org': 'org',
  'pdf': 'pdf',
  'plain': 'txt',
  'pptx': 'pptx',
  'rst': 'rst',
  'rtf': 'rtf',
  'texinfo': 'texi', // See https://filext.com/file-extension/TEXI
  'textile': 'textile',
  'slideous': 'slideous.html',
  'slidy': 'slidy.html',
  'dzslides': 'dzslides.html',
  'revealjs': 'reveal.js.html',
  's5': 's5.html',
  'tei': 'odd', // See https://github.com/TEIC/TEI-Simple
  'xwiki': 'xwiki', // Same as all the other Wiki markups
  'zimwiki': 'zimwiki' // Dito
}

/**
 * This map maps extensions that one can import into Zettlr to the corresponding
 * writers. Each extension can be supported by more than one reader.
 *
 * @var {{[extension: string]: string[]}}
 */
export const EXT2READER: {[extension: string]: string[]} = {
  'md': [ 'commonmark', 'commonmark_x', 'markdown', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'gfm' ],
  'markdown': [ 'commonmark', 'commonmark_x', 'markdown', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'gfm' ],
  'rmd': [ 'commonmark', 'commonmark_x', 'markdown', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'gfm' ],
  'mdx': [ 'commonmark', 'commonmark_x', 'markdown', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'gfm' ],
  'docbook': ['docbook'],
  'docx': ['docx'],
  'doc': ['docx'],
  'epub': ['epub'],
  'haddock': ['haddock'],
  'hs': ['haddock'],
  'html': ['html'],
  'htm': ['html'],
  'tex': ['latex'],
  'latex': ['latex'],
  'muse': ['muse'],
  'odt': ['odt'],
  'opml': ['opml'],
  'org': ['org'],
  'rst': ['rst'],
  'rtf': ['rtf'],
  't2t': ['t2t'],
  'textile': ['textile'],
  'wiki': [ 'vimwiki', 'twiki', 'tikiwiki', 'mediawiki', 'dokuwiki' ],
  'roff': ['man'],
  'ms': ['ms'],
  // Currently not available as import extensions explicitly, but users can
  // choose these by using the "All files" filter
  'csv': ['csv'],
  'fb2': ['fb2'],
  'ipynb': ['ipynb'],
  'jira': ['jira']
}
