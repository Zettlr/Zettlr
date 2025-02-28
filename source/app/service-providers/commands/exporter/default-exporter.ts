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

import path from 'path'
import sanitize from 'sanitize-filename'
import type { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI } from './types'
import { WRITER2EXT } from '@common/pandoc-util/pandoc-maps'
import { parseReaderWriter } from '@common/pandoc-util/parse-reader-writer'

export const plugin: ExporterPlugin = async function (options: ExporterOptions, sourceFiles: string[], ctx: ExporterAPI): Promise<ExporterOutput> {
  if (typeof options.profile === 'string') {
    throw new Error('Cannot run default exporter plugin: Wrong profile provided!')
  }

  // Get the correct file extension
  const parsedWriter = parseReaderWriter(options.profile.writer).name
  const extension = WRITER2EXT[parsedWriter] ?? parsedWriter

  // First file determines the name of the exported file.
  const firstName = path.basename(options.sourceFiles[0].name, options.sourceFiles[0].ext)
  const title = (options.defaultsOverride?.title !== undefined) ? sanitize(options.defaultsOverride.title, { replacement: '-' }) : firstName
  const target = path.join(options.targetDirectory, `${title}.${extension}`)

  // Get the corresponding defaults file
  const defaultKeys = {
    'input-files': sourceFiles,
    'output-file': target
  }
  const defaultsFile = await ctx.writeDefaults(options.profile.name, defaultKeys)

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
