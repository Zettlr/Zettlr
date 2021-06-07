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
import { EOL } from 'os'
import { ExporterOptions } from './types'
import { getFnExportRE } from '../../../common/regular-expressions'
import { promises as fs } from 'fs'
import makeImgPathsAbsolute from '../../../common/util/make-img-paths-absolute'
import path from 'path'

export default async function prepareFiles (options: ExporterOptions): Promise<string[]> {
  // Retrieve our options
  const { sourceFiles, targetDirectory, absoluteImagePaths } = options
  // TODO; Matt. Push this back up to be a selectable option. Default true.
  const skipReplaceFootnoteIDs = true
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
  const returnFilenames: string[] = []
  const tempDir = app.getPath('temp')

  // Get configuration options which determine how we prepare the files
  const stripTags = Boolean(global.config.get('export.stripTags'))
  const stripLinks = global.config.get('export.stripLinks')
  const stripIDs = global.config.get('export.stripIDs') === true
  const ls: string = global.config.get('zkn.linkStart').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const le: string = global.config.get('zkn.linkEnd').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const idRE: string = global.config.get('zkn.idRE')

  const fnExportRE = getFnExportRE(true) // We want the multiline version.

  // Do our file reads upfront, rather than waiting each time within the loop.
  let promiseArr: Array<Promise<string>> = []
  sourceFiles.forEach(element => {
    promiseArr.push(fs.readFile(element.path, 'utf8')) // TODO: Matt. Chardet each file, should make decoding more accurate though UTF-8 is sane.
  })
  const contentsArr = await Promise.all(promiseArr)

  // We can start our file output within the loop to save time.
  // We can resolve this array of promises before we leave the function.
  const outputPromiseArr: Array<Promise<void>> = []

  /* Process our document content depending on set options.
  *
  * - Generate intermediary file path
  * - Make image paths absolute
  * - Replace Footnote IDs
  * - Strip Tags
  * - Strip Links
  * - Strip IDs
  * - Trim trailing whitespace
  * - Append platform appropriate EOLs
  * - Promise that we'll write the intermediary file.
  */
  contentsArr.forEach((value, index) => {
    let fileContent = value
    const intermediaryFilename = `${path.basename(sourceFiles[index].path, sourceFiles[index].ext)}.intermediary${sourceFiles[index].ext}`
    const intermediaryAbsolutePath = path.join(tempDir, intermediaryFilename)
    returnFilenames.push(intermediaryAbsolutePath)

    // Make image paths absolute, if applicable
    if (!willExportToSameDir || isTextBundle || absolutePathsOverride) {
      fileContent = makeImgPathsAbsolute(sourceFiles[index].dir, fileContent)
    }

    if (!skipReplaceFootnoteIDs) {
      fileContent = fileContent.replace(fnExportRE, (match, p1: string, offset, string) => `[^${String(sourceFiles[index].hash)}${p1}]`)
    }

    // Strip tags, if applicable
    if (stripTags) {
      fileContent = fileContent.replace(/(?<= |\n|^)##?[^\s,.:;…!?"'`»«“”‘’—–@$%&*#^+~÷\\/|<=>[\](){}]+#?/gi, '')
    }

    if (stripLinks === 'full') {
      // Important: Non-greedy modifier needed to not strip out the whole text!
      fileContent = fileContent.replace(new RegExp(ls + '.+?' + le, 'g'), '')
    } else if (stripLinks === 'unlink') {
      // Only remove the link identifiers, not the content (note the capturing
      // group that's missing from above's replacement)
      fileContent = fileContent.replace(new RegExp(ls + '(.+?)' + le, 'g'), function (match, p1, offset, string) {
        return p1
      })
    }

    // Check if we should strip the IDs. We have to do IDs last because
    // of the "at least 1"-modifier (+) in the link-unlink-regexes.
    if (stripIDs) {
      fileContent = fileContent.replace(new RegExp(idRE, 'g'), '')
    }

    // Start our IO here and tidyup later on.
    outputPromiseArr.push(fs.writeFile(intermediaryAbsolutePath, `${fileContent.trim()}${EOL}${EOL}`))
  })

  await Promise.all(outputPromiseArr)

  return returnFilenames
}
