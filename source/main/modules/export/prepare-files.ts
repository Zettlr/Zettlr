/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        prepareFile
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Prepares a Markdown file for export
 *
 * END HEADER
 */

import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import makeImgPathsAbsolute from '../../../common/util/make-img-paths-absolute'
import { ExporterOptions } from './types'

export default async function prepareFiles (options: ExporterOptions): Promise<string[]> {
  // Retrieve our options
  const { sourceFiles, targetDirectory, absoluteImagePaths } = options

  // Prepare some variables we will need throughout preparation
  let willExportToSameDir = true
  for (const file of sourceFiles) {
    if (path.relative(targetDirectory, file.dir) !== '') {
      willExportToSameDir = false
      break
    }
  }

  const absolutePathsOverride = absoluteImagePaths !== undefined && absoluteImagePaths

  const isTextBundle = [ 'textbundle', 'textpack' ].includes(options.format)

  // Retain all absolute filepaths so we can return these. We will save the
  // intermediary files to the temporary directory.
  const returnFilenames = []
  const tempDir = app.getPath('temp')

  // Get configuration options which determine how we prepare the files
  const stripTags = Boolean(global.config.get('export.stripTags'))
  const stripLinks = global.config.get('export.stripLinks')
  const stripIDs = global.config.get('export.stripIDs') === true
  const ls: string = global.config.get('zkn.linkStart').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const le: string = global.config.get('zkn.linkEnd').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const idRE: string = global.config.get('zkn.idRE')

  // Now iterate over the files and prepare the contents of these files.
  for (const descriptor of sourceFiles) {
    let fileContents = await fs.readFile(descriptor.path, 'utf8')

    // Turns my-file.md into my-file.intermediary.md
    const intermediaryFilename = path.basename(descriptor.path, descriptor.ext) + '.intermediary' + descriptor.ext
    const absPath = path.join(tempDir, intermediaryFilename)

    // Make sure to remember the path
    returnFilenames.push(absPath)

    // Make image paths absolute, if applicable
    if (!willExportToSameDir || isTextBundle || absolutePathsOverride) {
      fileContents = makeImgPathsAbsolute(descriptor.dir, fileContents)
    }

    // Strip tags, if applicable
    if (stripTags) {
      fileContents = fileContents.replace(/(?<= |\n|^)##?[^\s,.:;…!?"'`»«“”‘’—–@$%&*#^+~÷\\/|<=>[\](){}]+#?/gi, '')
    }

    // Strip links, if applicable
    if (stripLinks === 'full') {
      // Important: Non-greedy modifier needed to not strip out the whole text!
      fileContents = fileContents.replace(new RegExp(ls + '.+?' + le, 'g'), '')
    } else if (stripLinks === 'unlink') {
      // Only remove the link identifiers, not the content (note the capturing
      // group that's missing from above's replacement)
      fileContents = fileContents.replace(new RegExp(ls + '(.+?)' + le, 'g'), function (match, p1, offset, string) {
        return p1
      })
    }

    // Check if we should strip the IDs. We have to do IDs afterwards because
    // of the "at least 1"-modifier (+) in the link-unlink-regexes.
    if (stripIDs) {
      fileContents = fileContents.replace(new RegExp(idRE, 'g'), '')
    }

    // Finally, write the processed file
    await fs.writeFile(absPath, fileContents)
  }

  return returnFilenames
}
