import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import isFile from '../../../common/util/is-file'
import YAML from 'yaml'

// REFERENCE: Full defaults file here: https://pandoc.org/MANUAL.html#default-files

export default async function writeDefaults (
  writer: string, // The writer to use (e.g. html or pdf)
  sourceFile: string,
  targetFile: string
): Promise<string> {
  const dataDir = app.getPath('temp')
  const defaultsFile = path.join(dataDir, 'defaults.yml')

  const defaults: any = await global.assets.getDefaultsFor(writer)
  defaults['output-file'] = targetFile
  defaults['input-files'] = [
    sourceFile // NOTE: Can be even more files!
  ]

  defaults.metadata = {
    author: [],
    lang: global.config.get('appLang'),
    title: path.basename(sourceFile, path.extname(sourceFile))
  }

  // Use an HTML template if applicable
  if (writer === 'html') {
    let tpl = await fs.readFile(path.join(__dirname, 'assets/export.tpl.htm'), { encoding: 'utf8' })
    defaults.template = path.join(dataDir, 'template.tpl')
    await fs.writeFile(defaults.template, tpl, { encoding: 'utf8' })
  }

  // TODO: LaTeX template

  // Check if we need standalone
  if ([ 'html', 'latex', 'rtf' ].includes(writer)) {
    defaults.standalone = true
  } else if (writer === 'revealjs') {
    defaults.standalone = false
  }

  // Populate the variables section TODO: Migrate that to its own property
  defaults.variables = global.config.get('pdf')

  // Populate the default author name
  defaults.metadata.author.push(global.config.get('pdf').author)

  // In order to facilitate file-only databases, we need to get the currently
  // selected database. This could break in a lot of places, but until Pandoc
  // respects a file-defined bibliography, this is our best shot.
  // const bibliography = global.citeproc.getSelectedDatabase()
  const bibliography: string = global.config.get('export.cslLibrary')
  if (bibliography !== undefined && isFile(bibliography)) {
    console.log('Adding database ' + bibliography)
    defaults.bibliography.push(bibliography)
  }

  const cslStyle: string = global.config.get('export.cslStyle')
  if (isFile(cslStyle)) {
    defaults.csl = cslStyle
  }

  const YAMLOptions: YAML.Options = {
    indent: 2,
    simpleKeys: false
  }
  await fs.writeFile(defaultsFile, YAML.stringify(defaults, YAMLOptions), { encoding: 'utf8' })

  return defaultsFile
}
