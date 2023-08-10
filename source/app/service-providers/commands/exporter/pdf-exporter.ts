/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PDF Exporter plugin
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin enables exports into PDF. It offers two variants:
 *                  "chromium-pdf" exports by exporting to HTML and then
 *                  utilising the Chrome print API to generate a PDF. The xelatex
 *                  exporter is more powerful, but requires a full TeX installation
 *                  on the system.
 *
 * END HEADER
 */

import commandExists from 'command-exists'
import path from 'path'
import { promises as fs } from 'fs'
import { BrowserWindow } from 'electron'
import type { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI } from './types'
import { trans } from '@common/i18n-main'
import sanitize from 'sanitize-filename'

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
      throw new Error(trans('Pandoc has not been found on this system. Please install Pandoc prior to exporting or importing files.'))
    }

    // First file determines the name of the output path, EXCEPT a title is
    // explicitly set.
    const firstName = path.basename(options.sourceFiles[0].name, options.sourceFiles[0].ext)
    const title = (options.defaultsOverride?.title !== undefined) ? sanitize(options.defaultsOverride.title, { replacement: '-' }) : firstName
    const pdfFilePath = path.join(options.targetDirectory, `${title}.pdf`)
    const htmlFilePath = path.join(options.targetDirectory, `${title}.html`)

    // Get the corresponding defaults file
    const defaultKeys = {
      'input-files': sourceFiles,
      'output-file': htmlFilePath
    }

    // Now we'll have to get the correct exporting template
    const allDefaults = (await ctx.listDefaults())
      .filter(e => e.writer === 'html')

    if (allDefaults.length > 1) {
      console.warn(`[SimplePDF Export] More than one suitable format for exporting to HTML found - using first one: ${allDefaults[0].name}`)
    }

    // Write to an intermediary HTML file which we will convert to PDF below.
    const defaultsFile = await ctx.getDefaultsFor(allDefaults[0].name, defaultKeys)

    // Run Pandoc
    const pandocOutput = await ctx.runPandoc(defaultsFile)

    // Without XeLaTeX, people can still export to PDF using Chromium's print
    // API. Chromium's PDF abilities are actually quite good.
    const printer = new BrowserWindow({
      width: 600,
      height: 800,
      show: false
    })

    await printer.loadFile(htmlFilePath)
    const pdfData = await printer.webContents.printToPDF({
      printBackground: false,
      landscape: false,
      pageSize: 'A4'
    })
    printer.close()

    await fs.writeFile(pdfFilePath, pdfData)
    await fs.unlink(htmlFilePath) // Remove the intermediary HTML file

    // Make sure to propagate the results
    return {
      code: pandocOutput.code,
      stdout: pandocOutput.stdout,
      stderr: pandocOutput.stderr,
      targetFile: pdfFilePath
    }
  }
}
