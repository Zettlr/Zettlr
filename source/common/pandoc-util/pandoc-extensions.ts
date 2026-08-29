/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Information on existing Pandoc extensions
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains the names, default configuration, and
 *                  descriptions of every single extension supported by Pandoc,
 *                  and which readers or writers support them. Taken directly
 *                  from the Pandoc manual in about a weekend's worth of copy-
 *                  paste action.
 *
 * END HEADER
 */

import type { PandocReader, PandocWriter } from './parse-reader-writer'

export const extensionDescriptions: Record<PandocExtension, string> = {
  smart: 'Interpret straight quotes as curly quotes, --- as em-dashes, -- as en-dashes, and ... as ellipses. Nonbreaking spaces are inserted after certain abbreviations, such as “Mr.”',
  auto_identifiers: 'A heading without an explicitly specified identifier will be automatically assigned a unique identifier based on the heading text.',
  ascii_identifiers: 'Causes the identifiers produced by auto_identifiers to be pure ASCII. Accents are stripped off of accented Latin letters, and non-Latin letters are omitted.',
  gfm_auto_identifiers: 'Changes the algorithm used by auto_identifiers to conform to GitHub’s method. Spaces are converted to dashes (-), uppercase characters to lowercase characters, and punctuation characters other than - and _ are removed. Emojis are replaced by their names.',
  tex_math_dollars: 'Anything between two $ characters will be treated as TeX math. The opening $ must have a non-space character immediately to its right, while the closing $ must have a non-space character immediately to its left, and must not be followed immediately by a digit.',
  tex_math_gfm: 'Supports two GitHub-specific formats for math.',
  tex_math_single_backslash: 'Causes anything between \( and \) to be interpreted as inline TeX math, and anything between \[ and \] to be interpreted as display TeX math. Note: a drawback of this extension is that it precludes escaping ( and [.',
  tex_math_double_backslash: 'Causes anything between \\( and \\) to be interpreted as inline TeX math, and anything between \\[ and \\] to be interpreted as display TeX math.',
  raw_html: 'raw_html allows HTML elements which are not representable in pandoc’s AST to be parsed as raw HTML. By default, this is disabled for HTML input.',
  raw_tex: 'raw_tex allows raw LaTeX, TeX, and ConTeXt to be included in a document.',
  native_divs: 'native_divs causes HTML div elements to be parsed as native pandoc Div blocks. If you want them to be parsed as raw HTML, use -f html-native_divs+raw_html.',
  native_spans: 'native_spans causes HTML span elements to be parsed as native pandoc Span inlines. If you want them to be parsed as raw HTML, use -f html-native_spans+raw_html. If you want to drop all divs and spans when converting HTML to Markdown, you can use pandoc -f html-native_divs-native_spans -t markdown.',
  literate_haskell: 'Treat the document as literate Haskell source.',
  empty_paragraphs: 'Allows empty paragraphs. By default empty paragraphs are omitted.',
  native_numbering: 'Enables native numbering of figures and tables. Enumeration starts at 1.',
  xrefs_name: 'Links to headings, figures and tables inside the document are substituted with cross-references that will use the name or caption of the referenced item. The original link text is replaced once the generated document is refreshed. This extension can be combined with xrefs_number in which case numbers will appear before the name. Text in cross-references is only made consistent with the referenced item once the document has been refreshed.',
  xrefs_number: 'Links to headings, figures and tables inside the document are substituted with cross-references that will use the number of the referenced item. The original link text is discarded. This extension can be combined with xrefs_name in which case the name or caption numbers will appear after the number. For the xrefs_number to be useful heading numbers must be enabled in the generated document, also table and figure captions must be enabled using for example the native_numbering extension. Numbers in cross-references are only visible in the final document once it has been refreshed.',
  styles: 'When converting from docx, read all docx styles as divs (for paragraph styles) and spans (for character styles) regardless of whether pandoc understands the meaning of these styles. This can be used with docx custom styles. Disabled by default.',
  amuse: 'In the muse input format, this enables Text::Amuse extensions to Emacs Muse markup.',
  raw_markdown: 'In the ipynb input format, this causes Markdown cells to be included as raw Markdown blocks (allowing lossless round-tripping) rather than being parsed. Use this only when you are targeting ipynb or a Markdown-based output format.',
  citations: 'When the citations extension is enabled in org, org-cite and org-ref style citations will be parsed as native pandoc citations. When citations is enabled in docx, citations inserted by Zotero or Mendeley or EndNote plugins will be parsed as native pandoc citations. (Otherwise, the formatted citations generated by the bibliographic software will be parsed as regular text.)',
  fancy_lists: 'Some aspects of Pandoc’s Markdown fancy lists are also accepted in org input, mimicking the option org-list-allow-alphabetical in Emacs. As in Org Mode, enabling this extension allows lowercase and uppercase alphabetical markers for ordered lists to be parsed in addition to arabic ones. Note that for Org, this does not include roman numerals or the # placeholder that are enabled by the extension in Pandoc’s Markdown.',
  element_citations: 'In the jats output formats, this causes reference items to be replaced with <element-citation> elements. These elements are not influenced by CSL styles, but all information on the item is included in tags.',
  ntb: 'In the context output format this enables the use of Natural Tables (TABLE) instead of the default Extreme Tables (xtables). Natural tables allow more fine-grained global customization but come at a performance penalty compared to extreme tables.',
  tagging: 'Enabling this extension with context output will produce markup suitable for the production of tagged PDFs. This includes additional markers for paragraphs and alternative markup for emphasized text. The emphasis-command template variable is set if the extension is enabled.',
  escaped_line_breaks: 'A backslash followed by a newline is also a hard line break. Note: in multiline and grid table cells, this is the only way to create a hard line break, since trailing spaces in the cells are ignored.',
  blank_before_header: 'Original Markdown syntax does not require a blank line before a heading. Pandoc does require this (except, of course, at the beginning of the document). The reason for the requirement is that it is all too easy for a # to end up at the beginning of a line by accident (perhaps through line wrapping).',
  space_in_atx_header: 'Many Markdown implementations do not require a space between the opening #s of an ATX heading and the heading text, so that #5 bolt and #hashtag count as headings. With this extension, pandoc does require the space.',
  header_attributes: 'Headings can be assigned attributes using this syntax at the end of the line containing the heading text: {#identifier .class .class key=value key=value}',
  implicit_header_references: 'Pandoc behaves as if reference links have been defined for each heading. So, to link to a heading # Heading identifiers in HTML you can simply write [Heading identifiers in HTML]',
  blank_before_blockquote: 'Original Markdown syntax does not require a blank line before a block quote. Pandoc does require this (except, of course, at the beginning of the document). The reason for the requirement is that it is all too easy for a > to end up at the beginning of a line by accident (perhaps through line wrapping).',
  fenced_code_blocks: 'In addition to standard indented code blocks, pandoc supports fenced code blocks. These begin with a row of three or more tildes (~) and end with a row of tildes that must be at least as long as the starting row. Everything between these lines is treated as code.',
  backtick_code_blocks: 'Same as fenced_code_blocks, but uses backticks (`) instead of tildes (~).',
  fenced_code_attributes: 'Optionally, you may attach attributes to fenced or backtick code block using this syntax: ~~~~ {#mycode .haskell .numberLines startFrom="100"}',
  line_blocks: 'A line block is a sequence of lines beginning with a vertical bar (|) followed by a space. The division into lines will be preserved in the output, as will any leading spaces; otherwise, the lines will be formatted as Markdown.',
  startnum: 'Pandoc also pays attention to the type of list marker used, and to the starting number, and both of these are preserved where possible in the output format.',
  task_lists: 'Pandoc supports task lists, using the syntax of GitHub-Flavored Markdown.',
  definition_lists: 'Pandoc supports definition lists, using the syntax of PHP Markdown Extra with some extensions.',
  example_lists: 'The special list marker @ can be used for sequentially numbered examples. The first list item with a @ marker will be numbered ‘1’, the next ‘2’, and so on, throughout the document. The numbered examples need not occur in a single list; each new list using @ will take up where the last stopped.',
  table_captions: 'A caption may optionally be provided with all 4 kinds of tables (as illustrated in the examples below). A caption is a paragraph beginning with the string Table: (or table: or just :), which will be stripped off. It may appear either before or after the table.',
  simple_tables: 'Enables support for simple tables',
  multiline_tables: 'Enables support for multiline tables',
  grid_tables: 'Enables support for grid tables',
  pipe_tables: 'Enables support for pipe tables',
  pandoc_title_block: 'If the file begins with a title block (starting with % signs) it will be parsed as bibliographic information, not regular text.',
  yaml_metadata_block: 'YAML metadata/frontmatter support',
  all_symbols_escapable: 'Except inside a code block or inline code, any punctuation or space character preceded by a backslash will be treated literally, even if it would normally indicate formatting.',
  intraword_underscores: 'Because _ is sometimes used inside words and identifiers, pandoc does not interpret a _ surrounded by alphanumeric characters as an emphasis marker.',
  strikeout: 'To strike out a section of text with a horizontal line, begin and end it with ~~',
  superscript: 'Superscripts may be written by surrounding the superscripted text by ^ characters; subscripts may be written by surrounding the subscripted text by ~ characters.',
  subscript: 'Superscripts may be written by surrounding the superscripted text by ^ characters; subscripts may be written by surrounding the subscripted text by ~ characters.',
  inline_code_attributes: 'Attributes can be attached to verbatim text, just as with fenced code blocks.',
  markdown_in_html_blocks: 'Original Markdown allows you to include HTML “blocks”: blocks of HTML between balanced tags that are separated from the surrounding text with blank lines, and start and end at the left margin. Within these blocks, everything is interpreted as HTML, not Markdown; so (for example), * does not signify emphasis.',
  raw_attribute: 'Inline spans and fenced code blocks with a special kind of attribute will be parsed as raw content with the designated format.',
  latex_macros: 'When this extension is enabled, pandoc will parse LaTeX macro definitions and apply the resulting macros to all LaTeX math and raw LaTeX.',
  shortcut_reference_links: 'In a shortcut reference link, the second pair of brackets may be omitted entirely: See [my website]. [my website]: http://foo.bar.baz',
  implicit_figures: 'An image with nonempty alt text, occurring by itself in a paragraph, will be rendered as a figure with a caption. The image’s alt text will be used as the caption.',
  link_attributes: 'Attributes can be set on links and images',
  fenced_divs: 'Allow special fenced syntax for native Div blocks. A Div starts with a fence containing at least three consecutive colons plus some attributes. The attributes may optionally be followed by another string of consecutive colons.',
  bracketed_spans: 'A bracketed sequence of inlines, as one would use to begin a link, will be treated as a Span with attributes if it is followed immediately by attributes.',
  footnotes: 'Pandoc’s Markdown allows footnotes',
  inline_notes: 'Inline footnotes are also allowed (though, unlike regular notes, they cannot contain multiple paragraphs). The syntax is as follows: ^[Footnote text]',
  rebase_relative_paths: 'Rewrite relative paths for Markdown links and images, depending on the path of the file containing the link or image link. For each link or image, pandoc will compute the directory of the containing file, relative to the working directory, and prepend the resulting path to the link or image path.',
  mark: 'To highlight out a section of text, begin and end it with with ==',
  attributes: 'Allows attributes to be attached to any inline or block-level element when parsing commonmark. The syntax for the attributes is the same as that used in header_attributes.',
  old_dashes: 'Selects the pandoc <= 1.8.2.1 behavior for parsing smart dashes: - before a numeral is an en-dash, and -- is an em-dash. This option only has an effect if smart is enabled. It is selected automatically for textile input.',
  angle_brackets_escapable: 'Allow < and > to be backslash-escaped, as they can be in GitHub flavored Markdown but not original Markdown. This is implied by pandoc’s default all_symbols_escapable.',
  lists_without_preceding_blankline: 'Allow a list to occur right after a paragraph, with no intervening blank space.',
  four_space_rule: 'Selects the pandoc <= 2.0 behavior for parsing lists, so that four spaces indent are needed for list item continuation paragraphs.',
  spaced_reference_links: 'Allow whitespace between the two components of a reference link, for example, [foo] [bar].',
  hard_line_breaks: 'Causes all newlines within a paragraph to be interpreted as hard line breaks instead of spaces.',
  ignore_line_breaks: 'Causes newlines within a paragraph to be ignored, rather than being treated as spaces or as hard line breaks. This option is intended for use with East Asian languages where spaces are not used between words, but text is divided into lines for readability.',
  east_asian_line_breaks: 'Causes newlines within a paragraph to be ignored, rather than being treated as spaces or as hard line breaks, when they occur between two East Asian wide characters. This is a better choice than ignore_line_breaks for texts that include a mix of East Asian wide characters and other characters.',
  emoji: 'Parses textual emojis like :smile: as Unicode emoticons.',
  markdown_attribute: 'By default, pandoc interprets material inside block-level tags as Markdown. This extension changes the behavior so that Markdown is only parsed inside block-level tags if the tags have the attribute markdown=1.',
  mmd_title_block: 'Enables a MultiMarkdown style title block at the top of the document',
  abbreviations: 'Parses PHP Markdown Extra abbreviation keys',
  alerts: 'Supports GitHub-style Markdown alerts',
  autolink_bare_uris: 'Makes all absolute URIs into links, even when not surrounded by pointy braces <...>.',
  mmd_link_attributes: 'Parses MultiMarkdown-style key-value attributes on link and image references. This extension should not be confused with the link_attributes extension.',
  mmd_header_identifiers: 'Parses MultiMarkdown-style heading identifiers (in square brackets, after the heading but before any trailing #s in an ATX heading).',
  compact_definition_lists: 'Activates the definition list syntax of pandoc 1.12.x and earlier. This syntax differs from the one described above under Definition lists in several respect',
  gutenberg: 'Use Project Gutenberg conventions for plain output: all-caps for strong emphasis, surround by underscores for regular emphasis, add extra blank space around headings.',
  sourcepos: 'Include source position attributes when parsing commonmark. For elements that accept attributes, a data-pos attribute is added; other elements are placed in a surrounding Div or Span element with a data-pos attribute.',
  short_subsuperscripts: 'Parse MultiMarkdown-style subscripts and superscripts, which start with a ‘~’ or ‘^’ character, respectively, and include the alphanumeric sequence that follows.',
  wikilinks_title_after_pipe: 'Pandoc supports multiple Markdown wikilink syntaxes, regardless of whether the title is before or after the pipe.',
  wikilinks_title_before_pipe: 'Pandoc supports multiple Markdown wikilink syntaxes, regardless of whether the title is before or after the pipe.'
}

/**
 * A type that holds every single available extension that is listed in the
 * Pandoc manual.
 */
export const pandocExtensions = [
  'smart', 'auto_identifiers', 'ascii_identifiers', 'gfm_auto_identifiers',
  'tex_math_dollars','tex_math_gfm', 'tex_math_single_backslash',
  'tex_math_double_backslash', 'raw_html', 'raw_tex', 'native_divs',
  'native_spans', 'literate_haskell', 'empty_paragraphs', 'native_numbering',
  'xrefs_name', 'xrefs_number', 'styles', 'amuse', 'raw_markdown',
  'citations', 'fancy_lists', 'element_citations', 'ntb', 'tagging',
  'escaped_line_breaks', 'blank_before_header', 'space_in_atx_header',
  'header_attributes', 'implicit_header_references', 'blank_before_blockquote',
  'fenced_code_blocks', 'backtick_code_blocks', 'fenced_code_attributes',
  'line_blocks', 'startnum', 'task_lists', 'definition_lists', 'example_lists',
  'table_captions', 'simple_tables', 'multiline_tables', 'grid_tables',
  'pipe_tables', 'pandoc_title_block', 'yaml_metadata_block',
  'all_symbols_escapable', 'intraword_underscores', 'strikeout', 'superscript',
  'subscript', 'inline_code_attributes', 'markdown_in_html_blocks',
  'raw_attribute', 'latex_macros', 'shortcut_reference_links',
  'implicit_figures', 'link_attributes', 'fenced_divs', 'bracketed_spans',
  'footnotes', 'inline_notes', 'rebase_relative_paths', 'mark', 'attributes',
  'old_dashes', 'angle_brackets_escapable', 'lists_without_preceding_blankline',
  'four_space_rule', 'spaced_reference_links', 'hard_line_breaks',
  'ignore_line_breaks', 'east_asian_line_breaks', 'emoji', 'markdown_attribute',
  'mmd_title_block', 'abbreviations', 'alerts', 'autolink_bare_uris',
  'mmd_link_attributes', 'mmd_header_identifiers', 'compact_definition_lists',
  'gutenberg', 'sourcepos', 'short_subsuperscripts',
  'wikilinks_title_after_pipe', 'wikilinks_title_before_pipe'
] as const

export type PandocExtension = typeof pandocExtensions[number]

/**
 * Describes, for every existing extension, whether it is enabled or disabled in
 * a given reader or writer by default.
 */
export type PandocExtensions = {
  [key in PandocExtension]: {
    disabled: Array<PandocReader | PandocWriter>
    enabled: Array<PandocReader | PandocWriter>
  }
}

/**
 * Holds information on whether any given extension is enabled or disabled by
 * default on any given reader or writer. NOTE: Not all extensions are supported
 * by all readers or writers.
 */
export const extensions: PandocExtensions = {
  smart: {
    enabled: [ 'beamer', 'commonmark_x', 'context', 'latex', 'markdown', 'opml', 'textile' ],
    disabled: [
      'commonmark', 'epub', 'epub2', 'epub3', 'gfm', 'html', 'html4', 'html5',
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'mediawiki', 'org', 'plain', 'rst', 'twiki'
    ]
  },
  auto_identifiers: {
    enabled: [
      'asciidoc', 'beamer', 'context', 'docx', 'dokuwiki', 'html', 'html4', 'html5',
      'ipynb', 'jats', 'jats_archiving', 'jats_articleauthoring', 'jats_publishing',
      'latex', 'markdown', 'markdown_github', 'markdown_mmd', 'mediawiki', 'muse',
      'odt', 'opml', 'org', 'rst', 'textile', 'tikiwiki', 'twiki', 'vimwiki'
    ],
    disabled: [ 'epub', 'epub2', 'epub3', 'markdown_phpextra', 'markdown_strict', 'plain' ]
  },
  ascii_identifiers: {
    enabled: [],
    disabled: [
      'asciidoc', 'beamer', 'commonmark', 'commonmark_x', 'context', 'docx',
      'dokuwiki', 'epub', 'epub2', 'epub3', 'gfm', 'html', 'html4', 'html5',
      'ipynb', 'latex', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'mediawiki', 'muse', 'odt',
      'opml', 'org', 'plain', 'rst', 'textile', 'tikiwiki', 'twiki', 'vimwiki'
    ]
  },
  gfm_auto_identifiers: {
    enabled: [ 'commonmark_x', 'gfm', 'ipynb', 'markdown_github' ],
    disabled: [
      'asciidoc', 'beamer', 'commonmark', 'context', 'docx', 'dokuwiki', 'epub',
      'epub2', 'epub3', 'html', 'html4', 'html5', 'latex', 'markdown',
      'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'mediawiki',
      'muse', 'odt', 'opml', 'org', 'plain', 'rst', 'textile', 'tikiwiki',
      'twiki', 'vimwiki'
    ]
  },  
  tex_math_dollars: {
    enabled: [ 'commonmark_x', 'gfm', 'ipynb', 'markdown', 'markdown_mmd', 'opml' ],
    disabled: [
      'commonmark', 'dokuwiki', 'epub', 'epub2', 'epub3', 'html', 'html4',
      'html5', 'markdown_github', 'markdown_phpextra', 'markdown_strict', 'plain'
    ]
  },  
  tex_math_gfm: {
    enabled: ['gfm'],
    disabled: [ 'commonmark', 'commonmark_x' ]
  },
  tex_math_single_backslash: {
    enabled: [],
    disabled: [
      'epub', 'epub2', 'epub3', 'html', 'html4', 'html5', 'ipynb', 'markdown',
      'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'opml', 'plain'
    ]
  },
  tex_math_double_backslash: {
    enabled: ['markdown_mmd'],
    disabled: [
      'epub', 'epub2', 'epub3', 'html', 'html4', 'html5', 'ipynb', 'markdown',
      'markdown_github', 'markdown_phpextra', 'markdown_strict', 'opml', 'plain'
    ]
  },  
  raw_html: {
    enabled: [
      'commonmark', 'commonmark_x', 'epub', 'epub2', 'epub3', 'gfm', 'ipynb',
      'markdown', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'opml'
    ],
    disabled: [ 'html', 'html4', 'html5', 'plain' ]
  },
  raw_tex: {
    enabled: [
      'markdown', 'opml'
    ],
    disabled: [
      'beamer', 'context', 'epub', 'epub2', 'epub3' ,'html', 'html4', 'html5',
      'ipynb', 'latex', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'plain', 'textile'
    ]
  },
  native_divs: {
    enabled: [
      'epub', 'epub2', 'epub3', 'html', 'html4', 'html5', 'markdown', 'opml'
    ],
    disabled: [
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },
  native_spans: {
    enabled: [
      'epub', 'epub2', 'epub3', 'html', 'html4', 'html5', 'markdown', 'opml'
    ],
    disabled: [
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'plain'
    ]
  },
  literate_haskell: {
    enabled: [],
    disabled: [
      'beamer', 'epub', 'epub2', 'epub3', 'html', 'html4', 'html5', 'ipynb',
      'latex', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml', 'plain', 'rst'
    ]
  },
  empty_paragraphs: {
    enabled: [],
    disabled: [ 'docx', 'epub', 'epub2', 'epub3', 'html', 'html4', 'html5', 'odt', 'opendocument' ]
  },  
  native_numbering: {
    enabled: [],
    disabled: [ 'docx', 'odt', 'opendocument' ]
  },  
  xrefs_name: {
    enabled: [],
    disabled: [ 'odt', 'opendocument' ]
  },
  xrefs_number: {
    enabled: [],
    disabled: [ 'odt', 'opendocument' ]
  },
  styles: {
    enabled: [],
    disabled: ['docx']
  },
  amuse: {
    enabled: ['muse'],
    disabled: []
  },
  raw_markdown: {
    enabled: [],
    disabled: ['ipynb']
  },
  citations: {
    enabled: [ 'markdown', 'opml', 'org', 'typst' ],
    disabled: [
      'docx', 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },
  fancy_lists: {
    enabled: [ 'commonmark_x', 'markdown', 'opml', 'plain' ],
    disabled: [
      'commonmark', 'gfm', 'ipynb', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'org'
    ]
  },  
  element_citations: {
    enabled: [],
    disabled: [ 'jats', 'jats_archiving', 'jats_articleauthoring', 'jats_publishing' ]
  },
  ntb: {
    enabled: [],
    disabled: ['context']
  },
  tagging: {
    enabled: [],
    disabled: ['context']
  },
  escaped_line_breaks: {
    enabled: [ 'markdown', 'opml' ],
    disabled: [
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },  
  blank_before_header: {
    enabled: [ 'markdown', 'opml', 'plain' ],
    disabled: [
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict'
    ]
  },  
  space_in_atx_header: {
    enabled: [ 'ipynb', 'markdown', 'markdown_github', 'opml' ],
    disabled: [ 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'plain' ]
  },  
  header_attributes: {
    enabled: [ 'markdown', 'markdown_phpextra', 'opml' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_strict', 'plain' ]
  },  
  implicit_header_references: {
    enabled: [ 'commonmark_x', 'markdown', 'markdown_mmd', 'opml' ],
    disabled: [
      'commonmark', 'gfm', 'ipynb', 'markdown_github', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },
  blank_before_blockquote: {
    enabled: [ 'markdown', 'opml', 'plain' ],
    disabled: [
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict'
    ]
  },  
  fenced_code_blocks: {
    enabled: [ 'ipynb', 'markdown', 'markdown_github', 'markdown_phpextra', 'opml' ],
    disabled: [ 'markdown_mmd', 'markdown_strict', 'plain' ]
  },  
  backtick_code_blocks: {
    enabled: [ 'ipynb', 'markdown', 'markdown_github', 'markdown_mmd', 'opml' ],
    disabled: [ 'markdown_phpextra', 'markdown_strict', 'plain' ]
  },  
  fenced_code_attributes: {
    enabled: [ 'markdown', 'opml' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'plain' ]
  },
  line_blocks: {
    enabled: [ 'html', 'html4', 'html5', 'markdown', 'opml' ],
    disabled: [
      'epub', 'epub2', 'epub3', 'ipynb', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'plain'
    ]
  },      
  startnum: {
    enabled: [ 'markdown', 'opml', 'plain' ],
    disabled: [
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict'
    ]
  },
  task_lists: {
    enabled: [
      'commonmark_x', 'gfm', 'ipynb', 'markdown', 'markdown_github', 'opml', 'org'
    ],
    disabled: [
      'beamer', 'commonmark', 'epub', 'epub2', 'epub3', 'html', 'html4', 'html5',
      'latex', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'plain'
    ]
  },
  definition_lists: {
    enabled: [
      'commonmark_x', 'markdown', 'markdown_mmd', 'markdown_phpextra', 'opml', 'plain'
    ],
    disabled: [ 'commonmark', 'gfm', 'ipynb', 'markdown_github', 'markdown_strict' ]
  },  
  example_lists: {
    enabled: [ 'markdown', 'opml', 'plain' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict' ]
  },  
  table_captions: {
    enabled: [ 'markdown', 'opml', 'plain' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict' ]
  },  
  simple_tables: {
    enabled: [ 'markdown', 'opml', 'plain' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict' ]
  },  
  multiline_tables: {
    enabled: [ 'markdown', 'opml', 'plain' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_phpextra', 'markdown_strict' ]
  },  
  grid_tables: {
    enabled: [ 'markdown', 'opml', 'plain' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict' ]
  },
  pipe_tables: {
    enabled: [
      'commonmark_x', 'gfm', 'ipynb', 'markdown', 'markdown_github',
      'markdown_mmd', 'markdown_phpextra', 'opml'
    ],
    disabled: [ 'commonmark', 'markdown_strict', 'plain' ]
  },  
  pandoc_title_block: {
    enabled: [ 'markdown', 'opml' ],
    disabled: [
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },
  yaml_metadata_block: {
    enabled: [ 'commonmark_x', 'gfm', 'markdown', 'opml' ],
    disabled: [
      'commonmark', 'ipynb', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'plain'
    ]
  },
  all_symbols_escapable: {
    enabled: [ 'ipynb', 'markdown', 'markdown_github', 'markdown_mmd', 'opml' ],
    disabled: [ 'markdown_phpextra', 'markdown_strict', 'plain' ]
  },
  intraword_underscores: {
    enabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'opml', 'plain'
    ],
    disabled: ['markdown_strict']
  },  
  strikeout: {
    enabled: [
      'commonmark_x', 'gfm', 'ipynb', 'markdown', 'markdown_github', 'opml', 'plain'
    ],
    disabled: [ 'commonmark', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict' ]
  },
  superscript: {
    enabled: [ 'commonmark_x', 'markdown', 'markdown_mmd', 'opml' ],
    disabled: [
      'commonmark', 'gfm', 'ipynb', 'markdown_github', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },
  subscript: {
    enabled: [ 'commonmark_x', 'markdown', 'markdown_mmd', 'opml' ],
    disabled: [
      'commonmark', 'gfm', 'ipynb', 'markdown_github', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },
  inline_code_attributes: {
    enabled: [ 'markdown', 'opml' ],
    disabled: [
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },
  markdown_in_html_blocks: {
    enabled: [ 'markdown', 'opml' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 'plain' ]
  },
  raw_attribute: {
    enabled: [ 'commonmark_x', 'markdown', 'markdown_mmd', 'opml' ],
    disabled: [
      'commonmark', 'gfm', 'ipynb', 'markdown_github', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },  
  latex_macros: {
    enabled: [ 'beamer', 'latex', 'markdown', 'opml', 'plain' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict' ]
  },
  shortcut_reference_links: {
    enabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml'
    ],
    disabled: ['plain']
  },
  implicit_figures: {
    enabled: [ 'markdown', 'markdown_mmd', 'opml', 'plain' ],
    disabled: [
      'commonmark', 'commonmark_x', 'gfm', 'ipynb', 'markdown_github',
      'markdown_phpextra', 'markdown_strict'
    ]
  },
  link_attributes: {
    enabled: [ 'markdown', 'markdown_phpextra', 'opml' ],
    disabled: [ 'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_strict', 'plain' ]
  },
  fenced_divs: {
    enabled: [ 'commonmark_x', 'markdown', 'opml' ],
    disabled: [
      'commonmark', 'gfm', 'ipynb', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'plain'
    ]
  },
  bracketed_spans: {
    enabled: [ 'commonmark_x', 'markdown', 'opml' ],
    disabled: [
      'commonmark', 'gfm', 'ipynb', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'plain'
    ]
  }, 
  footnotes: {
    enabled: [
      'commonmark_x', 'gfm', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'opml'
    ],
    disabled: [
      'commonmark', 'ipynb', 'markdown_strict', 'plain'
    ]
  },
  inline_notes: {
    enabled: [ 'markdown', 'opml' ],
    disabled: [
      'ipynb', 'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'plain'
    ]
  },
  rebase_relative_paths: {
    enabled: [],
    disabled: [
      'commonmark', 'commonmark_x', 'gfm', 'ipynb', 'markdown',
      'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict',
      'opml', 'plain'
    ]
  },
  mark: {
    enabled: [],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml', 'plain'
    ]
  },  
  attributes: {
    enabled: ['commonmark_x'],
    disabled: [ 'commonmark', 'gfm' ]
  },
  old_dashes: {
    enabled: ['textile'],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml', 'plain'
    ]
  },
  angle_brackets_escapable: {
    enabled: [],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml', 'plain'
    ]
  },
  lists_without_preceding_blankline: {
    enabled: [ 'ipynb', 'markdown_github' ],
    disabled: [
      'markdown', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict',
      'opml', 'plain'
    ]
  },
  four_space_rule: {
    enabled: [],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml', 'plain'
    ]
  },  
  spaced_reference_links: {
    enabled: [ 'markdown_mmd', 'markdown_phpextra', 'markdown_strict' ],
    disabled: [ 'ipynb', 'markdown', 'markdown_github', 'opml', 'plain' ]
  },
  hard_line_breaks: {
    enabled: [],
    disabled: [
      'commonmark', 'commonmark_x', 'gfm', 'ipynb', 'markdown',
      'markdown_github', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'opml', 'plain'
    ]
  },
  ignore_line_breaks: {
    enabled: [],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml', 'plain'
    ]
  },
  east_asian_line_breaks: {
    enabled: [],
    disabled: [
      'asciidoc', 'asciidoc_legacy', 'asciidoctor', 'beamer', 'biblatex',
      'bibtex', 'bits', 'chunkedhtml', 'commonmark', 'commonmark_x', 'context',
      'creole', 'csljson', 'csv', 'docbook', 'docbook4', 'doocbook5', 'docx',
      'dokuwiki', 'dzslides', 'endnotexml', 'epub', 'epub2', 'epub3', 'fb2',
      'gfm', 'haddock', 'html', 'html4', 'html5', 'icml', 'ipynb', 'jats',
      'jats_archiving', 'jats_articleauthoring', 'jats_publishing', 'jira',
      'json', 'latex', 'man', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'markua', 'mediawiki', 'ms',
      'muse', 'native', 'odt', 'opendocument', 'opml', 'org', 'plain', 'pptx',
      'revealjs', 'ris', 'rst', 'rtf', 's5', 'slideous', 'slidy', 't2t', 'tei',
      'texinfo', 'textile', 'tikiwiki', 'tsv', 'twiki', 'typst', 'vimwiki',
      'xwiki', 'zimwiki'
    ]
  },
  emoji: {
    enabled: [ 'commonmark_x', 'gfm', 'markdown_github' ],
    disabled: [
      'commonmark', 'ipynb', 'markdown', 'markdown_mmd', 'markdown_phpextra',
      'markdown_strict', 'opml', 'plain'
    ]
  },
  markdown_attribute: {
    enabled: [ 'markdown_mmd', 'markdown_phpextra' ],
    disabled: [ 'ipynb', 'markdown', 'markdown_github', 'markdown_strict', 'opml', 'plain' ]
  },
  mmd_title_block: {
    enabled: ['markdown_mmd'],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_phpextra',
      'markdown_strict', 'opml', 'plain'
    ]
  },  
  abbreviations: {
    enabled: ['markdown_phpextra'],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_strict',
      'opml', 'plain'
    ]
  },
  alerts: {
    enabled: [ 'commonmark_x', 'gfm' ],
    disabled: ['commonmark']
  },
  autolink_bare_uris: {
    enabled: [ 'gfm', 'ipynb', 'markdown_github' ],
    disabled: [
      'commonmark', 'commonmark_x', 'markdown', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml', 'plain'
    ]
  },
  mmd_link_attributes: {
    enabled: ['markdown_mmd'],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_phpextra',
      'markdown_strict', 'opml', 'plain'
    ]
  },
  mmd_header_identifiers: {
    enabled: ['markdown_mmd'],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_phpextra',
      'markdown_strict', 'opml', 'plain'
    ]
  },
  compact_definition_lists: {
    enabled: [],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml', 'plain'
    ]
  },
  gutenberg: {
    enabled: [],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_mmd',
      'markdown_phpextra', 'markdown_strict', 'opml', 'plain'
    ]
  },  
  sourcepos: {
    enabled: [],
    disabled: [ 'commonmark', 'commonmark_x', 'gfm' ]
  },
  short_subsuperscripts: {
    enabled: ['markdown_mmd'],
    disabled: [
      'ipynb', 'markdown', 'markdown_github', 'markdown_phpextra',
      'markdown_strict', 'opml', 'plain'
    ]
  },
  wikilinks_title_after_pipe: {
    enabled: [],
    disabled: [
      'commonmark', 'commonmark_x', 'gfm', 'ipynb', 'markdown',
      'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict',
      'opml', 'plain'
    ]
  },
  wikilinks_title_before_pipe: {
    enabled: [],
    disabled: [
      'commonmark', 'commonmark_x', 'gfm', 'ipynb', 'markdown',
      'markdown_github', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict',
      'opml', 'plain'
    ]
  }
}
