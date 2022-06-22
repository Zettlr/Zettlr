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
import isFile from '@common/util/is-file'

// Exporters
import { DefaultsOverride, ExporterAPI, ExporterOptions, ExporterOutput, PandocRunnerOutput } from './types'
import { plugin as DefaultExporter } from './default-exporter'
import { plugin as PDFExporter } from './pdf-exporter'
import { plugin as TextbundleExporter } from './textbundle-exporter'
import AssetsProvider from '@providers/assets'
import LogProvider from '@providers/log'
import { PandocProfileMetadata } from '@dts/common/assets'

/**
 * This function returns faux metadata for the custom export formats the
 * exporter supports which circumvent (or build upon) the Pandoc exporter. These
 * are not defined as regular defaults files, therefore we need to output them
 * here.
 *
 * @return  {PandocProfileMetadata[]}The additional profiles
 */
export function getCustomProfiles (): PandocProfileMetadata[] {
  return [
    {
      name: 'Textbundle.yaml', // Fake name
      reader: 'markdown', // Not completely the truth
      writer: 'textbundle', // Not even supported by Pandoc
      isInvalid: false // IT'S ALL FAKE!
    },
    {
      name: 'Textpack.yaml',
      reader: 'markdown',
      writer: 'textpack',
      isInvalid: false
    },
    {
      name: 'Simple PDF.yaml',
      reader: 'markdown',
      writer: 'simple-pdf',
      isInvalid: false
    }
  ]
}

const PLUGINS = {
  'pandoc': DefaultExporter,
  'simple-pdf': PDFExporter,
  'textbundle': TextbundleExporter
}

/**
 * Runs the exporter.
 *
 * @param   {ExporterOptions}  options             The options needed to facilitate the export.
 * @param   {any}              [formatOptions={}]  These are options possibly required by a plugin.
 *
 * @return  {Promise<ExporterOutput>}              Resolves with an info object.
 */
export async function makeExport (
  options: ExporterOptions,
  logger: LogProvider,
  config: ConfigProvider,
  assets: AssetsProvider
): Promise<ExporterOutput> {
  // We already know where the exported file will end up, so set the property
  const inputFiles = options.sourceFiles.map(file => file.path)

  // This is basically the "plugin API"
  const ctx: ExporterAPI = {
    runPandoc: async (defaults: string) => {
      return await runPandoc(logger, defaults, options.cwd)
    },
    getDefaultsFor: async (filename: string, properties: any = {}) => {
      return await writeDefaults(filename, properties, config, assets, options.defaultsOverride)
    },
    listDefaults: async () => {
      return await assets.listDefaults()
    }
  }

  // Search for the correct plugin to run, and run it. First the custom ones ...
  if ([ 'textbundle', 'textpack' ].includes(options.profile.writer)) {
    return await PLUGINS.textbundle.run(options, inputFiles, ctx)
  } else if (options.profile.writer === 'simple-pdf') {
    return await PLUGINS['simple-pdf'].run(options, inputFiles, ctx)
  } else {
    // ... otherwise run the regular Pandoc exporter.
    return await PLUGINS.pandoc.run(options, inputFiles, ctx)
  }
}

async function runPandoc (logger: LogProvider, defaultsFile: string, cwd?: string): Promise<PandocRunnerOutput> {
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

  if (output.stdout.length > 0) {
    logger.info('This Pandoc run produced additional output.', output.stdout)
  }

  return output
}

// REFERENCE: Full defaults file here: https://pandoc.org/MANUAL.html#default-files

async function writeDefaults (
  filename: string, // The profile to use
  properties: any, // Contains properties that will be written to the defaults
  config: ConfigProvider,
  assets: AssetsProvider,
  defaultsOverride?: DefaultsOverride
): Promise<string> {
  const defaultsFile = path.join(app.getPath('temp'), 'defaults.yml')

  const defaults: any = await assets.getDefaultsFile(filename)

  // In order to facilitate file-only databases, we need to get the currently
  // selected database. This could break in a lot of places, but until Pandoc
  // respects a file-defined bibliography, this is our best shot.
  // const bibliography = global.citeproc.getSelectedDatabase()
  const bibliography: string = config.get('export.cslLibrary')
  if (bibliography !== undefined && isFile(bibliography)) {
    if ('bibliography' in defaults) {
      defaults.bibliography.push(bibliography)
    } else {
      defaults.bibliography = [bibliography]
    }
  }

  const cslStyle: string = config.get('export.cslStyle')
  if (defaultsOverride?.csl !== undefined && isFile(defaultsOverride.csl)) {
    defaults.csl = defaultsOverride.csl
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

  defaults.metadata.zettlr.strip_tags = Boolean(config.get('export.stripTags'))
  defaults.metadata.zettlr.strip_links = String(config.get('export.stripLinks'))
  defaults.metadata.zettlr.link_start = String(config.get('zkn.linkStart'))
  defaults.metadata.zettlr.link_end = String(config.get('zkn.linkEnd'))

  // Potentially override allowed defaults properties
  if (defaultsOverride?.title !== undefined) {
    defaults.metadata.title = defaultsOverride.title
  }

  if (defaultsOverride?.template !== undefined) {
    defaults.template = defaultsOverride.template
  }

  // Add all filters which are within the userData/lua-filter directory.
  if (!('filters' in defaults)) {
    defaults.filters = []
  }

  const filters = await assets.getAllFilters()
  defaults.filters = defaults.filters.concat(filters)

  // After we have added our default keys, let the plugin add their keys, which
  // enables them to override certain keys if necessary.
  for (const key in properties) {
    defaults[key] = properties[key]
  }

  const YAMLOptions = {
    indent: 4,
    simpleKeys: false
  }
  await fs.writeFile(defaultsFile, YAML.stringify(defaults, YAMLOptions), { encoding: 'utf8' })

  // Return the path to the defaults file
  return defaultsFile
}
