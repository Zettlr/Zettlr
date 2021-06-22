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
import { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI, PreparedFiles } from './types'

export const plugin: ExporterPlugin = {
  pluginInformation: function () {
    return {
      id: 'pdfExporter',
      formats: {
        'chromium-pdf': 'PDF Document',
        'xelatex-pdf': 'PDF (XeLaTeX)'
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
      throw new Error('Cannot export: Pandoc has not been found.')
    }

    if (options.format === 'xelatex-pdf') {
      try {
        await commandExists('xelatex')
      } catch (err) {
        throw new Error('Cannot run exporter: XeLaTeX has not been found.')
      }
    }

    // First file determines the name
    const firstName = path.basename(options.sourceFiles[0].name, options.sourceFiles[0].ext)
    const pdfFilePath = path.join(options.targetDirectory, `${firstName}.pdf`)
    const htmlFilePath = path.join(options.targetDirectory, `${firstName}.html`)

    // Get the corresponding defaults file
    const defaultKeys = {
      'input-files': processedSource.filenames,
      'output-file': (options.format === 'xelatex-pdf') ? pdfFilePath : htmlFilePath
    }
    let defaultsFile = ''
    if (options.format === 'xelatex-pdf') {
      // Immediately write to PDF
      defaultsFile = await ctx.getDefaultsFor('pdf', defaultKeys, processedSource.metadata)
    } else {
      // Write to an intermediary HTML file which we will convert to PDF below.
      defaultsFile = await ctx.getDefaultsFor('html', defaultKeys, processedSource.metadata)
    }

    // Run Pandoc
    const pandocOutput = await ctx.runPandoc(defaultsFile)

    // Without XeLaTeX, people can still export to PDF using Chromium's print
    // API. Chromium's PDF abilities are actually quite good.
    if (options.format === 'chromium-pdf') {
      const printer = new BrowserWindow({
        width: 600,
        height: 800,
        show: false
      })

      await printer.loadFile(htmlFilePath)
      const pdfData = await printer.webContents.printToPDF({
        marginsType: 0,
        printBackground: false,
        printSelectionOnly: false,
        landscape: false,
        pageSize: 'A4',
        scaleFactor: 100
      })
      printer.close()

      await fs.writeFile(pdfFilePath, pdfData)
      await fs.unlink(htmlFilePath) // Remove the intermediary HTML file
    }

    // Make sure to propagate the results
    return {
      code: pandocOutput.code,
      stdout: pandocOutput.stdout,
      stderr: pandocOutput.stderr,
      targetFile: pdfFilePath
    }
  }
}
