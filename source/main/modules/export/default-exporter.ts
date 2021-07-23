/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Default exporter plugin
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin facilitates exports in most formats Pandoc supports.
 *
 * END HEADER
 */

import commandExists from 'command-exists'
import path from 'path'
<<<<<<< HEAD
import { trans } from '../../../common/i18n-main'
import { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI } from './types'
=======
import { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI, PreparedFiles } from './types'
>>>>>>> 6877d156 (Implement basic frontmatter extraction for defaults file generation)

// TODO: Enable these additional writers
// // Pandoc formats that can be passed directly to the engine
// 'asciidoc'|'beamer'|'context'|'docbook5'|'docuwiki'|'epub'|'fb2'|
// 'haddock'|'ipynb'|'jats'|'jira'|'json'|'man'|'mediawiki'|'ms'|
// 'muse'|'native'|'opml'|'opendocument'|'pptx'
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
  run: async function (options: ExporterOptions, processedSource: PreparedFiles, formatOptions: any, ctx: ExporterAPI): Promise<ExporterOutput> {
    // Determine the availability of Pandoc. As the Pandoc path is added to
    // process.env.PATH during the environment check, this should always work
    // if a supported Zettlr variant is being used. In other cases (e.g. custom
    // 32 bit builds) users can manually add a path. In any case, the exporter
    // requires Pandoc, and if it's not there we fail.
    try {
      await commandExists('pandoc')
    } catch (err) {
      throw new Error(trans('system.error.no_pandoc_message'))
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
      'input-files': processedSource.filenames,
      'output-file': target
    }
    const defaultsFile = await ctx.getDefaultsFor(options.format, defaultKeys, processedSource.metadata)

    // Run Pandoc
    const pandocOutput = await ctx.runPandoc(defaultsFile)
    console.log(pandocOutput)

    // Make sure to propagate the results
    return {
      code: pandocOutput.code,
      stdout: pandocOutput.stdout,
      stderr: pandocOutput.stderr,
      targetFile: target
    }
  }
}
