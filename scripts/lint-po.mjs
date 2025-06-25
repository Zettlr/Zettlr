/**
 * BEGIN HEADER
 *
 * Contains:        PO file linter
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a very basic linter for PO files. This
 *                  runs our PO file parser over each PO file and sees if that
 *                  throws an error or works fine.
 *
 * END HEADER
 */

import { po } from 'gettext-parser'
import { promises as fs } from 'fs'
import { info, success, error, warn } from './console-colour.mjs'
import path from 'path'

const __dirname = process.platform === 'win32'
  ? path.dirname(decodeURI(import.meta.url.substring(8))) // file:///C:/...
  : path.dirname(decodeURI(import.meta.url.substring(7))) // file:///root/...

const rootDir = path.dirname(__dirname)
const poDir = path.join(rootDir, 'static/lang')

async function lintPOfiles () {
  const files = await fs.readdir(poDir)
  let failedFiles = 0

  for (const file of files) {
    if (!file.endsWith('.po')) {
      warn(`Unrecognized file in language directory: ${file}`)
      continue
    }

    // Ensure that the language files follow the correct naming specification.
    // That is: Only latin letters, digits, and hyphens. Some standards use
    // underscores, but Zettlr usually assumes hyphens.
    if (!/^[a-zA-Z0-9-]+\.po$/.test(file)) {
      error(`File "${file}" does not follow BCP 47 naming scheme ("xx-XX.po").`)
      failedFiles++
      continue
    }

    info(`Parsing ${file}...`)
    try {
      const contents = await fs.readFile(path.join(poDir, file), 'utf-8')
      po.parse(contents)
      success('Parse successful!')
    } catch (err) {
      error(`Could not parse file: ${err.message}`)
      console.error(err)
      failedFiles++
    }
  }

  if (failedFiles !== 0) {
    error(`PO linting failed: ${failedFiles} files could not be parsed.`)
    process.exit(1)
  } else {
    success('Done.')
  }
}

lintPOfiles().catch(err => console.error(err))
