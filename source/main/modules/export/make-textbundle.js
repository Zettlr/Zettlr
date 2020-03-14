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

const fs = require('fs').promises
const writeStream = require('fs').createWriteStream
const path = require('path')
const archiver = require('archiver')
const rimraf = require('rimraf')
const isFile = require('../../../common/util/is-file')

module.exports = async function (options) {
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
  // textbundle, and not a textpack. This way we can simply zip the bundle.
  if (options.format === 'textpack') {
    options.targetFile = options.targetFile.replace('.textpack', '.textbundle')
  }

  // Load in the tempfile
  let cnt = await fs.readFile(options.sourceFile, 'utf8')
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
    await fs.lstat(options.targetFile)
  } catch (e) {
    await fs.mkdir(options.targetFile)
  }

  // Write the markdown file
  await fs.writeFile(path.join(options.targetFile, 'text.md'), cnt, { encoding: 'utf8' })

  // Create the assets folder
  try {
    await fs.lstat(path.join(options.targetFile, 'assets'))
  } catch (e) {
    await fs.mkdir(path.join(options.targetFile, 'assets'))
  }

  // Copy over all images
  for (let image of images) {
    await fs.copyFile(image.old, path.join(options.targetFile, image.new))
  }

  // Finally, create the info.json
  await fs.writeFile(path.join(options.targetFile, 'info.json'), JSON.stringify({
    'version': 2,
    'type': 'net.daringfireball.markdown',
    'creatorIdentifier': 'com.zettlr.app',
    'sourceURL': path.basename(options.file.path)
  }), { encoding: 'utf8' })

  // As a last step, check whether or not we should actually create a textpack
  if (options.format === 'textpack') {
    await new Promise((resolve, reject) => {
      let packFile = options.targetFile.replace('.textbundle', '.textpack')
      let stream = writeStream(packFile)
      // Create a Zip file with compression 9
      let archive = archiver('zip', { zlib: { level: 9 } })
      // Throw the error for the engine to capture
      archive.on('error', (err) => { reject(err) })
      // Resolve the promise as soon as the archive has finished writing
      stream.on('finish', () => { resolve() })
      archive.pipe(stream) // Pipe the data through to our file
      archive.directory(options.targetFile, path.basename(options.targetFile))
      archive.finalize() // Done.
      // Now we need to overwrite the targetFile with the pack name
      options.targetFile = packFile
    })

    // Afterwards remove the source file
    rimraf(options.targetFile.replace('.textpack', '.textbundle'), () => { /* Nothing to do */ })
  }
}
