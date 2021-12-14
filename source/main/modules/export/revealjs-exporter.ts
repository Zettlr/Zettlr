/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        reveal.JS exporter plugin
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin enables exports into reveal.js. It is not
 *                  implemented in the default exporter because what we want is
 *                  that the user can choose a theme and receives additionally
 *                  a fully standalone file.
 *
 * END HEADER
 */

import commandExists from 'command-exists'
import { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI } from './types'
import { promises as fs } from 'fs'
import path from 'path'
import { trans } from '@common/i18n-main'
import sanitize from 'sanitize-filename'

export const plugin: ExporterPlugin = {
  pluginInformation: function () {
    return {
      id: 'revealExporter',
      formats: {
        'revealjs': 'reveal.JS Presentation'
      },
      options: [
        {
          model: 'style',
          type: 'select',
          label: 'Presentation Style',
          options: {
            'black': 'Black',
            'moon': 'Moon',
            'league': 'League',
            'sky': 'Sky',
            'beige': 'Beige',
            'solarized': 'Solarized',
            'serif': 'Serif',
            'white': 'White'
          },
          initialValue: 'black'
        }
      ]
    }
  },
  run: async function (options: ExporterOptions, sourceFiles: string[], formatOptions: any, ctx: ExporterAPI): Promise<ExporterOutput> {
    // Determine the availability of Pandoc. As the Pandoc path is added to
    // process.env.PATH during the environment check, this should always work
    // if a supported Zettlr variant is being used. In other cases (e.g. custom
    // 32 bit builds) users can manually add a path. In any case, the exporter
    // requires Pandoc, and if it's not there we fail.
    try {
      await commandExists('pandoc')
    } catch (err) {
      throw new Error(trans('system.error.no_pandoc_message'))
    }

    // First file determines the target name
    const target = path.basename(options.sourceFiles[0].name, options.sourceFiles[0].ext)
    const title = (options.defaultsOverride?.title !== undefined) ? sanitize(options.defaultsOverride.title, { replacement: '-' }) : target
    const targetPath = path.join(options.targetDirectory, title + '.revealjs')

    // Get the corresponding defaults file
    const defaultKeys = {
      'input-files': sourceFiles,
      'output-file': targetPath,
      'standalone': false // Make sure to override funny stuff by the user
    }
    const defaultsFile = await ctx.getDefaultsFor('revealjs', defaultKeys)

    // Run Pandoc
    const pandocOutput = await ctx.runPandoc(defaultsFile)

    const output: ExporterOutput = {
      code: pandocOutput.code,
      stdout: pandocOutput.stdout,
      stderr: pandocOutput.stderr,
      targetFile: ''
    }

    // revealJS needs no *pre*paration, but postparation, if that is even
    // a word. This is because Pandoc can't handle inline JavaScript.
    const outputFile = await makeRevealJS(targetPath, formatOptions.style)
    output.targetFile = outputFile

    // Make sure to propagate the results
    return output
  }
}

function getSkylightingTheme (revealStyle: string): string {
  let isDarkStyle = [ 'black', 'moon', 'league', 'sky' ].includes(revealStyle)
  return (isDarkStyle) ? 'skylighting-dark.css' : 'skylighting-light.css'
}

async function makeRevealJS (
  sourceFile: string,
  styleFile: string = 'white',
  titleOverride?: string
): Promise<string> {
  // When this module is called, Pandoc had a run over the file already,
  // so all we need to do is read the file Pandoc has produced (it's
  // decidedly NOT standalone so we only have the body parts) which we
  // need to wrap in our custom template now.
  let file = await fs.readFile(sourceFile, { encoding: 'utf8' })
  // Unlink the file, because it has the ending '.revealjs', which
  // the operating system won't open either way.
  await fs.unlink(sourceFile)
  sourceFile = sourceFile + '.htm' // Make sure it's HTML

  // Load the template and the corresponding stylesheet.
  let revealTpl = path.join(__dirname, './assets/template.revealjs.htm')
  let tpl = await fs.readFile(revealTpl, { encoding: 'utf8' })

  let revealStyle = path.join(__dirname, `./assets/revealjs-styles/${styleFile}.css`)
  let style = await fs.readFile(revealStyle, { encoding: 'utf8' })

  let skylightingStyle = path.join(__dirname, `./assets/revealjs-styles/${getSkylightingTheme(styleFile)}`)
  let skylight = await fs.readFile(skylightingStyle, { encoding: 'utf8' })

  let title = path.basename(sourceFile)

  if (titleOverride !== undefined) {
    title = titleOverride
  }

  // Now do the magic
  tpl = tpl.replace('$style$', style)
  tpl = tpl.replace('$body$', file)
  tpl = tpl.replace('$title$', title)
  tpl = tpl.replace('$SKYLIGHTING_THEME$', skylight)

  await fs.writeFile(sourceFile, tpl, 'utf8')

  return sourceFile
}
