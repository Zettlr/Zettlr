/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Function that is able to import TextBundles and TextPacks.
 *
 * END HEADER
 */

import path from 'path'
import { promises as fs } from 'fs'
import { app } from 'electron'
import ZIP from 'adm-zip'

import { trans } from '@common/i18n-main'
import isFile from '@common/util/is-file'
import type { DirDescriptor } from '@dts/common/fsal'

/**
 * Imports both textpacks and textbundles to the target directory.
 * @param  {Object} bundle The file object as returned by the integrity checker
 * @param  {String} target The destination directory
 * @return {void}        This thing only throws up.
 */
export default async function importTextbundle (bundle: any, target: DirDescriptor): Promise<void> {
  if (bundle.knownFormat === 'textpack') {
    // We need to unzip it before importing.
    let file = new ZIP(bundle.path)
    file.extractAllTo(app.getPath('temp'), true) // Extract everything
    // Now modify the bundle so that the importer can do something with it
    let parent = file.getEntries()[0].entryName
    // It may be that there is no extra entry for the containing textbundle
    // directory. In that case, traverse up one level
    if (path.extname(parent) !== '.textbundle') {
      parent = path.dirname(parent)
    }
    // Second time check, in case the generating ZIP library has put an image
    // in the assets folder at entry position 0.
    if (path.extname(parent) !== '.textbundle') {
      parent = path.dirname(parent)
    }
    bundle.path = path.join(app.getPath('temp'), parent)
    bundle.knownFormat = 'textbundle'
  }

  // Now we have for sure a textbundle which we can extract.
  let mdName = path.join(target.path, path.basename(bundle.path, path.extname(bundle.path))) + '.md'
  let assets = path.join(target.path, 'assets')

  // First copy over the markdown file (which may have ANY extension)
  let bdl = await fs.readdir(bundle.path)
  let foundMDFile = false
  for (let f of bdl) {
    if (f.indexOf('text.') === 0) {
      foundMDFile = true
      // Gotcha
      await fs.copyFile(path.join(bundle.path, f), mdName)
      break
    }
  }

  if (!foundMDFile) {
    throw new Error(trans('Malformed Textbundle: %s', path.basename(bundle.path)))
  }

  // Now the assets
  try {
    bdl = await fs.readdir(path.join(bundle.path, 'assets'))
  } catch (err) {
    throw new Error(trans('Malformed Textbundle: %s', path.basename(bundle.path)))
  }

  if (bdl.length > 0) {
    // If there are assets to be copied, make sure the directory exists
    try {
      await fs.lstat(assets)
    } catch (err) {
      await fs.mkdir(assets)
    }
  }

  // Now simply copy over all files
  for (let f of bdl) {
    if (isFile(path.join(bundle.path, 'assets', f))) {
      await fs.copyFile(path.join(bundle.path, 'assets', f), path.join(assets, f))
    }
  }

  // Import should be complete now
}
