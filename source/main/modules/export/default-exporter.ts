// DEFAULT exporter plugin

import commandExists from 'command-exists'
import path from 'path'
import { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI } from './types'

// TODO: Enable these additional writers
// // Pandoc formats that can be passed directly to the engine
// 'asciidoc'|'beamer'|'context'|'docbook5'|'docx'|'docuwiki'|'epub'|'fb2'|
// 'haddock'|'icml'|'ipynb'|'jats'|'jira'|'json'|'latex'|'man'|'mediawiki'|'ms'|
// 'muse'|'native'|'odt'|'opml'|'opendocument'|'org'|'plain'|'pptx'|'rst'|'rtf'|
// 'texinfo'|'textile'|'slideous'|'slidy'|'dzslides'|'s5'|'tei'|'xwiki'|'zimwiki'|

export const plugin: ExporterPlugin = {
  pluginInformation: function () {
    return {
      id: 'default',
      formats: {
        'html': 'HTML',
        'odt': 'OpenDocument Text',
        'docx': 'Microsoft Word',
        'latex': 'LaTeX Source',
        'org': 'Orgmode',
        'plain': 'Plain Text',
        'rst': 'reStructured Text',
        'rtf': 'RichText Format',
        'icml': 'InDesign Markup Language (ICML)'
      },
      options: []
    }
  },
  run: async function (options: ExporterOptions, sourceFiles: string[], formatOptions: any, ctx: ExporterAPI): Promise<ExporterOutput> {
    // Determine the availability of Pandoc. As the Pandoc path is added to
    // process.env.PATH during the environment check, this should always work
    // if a supported Zettlr variant is being used. In other cases (e.g. custom
    // 32 bit builds) users can manually add a path. In any case, the exporter
    // requires Pandoc, and if it's not there we fail.
    try {
      await commandExists('pandoc')
    } catch (err) {
      throw new Error('Cannot export: Pandoc has not been found.')
    }

    // Get the correct file extension
    let extension = options.format
    if (options.format === 'plain') {
      extension = 'txt'
    } else if (options.format === 'latex') {
      extension = 'tex'
    }

    // First file determines the name of the exported file.
    const firstName = path.basename(options.sourceFiles[0].name, options.sourceFiles[0].ext)
    const target = path.join(options.targetDirectory, `${firstName}.${extension}`)

    // Get the corresponding defaults file
    const defaultKeys = {
      'input-files': sourceFiles,
      'output-file': target
    }
    const defaultsFile = await ctx.getDefaultsFor(options.format, defaultKeys)

    // Run Pandoc
    const pandocOutput = await ctx.runPandoc(defaultsFile)

    // Make sure to propagate the results
    return {
      code: pandocOutput.code,
      stdout: pandocOutput.stdout,
      stderr: pandocOutput.stderr,
      targetFile: target
    }
  }
}
