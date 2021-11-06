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

// Utilities
import isFile from '../../../common/util/is-file'

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
    code: 6, // See https://pandoc.org/MANUAL.html#exit-codes
    stdout: [],
    stderr: [],
    targetFile: '' // This will be returned if no exporter has been found
  }

  global.log.verbose(`[Exporter] Exporting ${options.sourceFiles.length} files to ${options.targetDirectory}`)

  const inputFiles = options.sourceFiles.map(file => file.path)

  // This is basically the "plugin API"
  const ctx: ExporterAPI = {
    runPandoc: async (defaults: string) => {
      return await runPandoc(defaults, options.cwd)
    },
    getDefaultsFor: async (writer: string, properties: any) => {
      // Inject additional properties from the global exporter options here
      const cslOverride = (typeof options.cslStyle === 'string') ? options.cslStyle : undefined
      const titleOverride = (typeof options.title === 'string') ? options.title : undefined
      return await writeDefaults(writer, properties, cslOverride, titleOverride)
    }
  }

  // Search for the correct plugin to run, and run it
  for (const plugin of PLUGINS) {
    const formats = plugin.pluginInformation().formats
    if (options.format in formats) {
      global.log.verbose(`[Exporter] Running ${plugin.pluginInformation().id} exporter ...`)
      exporterReturn = await plugin.run(options, inputFiles, formatOptions, ctx)
      break
    }
  }

  return exporterReturn
}

async function runPandoc (defaultsFile: string, cwd?: string): Promise<PandocRunnerOutput> {
  const output: PandocRunnerOutput = {
    code: 0,
    stdout: [],
    stderr: []
  }

  await new Promise<void>((resolve, reject) => {
    const pandocProcess = spawn('pandoc', [ '--defaults', `"${defaultsFile}"` ], {
      // NOTE: This has to be true, because of reasons unbeknownst to me, Pandoc
      // is unable to open the defaultsFile if it is not run from within a shell
      shell: true,
      cwd: cwd
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
  properties: any, // Contains properties that will be written to the defaults
  cslOverride?: string,
  titleOverride?: string
): Promise<string> {
  const dataDir = app.getPath('temp')
  const defaultsFile = path.join(dataDir, 'defaults.yml')

  const defaults: any = await global.assets.getDefaultsFor(writer, 'export')

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
  if (cslOverride !== undefined && isFile(cslOverride)) {
    defaults.csl = cslOverride
  } else if (isFile(cslStyle)) {
    defaults.csl = cslStyle
  }

  // Now add metadata values for our GUI settings the user can choose. NOTE that
  // users can also add these manually to their files if they prefer. This way
  // any file's metadata will overwrite anything defined programmatically here
  // in the defaults.
  if (!('metadata' in defaults)) {
    defaults.metadata = {}
  }

  if (!('zettlr' in defaults.metadata)) {
    defaults.metadata.zettlr = {}
  }

  defaults.metadata.zettlr.strip_tags = Boolean(global.config.get('export.stripTags'))
  defaults.metadata.zettlr.strip_links = String(global.config.get('export.stripLinks'))
  defaults.metadata.zettlr.link_start = String(global.config.get('zkn.linkStart'))
  defaults.metadata.zettlr.link_end = String(global.config.get('zkn.linkEnd'))

  if (titleOverride !== undefined) {
    defaults.metadata.title = titleOverride
  }

  // Add all filters which are within the userData/lua-filter directory.
  if (!('filters' in defaults)) {
    defaults.filters = []
  }

  const filters = await global.assets.getAllFilters()
  defaults.filters = defaults.filters.concat(filters)

  // After we have added our default keys, let the plugin add their keys, which
  // enables them to override certain keys if necessary.
  for (const key in properties) {
    defaults[key] = properties[key]
  }

  const YAMLOptions: YAML.Options = {
    indent: 4,
    simpleKeys: false
  }
  await fs.writeFile(defaultsFile, YAML.stringify(defaults, YAMLOptions), { encoding: 'utf8' })

  // Return the path to the defaults file
  return defaultsFile
}
