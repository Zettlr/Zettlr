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
import sanitize from 'sanitize-filename'
import { trans } from '@common/i18n-main'
import { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI } from './types'
import { WRITER2EXT } from '@common/util/pandoc-maps'

export const plugin: ExporterPlugin = {
  run: async function (options: ExporterOptions, sourceFiles: string[], ctx: ExporterAPI): Promise<ExporterOutput> {
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

    if (typeof options.profile === 'string') {
      throw new Error('Cannot run default exporter plugin: Wrong profile provided!')
    }

    // Get the correct file extension
    const extension = WRITER2EXT[options.profile.writer]

    // First file determines the name of the exported file.
    const firstName = path.basename(options.sourceFiles[0].name, options.sourceFiles[0].ext)
    const title = (options.defaultsOverride?.title !== undefined) ? sanitize(options.defaultsOverride.title, { replacement: '-' }) : firstName
    const target = path.join(options.targetDirectory, `${title}.${extension}`)

    // Get the corresponding defaults file
    const defaultKeys = {
      'input-files': sourceFiles,
      'output-file': target
    }
    const defaultsFile = await ctx.getDefaultsFor(options.profile.name, defaultKeys)

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
