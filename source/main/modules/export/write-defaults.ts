import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import isFile from '../../../common/util/is-file'
import YAML from 'yaml'

// REFERENCE: Full defaults file here: https://pandoc.org/MANUAL.html#default-files

export default async function writeDefaults (
  writer: string, // The writer to use (e.g. html or pdf)
  sourceFile: string,
  targetFile: string
): Promise<string> {
  const dataDir = app.getPath('temp')
  const defaultsFile = path.join(dataDir, 'defaults.yml')

  const defaults: any = {
    reader: 'markdown',
    writer: writer,
    'output-file': targetFile,
    'input-files': [
      sourceFile // NOTE: Can be even more files!
    ],
    'self-contained': false, // TODO: We could use that for the revealJS-stuff :O
    // variables: {},
    metadata: {
      author: [],
      lang: global.config.get('appLang'),
      title: path.basename(sourceFile, path.extname(sourceFile))
    },
    'metadata-files': [
      // TODO
    ],
    // The next four variables expect file paths
    'include-before-body': [],
    'include-after-body': [],
    'include-in-header': [],
    // List of paths to search for images and other resources.
    // If unspecified, the default resource path is the working directory.
    // 'resource-path': ['.'],
    bibliography: [],
    // 'citation-abbreviations': 'abbrevs.json', // TODO: Should be a file for journal abbreviations, see the Pandoc docs for that
    // # Filters will be assumed to be Lua filters if they have
    // # the .lua extension, and json filters otherwise.  But
    // # the filter type can also be specified explicitly, as shown.
    // # Filters are run in the order specified.
    // # To include the built-in citeproc filter, use either `citeproc`
    // # or `{type: citeproc}`.
    // Filters have the format: { type: json|lua path: string }
    filters: [
      { type: 'citeproc' }
    ],
    'file-scope': false, // TODO: Parse each file individually before combining for multifile documents
    verbosity: 'INFO', // TODO: Can be ERROR, WARNING, or INFO
    // 'log-file': 'log.json', // TODO: Not documented with Pandoc
    'cite-method': 'citeproc', // TODO: Can be citeproc, natbib, or biblatex
    'top-level-division': 'chapter', // TODO: Can be part, chapter, section, or default:
    // abbreviations: null, // TODO: Strings ending in a period that are found in this list will be followed by a nonbreaking space, so that the period will not produce sentence-ending space in formats like LaTeX.
    'pdf-engine': 'xelatex', // TODO: Can be pdflatex, lualatex, xelatex, latexmk, tectonic, wkhtmltopdf, weasyprint, prince, context, or pdfroff
    // 'pdf-engine-opts': [
    //   // TODO
    // ],
    wrap: 'none', // TODO: Can be auto, preserve, or none
    columns: 78,
    dpi: 72,
    // 'extract-media': 'mediadir', // TODO: Can be used for docx containers in the importer, as this way images are correctly retrieved
    // toc: true, // TODO
    'toc-depth': 2, // TODO: Is the pdf-option equivalent
    'number-sections': false, // TODO: Number section headings in LaTeX, ConTeXt, HTML, Docx, ms, or EPUB output. By default, sections are not numbered.
    // TODO: a list of offsets at each heading level
    'number-offset': [ 0, 0, 0, 0, 0, 0 ], // TODO: Implies number-sections; offsets to another number (e.g. start document with heading number 5, set number=4 for that level)
    // 'shift-heading-level-by': 1,
    'section-divs': true, // If true, wraps sections in <section>
    // 'identifier-prefix': 'foo', // TODO: A prefix for HTML IDs (e.g. foo<heading-string>)
    'title-prefix': '', // TODO: Prefixes the HTML <head> <title> title (if inferred from the first h1, that one won't have it)
    // 'strip-empty-paragraphs': true, // TODO: Deprecated, but useful for the importer: specify +empty_paragraphs for the reader which will omit any empty paragraphs
    eol: 'lf', // TODO: Can be lf, crlf, or native
    'strip-comments': false, // TODO: Strip HTML comments in writer
    'indented-code-classes': [], // TODO: Specify classes to use for indented code blocks–for example, perl,numberLines or haskell.
    ascii: false, // TODO: Prevents UTF-8
    'default-image-extension': '.jpg', // TODO: Can be used for URLs with no image extension
    'highlight-style': 'pygments', // TODO: Can be pygments (the default), kate, monochrome, breezeDark, espresso, zenburn, haddock, and tango OR a custom file
    // 'no-highlight': false, // TODO: Can be used to disable syntax highlighting
    // 'syntax-definitions': [
    //   // TODO: List of KDE XML syntax definition files
    // ],
    listings: false, // TODO: Use the listings package for LaTeX code blocks. The package does not support multi-byte encoding for source code.
    // 'reference-doc': 'myref.docx', // TODO: Only used for docx and odt
    'html-math-method': {
      // TODO: method is plain, webtex, gladtex, mathml, mathjax, katex
      // you may specify a url with webtex, mathjax, katex
      method: 'mathjax',
      url: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
    },
    'email-obfuscation': 'none', // TODO: Can be none, references, or javascript
    'tab-stop': 4, // TODO: Tabstops in writers
    'preserve-tabs': false, // TODO: Preserves tabs in code blocks instead of converting them to spaces
    // incremental: false, // Displays lists in presentations one by one (doesn't support Powerpoint or so)
    // 'slide-level': 2, // TODO: Possibly remove to have Pandoc decide which headings do what
    // 'epub-subdirectory': 'EPUB',
    // 'epub-metadata': 'meta.xml',
    // 'epub-fonts': [
    //   // TODO
    //   'foobar.otf'
    // ],
    // 'epub-chapter-level': 1,
    // 'epub-cover-image': 'cover.jpg',
    // 'reference-links': true, // TODO: Only for importer, creates references instead of inline
    'reference-location': 'block', // TODO: Can be block, section, or document, only affects Markdown imports
    'markdown-headings': 'atx', // TODO: Can be atx or setext
    // 'track-changes': 'accept', // TODO: Only necessary for the IMPORTER! Can be accept, reject, or all
    'html-q-tags': false, // Whether to use <q> tags in HTML
    css: [
      // TODO
    ],
    'ipynb-output': 'best', // TODO: Can be none, all, or best
    'request-headers': [
      // TODO: Must be: A list of two-element lists
      [
        'User-Agent',
        'Mozilla/5.0'
      ]
    ],
    'fail-if-warnings': false, // TODO: Whether to fail on simple warnings as well
    trace: false // TODO: Undocumented
  }

  // Use an HTML template if applicable
  if (writer === 'html') {
    let tpl = await fs.readFile(path.join(__dirname, 'assets/export.tpl.htm'), { encoding: 'utf8' })
    defaults.template = path.join(dataDir, 'template.tpl')
    await fs.writeFile(defaults.template, tpl, { encoding: 'utf8' })
  }

  // TODO: LaTeX template

  // Check if we need standalone
  if ([ 'html', 'latex', 'rtf' ].includes(writer)) {
    defaults.standalone = true
  } else if (writer === 'revealjs') {
    defaults.standalone = false
  }

  // Populate the variables section TODO: Migrate that to its own property
  defaults.variables = global.config.get('pdf')

  // Populate the default author name
  defaults.metadata.author.push(global.config.get('pdf').author)

  const bibliography: string = global.config.get('export.cslLibrary')
  if (isFile(bibliography)) {
    defaults.bibliography.push(bibliography)
  }
  const cslStyle: string = global.config.get('export.cslStyle')
  if (isFile(cslStyle)) {
    defaults.csl = cslStyle
  }

  const YAMLOptions: YAML.Options = {
    indent: 2,
    simpleKeys: false
  }
  await fs.writeFile(defaultsFile, YAML.stringify(defaults, YAMLOptions), { encoding: 'utf8' })

  return defaultsFile
}
