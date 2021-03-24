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

import commandExists from 'command-exists'
import path from 'path'
import { spawn } from 'child_process'

import makeTextbundle from './make-textbundle'
import prepareFile from './prepare-file'
import { ExporterOptions } from './types'
import writeDefaults from './write-defaults'
import makeRevealJS from './make-reveal'

interface PandocRunnerOutput {
  code: number
  stdout: string[]
  stderr: string[]
}

interface ExporterOutput extends PandocRunnerOutput {
  targetFile: string
}

export default async function makeExport (options: ExporterOptions): Promise<ExporterOutput> {
  // Determine the availability of Pandoc. As the Pandoc path is added to
  // process.env.PATH during the environment check, this should always work
  // if a supported Zettlr variant is being used. In other cases (e.g. custom
  // 32 bit builds) users can manually add a path. In any case, the exporter
  // requires Pandoc, and if it's not there we fail.
  try {
    await commandExists('pandoc')
  } catch (err) {
    throw new Error('Cannot run exporter: Pandoc has not been found.')
  }

  // DEBUG: Remove that eventually and replace by something better.
  if (options.format === 'pdf') {
    try {
      await commandExists('xelatex')
    } catch (err) {
      throw new Error('Cannot run exporter: XeLaTeX has not been found.')
    }
  }

  // A small preparation step in case we have a revealjs
  // export to keep the switch below lean
  if (/^revealjs/.test(options.format)) {
    options.revealJSStyle = options.format.substr(9) as ExporterOptions['revealJSStyle']
    options.format = 'revealjs'
  }

  // We already know where the exported file will end up, so set the property
  let filename = path.basename(options.file.path, path.extname(options.file.path))
  filename += '.' + options.format
  options.targetFile = path.join(options.dest, filename)
  options.sourceFile = path.join(options.dest, 'export.tmp')

  // Now we can prepare our return
  const exporterReturn: ExporterOutput = {
    code: 0,
    stdout: [],
    stderr: [],
    targetFile: options.targetFile
  }

  // Now, prepare the input file
  await prepareFile(options)

  // Make sure the file endings are correct
  if (options.format === 'plain') {
    options.targetFile = options.targetFile.replace('.plain', '.txt')
  }
  if (options.format === 'latex') {
    options.targetFile = options.targetFile.replace('.latex', '.tex')
  }

  if ([ 'textbundle', 'textpack' ].includes(options.format)) {
    // Make a Textbundle
    await makeTextbundle(
      options.sourceFile,
      options.targetFile,
      options.format === 'textpack',
      path.basename(options.file.path)
    )
  } else {
    // Run Pandoc
    const defaultsFile = await writeDefaults(options.format, options.sourceFile, options.targetFile)
    const pandocOutput = await runPandoc(defaultsFile)
    // Make sure to propagate the results
    exporterReturn.code = pandocOutput.code
    exporterReturn.stdout = pandocOutput.stdout
    exporterReturn.stderr = pandocOutput.stderr
  }

  // revealJS needs no *pre*paration, but postparation, if that is even
  // a word. This is because Pandoc can't handle inline JavaScript.
  if (options.format === 'revealjs') {
    const outputFile = await makeRevealJS(options.targetFile, options.revealJSStyle)
    options.targetFile = outputFile
  }

  return exporterReturn
}

async function runPandoc (defaultsFile: string): Promise<PandocRunnerOutput> {
  const output: PandocRunnerOutput = {
    code: 0,
    stdout: [],
    stderr: []
  }

  let binary = 'pandoc'

  await new Promise<void>((resolve, reject) => {
    const pandocProcess = spawn(binary, [ '--defaults', `"${defaultsFile}"` ], {
      // NOTE: This has to be true, because of reasons unbeknownst to me, Pandoc
      // is unable to open the defaultsFile if it is not run from within a shell
      shell: true
    })

    pandocProcess.stdout.on('data', (data) => {
      console.log('PANDOC OUT: ' + String(data))
      output.stdout.push(String(data))
    })

    pandocProcess.stderr.on('data', (data) => {
      console.log('PANDOC ERR: ' + String(data))
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
