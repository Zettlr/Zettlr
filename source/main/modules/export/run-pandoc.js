/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        runPandoc
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Runs the Pandoc command with the given options.
 *
 * END HEADER
 */

const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process')
const commandExists = require('command-exists')
const { trans } = require('../../../common/lang/i18n')
const isFile = require('../../../common/util/is-file')

module.exports = async function (options) {
  // Pull in the pandoc command from config
  let command = global.config.get('pandocCommand')

  let hasPandoc = true
  let hasLaTeX = true
  try {
    await commandExists('pandoc')
  } catch (err) {
    hasPandoc = false
  }
  try {
    await commandExists('xelatex')
  } catch (err) {
    hasLaTeX = false
  }

  // This is the right time & place to check for
  // the existence of the respective binaries
  if (!hasPandoc && options.format !== 'html') {
    throw new Error(trans('system.error.no_pandoc_message'), trans('system.error.no_pandoc_title'))
  }

  // No matter what, for pdf we always need pandoc + latex installed.
  if (!hasLaTeX && options.format === 'pdf') {
    throw new Error(trans('system.error.no_xelatex_message'), trans('system.error.no_xelatex_title'))
  }

  // Also check if we can have pandoc-citeproc run over the file
  let citeproc = ''
  if (isFile(global.config.get('export.cslLibrary'))) {
    citeproc += `--filter pandoc-citeproc --bibliography "${global.config.get('export.cslLibrary')}"`
  }

  if (options.hasOwnProperty('cslStyle') && isFile(options.cslStyle)) {
    citeproc += ` --csl "${options.cslStyle}"`
  }

  // Pandoc flags to be passed to the compiler
  let pandocFlags = {
    'tpl': (options.template) ? `--template="${options.template}"` : '',
    'infile': options.sourceFile,
    'toc': (options.pdf.toc && options.format === 'pdf') ? '--toc' : '',
    'tocdepth': (options.pdf.tocDepth) ? '--toc-depth=' + options.pdf.tocDepth : '',
    'citeproc': citeproc,
    'outfile': options.targetFile,
    'outflag': '-t ' + ((options.format === 'pdf') ? 'latex' : options.format),
    'format': options.format,
    'standalone': (options.standalone) ? '-s' : '',
    'indir': path.dirname(options.sourceFile),
    'infile_basename': path.basename(options.sourceFile),
    'outfile_basename': path.basename(options.targetFile)
  }

  // Recursively replace all flags in the command
  for (let key in pandocFlags) {
    command = command.replace(new RegExp('\\$' + key + '\\$', 'g'), pandocFlags[key])
  }

  // Finally, run the command.
  return new Promise((resolve, reject) => {
    global.log.info(`Running Pandoc with command: ${command}`)
    exec(command, { 'cwd': options.dest }, async (error, stdout, stderr) => {
      // Remove both the temporary source file and the template (if applicable)
      try {
        await fs.unlink(options.sourceFile)
        if (options.discardTemplate) await fs.unlink(options.template)
      } catch (err) {
        reject(new Error(trans('system.error.export_temp_file', options.sourceFile)))
      }
      if (error) {
        // We can't instantiate an error object, because any
        // additional properties will simply be dropped on IPC send.
        let err = {}
        err.title = trans('system.error.export_error_title')
        err.message = trans('system.error.export_error_message', error.cmd)
        err.additionalInfo = stderr // Pandoc sometimes produces helpful stuff
        return reject(err)
      }

      resolve()
    })
  })
}
