/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Export Module
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module allows exporting files with Pandoc.
 *
 * END HEADER
 */

// Modules
import path from 'path'
import { spawn } from 'child_process'
import YAML from 'yaml'
import { app } from 'electron'
import { promises as fs } from 'fs'
import makeDefaultsFile from '@lackadaisical/defaults-generator'

// Utilities
import isFile from '../../../common/util/is-file'
import prepareFiles from './prepare-files'

// Exporters
import { ExporterAPI, ExporterOptions, ExporterOutput, PandocRunnerOutput } from './types'
import { plugin as DefaultExporter } from './default-exporter'
import { plugin as PDFExporter } from './pdf-exporter'
import { plugin as RevealJSExporter } from './revealjs-exporter'
import { plugin as TextbundleExporter } from './textbundle-exporter'

const PLUGINS = [
  DefaultExporter,
  PDFExporter,
  RevealJSExporter,
  TextbundleExporter
]

export function getAvailableFormats (): any {
  // Returns simply a list of all available formats
  const list = []

  for (const plugin of PLUGINS) {
    list.push(plugin.pluginInformation())
  }

  return list
}

/**
 * Runs the exporter.
 *
 * @param   {ExporterOptions}  options             The options needed to facilitate the export.
 * @param   {any}              [formatOptions={}]  These are options possibly required by a plugin.
 *
 * @return  {Promise<ExporterOutput>}              Resolves with an info object.
 */
export async function makeExport (options: ExporterOptions, formatOptions: any = {}): Promise<ExporterOutput> {
  // We already know where the exported file will end up, so set the property

  // Now we can prepare our return
  let exporterReturn: ExporterOutput = {
    code: 1, // TODO: Find the applicable Pandoc exit code for faulty options
    stdout: [],
    stderr: [],
    targetFile: '' // This will be returned if no exporter has been found
  }

  // Now, pre-process the input files
  const processedFileDetails = await prepareFiles(options)

  // This is basically the "plugin API"
  const ctx: ExporterAPI = {
    runPandoc: async (defaults: string) => {
      return await runPandoc(defaults)
    },
    getDefaultsFor: async (writer: string, properties: Record<string, unknown>, frontmatter: Record<string, unknown>) => {
      return await writeDefaults(writer, properties, frontmatter)
    }
  }

  // Search for the correct plugin to run, and run it
  for (const plugin of PLUGINS) {
    const formats = plugin.pluginInformation().formats
    if (options.format in formats) {
      exporterReturn = await plugin.run(options, processedFileDetails, formatOptions, ctx)
      break
    }
  }

  return exporterReturn
}

async function runPandoc (defaultsFile: string): Promise<PandocRunnerOutput> {
  const output: PandocRunnerOutput = {
    code: 0,
    stdout: [],
    stderr: []
  }

  await new Promise<void>((resolve, reject) => {
    const pandocProcess = spawn('pandoc', [ '--defaults', `"${defaultsFile}"` ], {
      // NOTE: This has to be true, because of reasons unbeknownst to me, Pandoc
      // is unable to open the defaultsFile if it is not run from within a shell
      shell: true
    })

    pandocProcess.stdout.on('data', (data) => {
      output.stdout.push(String(data))
    })

    pandocProcess.stderr.on('data', (data) => {
      output.stderr.push(String(data))
    })

    pandocProcess.on('close', (code: number, signal) => {
      // Code should be 0. To check for errors, check that
      output.code = code
      resolve()
    })

    pandocProcess.on('error', (err) => {
      reject(err)
    })
  })

  // The data doesn't come in clean lines because it's a stream, but it will
  // include linefeeds. In order to enable easy checks (stderr.length === 0,
  // for example), clean up the output.
  output.stderr = output.stderr.join('').split('\n').filter(line => line.trim() !== '')
  output.stdout = output.stdout.join('').split('\n').filter(line => line.trim() !== '')

  return output
}

// REFERENCE: Full defaults file here: https://pandoc.org/MANUAL.html#default-files

async function writeDefaults (
  writer: string, // The writer to use (e.g. html or pdf)
  properties: Record<string, unknown>, // Contains properties that will be written to the defaults
  frontmatter: Record<string, unknown> // Extracted frontmatter details
): Promise<string> {
  const dataDir = app.getPath('temp')
  const defaultsFile = path.join(dataDir, 'defaults.yml')

  const defaults: any = await global.assets.getDefaultsFor(writer, 'export')

  // Use an HTML template if applicable TODO: Don't override that property, if it
  // has been customised by the user
  if (writer === 'html') {
    let tpl = await fs.readFile(path.join(__dirname, 'assets/export.tpl.htm'), { encoding: 'utf8' })
    defaults.template = path.join(dataDir, 'template.tpl')
    await fs.writeFile(defaults.template, tpl, { encoding: 'utf8' })
  }

  // Populate the variables section TODO: Migrate that to its own property
  // defaults.variables = global.config.get('pdf')

  // In order to facilitate file-only databases, we need to get the currently
  // selected database. This could break in a lot of places, but until Pandoc
  // respects a file-defined bibliography, this is our best shot.
  // const bibliography = global.citeproc.getSelectedDatabase()
  const bibliography: string = global.config.get('export.cslLibrary')
  if (bibliography !== undefined && isFile(bibliography)) {
    if ('bibliography' in defaults) {
      defaults.bibliography.push(bibliography)
    } else {
      defaults.bibliography = [bibliography]
    }
  }

  const cslStyle: string = global.config.get('export.cslStyle')
  if (isFile(cslStyle)) {
    defaults.csl = cslStyle
  }

  // makeDefaultsFile will take our input, put 'default' properties where they need to go,
  // and write any extra properties to an appropriate location within the object.
  // Finally input and output is validated against a JSONSchema and will throw an error if
  // validation fails.
  // frontmatter > additionalConfig > projectSettings when there are duplicate keys.
  const defaultsOutput = makeDefaultsFile(frontmatter, { additionalConfig: properties, projectSettings: defaults })

  const YAMLOptions: YAML.Options = {
    indent: 4,
    simpleKeys: false
  }
  await fs.writeFile(defaultsFile, YAML.stringify(defaultsOutput, YAMLOptions), { encoding: 'utf8' })

  // Return the path to the defaults file
  return defaultsFile
}
