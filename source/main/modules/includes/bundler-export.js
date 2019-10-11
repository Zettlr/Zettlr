/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        bundlerModule
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Makes either a textbundle or textpack
 *
 * END HEADER
 */

const fs = require('fs')
const path = require('path')
const ZIP = require('adm-zip')
const rimraf = require('rimraf')
const isFile = require('../../../common/util/is-file')

module.exports = function (options) {
  /*
   * We have to do the following (in order):
   * 1. Find all images in the Markdown file.
   * 2. Replace all Markdown images with the URL assets/<filename>.<ext>
   * 3. Create a textbundle folder with the Markdown filename
   * 4. Move that file into the bundle
   * 5. Create the assets subfolder
   * 6. Move all images into the assets subfolder.
   * 7. In case of a textpack, zip it and remove the original bundle.
   * 8. Don't open the file, but merely the containing folder.
   */

  // First of all we must make sure that the generated file is actually a
  // textbundle, and not a textpack.
  if (options.format === 'textpack') {
    options.targetFile = options.targetFile.replace('.textpack', '.textbundle')
  }

  // Load in the tempfile
  let cnt = fs.readFileSync(options.sourceFile, 'utf8')
  let imgRE = /!\[.*?\]\(([^)]+)\)/g
  let match
  let images = []

  while ((match = imgRE.exec(cnt)) !== null) {
    // We only care about images that are currently present on the filesystem.
    if (isFile(match[1])) {
      images.push({
        'old': match[1],
        'new': path.join('assets', path.basename(match[1]))
      })
    }
  }

  // Now replace all image filenames with the new ones
  for (let image of images) {
    cnt = cnt.replace(image.old, image.new)
  }

  // Create the textbundle folder
  try {
    fs.lstatSync(options.targetFile)
  } catch (e) {
    fs.mkdirSync(options.targetFile)
  }

  // Write the markdown file
  fs.writeFileSync(path.join(options.targetFile, 'text.md'), cnt, 'utf8')

  // Create the assets folder
  try {
    fs.lstatSync(path.join(options.targetFile, 'assets'))
  } catch (e) {
    fs.mkdirSync(path.join(options.targetFile, 'assets'))
  }

  // Copy over all images
  for (let image of images) {
    fs.copyFileSync(image.old, path.join(options.targetFile, image.new))
  }

  // Finally, create the info.json
  fs.writeFileSync(path.join(options.targetFile, 'info.json'), JSON.stringify({
    'version': 2,
    'type': 'net.daringfireball.markdown',
    'creatorIdentifier': 'com.zettlr.app',
    'sourceURL': path.basename(options.file.path)
  }), 'utf8')

  // As a last step, check whether or not we should actually create a textpack
  if (options.format === 'textpack') {
    // Zip dat shit!
    let archive = new ZIP()
    let zipName = options.targetFile.replace('.textbundle', '.textpack')
    // From the docs: If you want to create a directory the entryName must end
    // in / and a null buffer should be provided.
    let root = path.basename(options.targetFile)
    if (root.charAt(root.length - 1) !== '/') root += '/'
    archive.addFile(root, Buffer.alloc(0))
    archive.addLocalFolder(options.targetFile, path.basename(options.targetFile))
    archive.writeZip(zipName)
    // Afterwards remove the source file
    rimraf(options.targetFile, () => { /* Nothing to do */ })
    // Now we need to overwrite the targetFile with the zipName
    options.targetFile = zipName
  }
}
