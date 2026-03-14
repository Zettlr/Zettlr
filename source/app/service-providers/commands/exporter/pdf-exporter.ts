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

import path from 'path'
import { promises as fs } from 'fs'
import { BrowserWindow } from 'electron'
import type { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI } from './types'
import sanitize from 'sanitize-filename'

export const plugin: ExporterPlugin = async function (options: ExporterOptions, sourceFiles: string[], ctx: ExporterAPI): Promise<ExporterOutput> {
  // First file determines the name of the output path, EXCEPT a title is
  // explicitly set.
  const firstName = path.basename(options.sourceFiles[0].name, options.sourceFiles[0].ext)
  const title = (options.defaultsOverride?.title !== undefined) ? sanitize(options.defaultsOverride.title, { replacement: '-' }) : firstName
  let pdfFilePath = path.join(options.targetDirectory, `${title}.pdf`)
  let htmlFilePath = path.join(options.targetDirectory, `${title}.html`)

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
  const defaults = await ctx.loadDefaults(allDefaults[0].name, defaultKeys)

  // Since the PDF exporter is a two-stage process, `htmlFilePath` is what
  // is actually passed to pandoc, however, a user provided `output-file`
  // likely refers to the path of the output PDF. So, if `output-file` has
  // changed, normalize the path based on the PDF and set `output-file` to
  // the updated `htmlFilePath`.
  if (defaults['output-file'] !== htmlFilePath) {
    // Remove any internal `..` and `.` paths
    pdfFilePath = path.normalize(defaults['output-file'] as string)

    // If the target is a relative path, resolve it to the target directory
    // and sanitize any potential path traversals.
    if (!path.isAbsolute(pdfFilePath)) {
      pdfFilePath = path.resolve(options.targetDirectory, pdfFilePath)

      // Make sure that the resolved path still falls under `targetDirectory`
      // to prevent potentially insecure path traversals.
      if (!pdfFilePath.startsWith(options.targetDirectory)) {
        const parsed = path.parse(pdfFilePath)
        pdfFilePath = path.join(options.targetDirectory, parsed.base)
      }
    }

    // This is a temporary file, so potentially duplicating the extension as
    // `.pdf.html` doesn't really matter. We probably could disregard updating
    // this path entirely, but here it is done for consistency.
    htmlFilePath = pdfFilePath + '.html'

    defaults['output-file'] = htmlFilePath
  }

  // Run Pandoc
  const pandocOutput = await ctx.runPandoc(defaults)

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
