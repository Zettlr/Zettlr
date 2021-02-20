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

import { promises as fs } from 'fs'
import path from 'path'
import makeImgPathsAbsolute from '../../../common/util/make-img-paths-absolute'
import { ExporterOptions } from './types'

export default async function (options: ExporterOptions): Promise<void> {
  // We want absolute paths if we're exporting to a different than the current directory,
  // and relative ones if we're exporting to the current (w/ absolute override possible).
  let willExportToSameDir = path.relative(options.dest, path.dirname(options.file.path)) === ''
  let absolutePathsOverride = options.absoluteImagePaths !== undefined && options.absoluteImagePaths
  let isTextBundle = [ 'textbundle', 'textpack' ].includes(options.format)

  // Allow overriding via explicitly set property on the options.
  let cnt = options.file.content
  if (!willExportToSameDir || isTextBundle || absolutePathsOverride) {
    cnt = makeImgPathsAbsolute(path.dirname(options.file.path), cnt)
  }

  const stripTags = global.config.get('export.stripTags') === true
  const stripLinks = global.config.get('export.stripLinks')
  const stripIDs = global.config.get('export.stripIDs') === true

  // Second strip tags if necessary
  if (stripTags) {
    cnt = cnt.replace(/(?<= |\n|^)##?[^\s,.:;…!?"'`»«“”‘’—–@$%&*#^+~÷\\/|<=>[\](){}]+#?/gi, '')
  }

  // Remove or unlink links.
  let ls: string = global.config.get('zkn.linkStart').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let le: string = global.config.get('zkn.linkEnd').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  if (stripLinks === 'full') {
    // Important: Non-greedy modifier needed to not strip out the whole text!
    cnt = cnt.replace(new RegExp(ls + '.+?' + le, 'g'), '')
  } else if (stripLinks === 'unlink') {
    // Only remove the link identifiers, not the content (note the capturing
    // group that's missing from above's replacement)
    cnt = cnt.replace(new RegExp(ls + '(.+?)' + le, 'g'), function (match, p1, offset, string) {
      return p1
    })
  }

  // Check if we should strip the IDs. We have to do IDs afterwards because
  // of the "at least 1"-modifier (+) in the link-unlink-regexes.
  if (stripIDs) {
    cnt = cnt.replace(new RegExp(global.config.get('zkn.idRE'), 'g'), '')
  }

  // Finally, save as temporary file.
  await fs.writeFile(options.sourceFile as string, cnt, 'utf8')
}
