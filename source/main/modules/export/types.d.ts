export type PandocFormat =
// Pandoc formats that can be passed directly to the engine
'asciidoc'|'beamer'|'context'|'docbook5'|'docx'|'docuwiki'|'epub'|'fb2'|
'haddock'|'icml'|'ipynb'|'jats'|'jira'|'json'|'latex'|'man'|'mediawiki'|'ms'|
'muse'|'native'|'odt'|'opml'|'opendocument'|'org'|'plain'|'pptx'|'rst'|'rtf'|
'texinfo'|'textile'|'slideous'|'slidy'|'dzslides'|'s5'|'tei'|'xwiki'|'zimwiki'|
'revealjs'| // revalJS without theme
// Zettlr-specific export options that need special care
'html'|'textbundle'|'textpack'|'pdf'|
// revealJS with theme options
'revealjs-black'|'revealjs-moon'|'revealjs-league'|'revealjs-sky'|
'revealjs-beige'|'revealjs-solarized'|'revealjs-serif'|'revealjs-white'

export interface ExporterOptions {
  format: PandocFormat
  revealJSStyle?: 'black'|'moon'|'league'|'sky'|'beige'|'solarized'|'serif'|'white'
  file: {
    path: string
    content: string
  }
  dest: string // TODO: Rename to targetDir
  sourceFile?: string
  targetFile?: string
  autoOpen?: boolean // If set to true, automatically opens the resultant file
  absoluteImagePaths?: boolean
}
