/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Textbundle exporter
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin facilitates TextBundle and TextPack exports.
 *
 * END HEADER
 */

import {
  promises as fs,
  createWriteStream as writeStream
} from 'fs'
import path from 'path'
import archiver from 'archiver'
import rimraf from 'rimraf'
import isFile from '@common/util/is-file'
import { ExporterOptions, ExporterPlugin, ExporterOutput, ExporterAPI } from './types'
import sanitize from 'sanitize-filename'

export const plugin: ExporterPlugin = {
  run: async function (options: ExporterOptions, sourceFiles, ctx: ExporterAPI): Promise<ExporterOutput> {
    const output: ExporterOutput = {
      code: 0,
      stdout: [],
      stderr: [],
      targetFile: ''
    }

    if (sourceFiles.length > 1) {
      throw new Error('Cannot export to Textbundle: Please only pass one single file.')
    }

    if (typeof options.profile !== 'string' || ![ 'textbundle', 'textpack' ].includes(options.profile)) {
      throw new Error('Cannot run Textbundle exporter: Wrong profile given!')
    }

    const baseName = path.basename(options.sourceFiles[0].name, options.sourceFiles[0].ext)
    const title = (options.defaultsOverride?.title !== undefined) ? sanitize(options.defaultsOverride.title, { replacement: '-' }) : baseName
    const ext = options.profile === 'textpack' ? '.textpack' : '.textbundle'
    const targetPath = path.join(options.targetDirectory, title + ext)
    try {
      output.targetFile = await makeTextbundle(
        sourceFiles[0],
        targetPath,
        options.profile === 'textpack',
        path.basename(sourceFiles[0])
      )
    } catch (err: any) {
      output.code = 1
      output.stderr.push(err.message)
    }

    return output
  }
}

/**
 * Creates a textbundle and returns the path to the created folder/file.
 *
 * @param   {string}           sourceFile        The source file to be packed
 * @param   {string}           targetFile        The target path
 * @param   {boolean}          textpack          Whether to create a textpack
 * @param   {string}           overrideFilename  An optional property to override the source file name in the info.json
 *
 * @return  {Promise<string>}                    Resolves with a path to the file.
 */
async function makeTextbundle (sourceFile: string, targetFile: string, textpack: boolean = false, overrideFilename?: string): Promise<string> {
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
  if (textpack) {
    targetFile = targetFile.replace('.textpack', '.textbundle')
  }

  // Load in the tempfile
  let cnt = await fs.readFile(sourceFile, 'utf8')
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
    await fs.lstat(targetFile)
  } catch (err) {
    await fs.mkdir(targetFile)
  }

  // Write the markdown file
  await fs.writeFile(path.join(targetFile, 'text.md'), cnt, { encoding: 'utf8' })

  // Create the assets folder
  try {
    await fs.lstat(path.join(targetFile, 'assets'))
  } catch (err) {
    await fs.mkdir(path.join(targetFile, 'assets'))
  }

  // Copy over all images
  for (let image of images) {
    await fs.copyFile(image.old, path.join(targetFile, image.new))
  }

  // Finally, create the info.json
  await fs.writeFile(path.join(targetFile, 'info.json'), JSON.stringify({
    'version': 2,
    'type': 'net.daringfireball.markdown',
    'creatorIdentifier': 'com.zettlr.app',
    'sourceURL': (overrideFilename !== undefined) ? overrideFilename : sourceFile
  }), { encoding: 'utf8' })

  // As a last step, check whether or not we should actually create a textpack
  if (textpack) {
    await new Promise<void>((resolve, reject) => {
      const packFile = targetFile.replace('.textbundle', '.textpack')
      const stream = writeStream(packFile)
      // Create a Zip file with compression 9
      const archive = archiver('zip', { zlib: { level: 9 } })
      // Throw the error for the engine to capture
      archive.on('error', (err) => {
        reject(err)
      })
      // Resolve the promise as soon as the archive has finished writing
      stream.on('finish', () => {
        resolve()
      })
      archive.pipe(stream) // Pipe the data through to our file
      archive.directory(targetFile, path.basename(targetFile))
      archive.finalize() // Done.
        .then(() => {
          resolve()
        })
        .catch(err => {
          err.message = `[TextBundler] Could not finalize the Textpack archive: ${err.message as string}`
          reject(err)
        })
      // Now we need to overwrite the targetFile with the pack name
      targetFile = packFile

      // Afterwards remove the source file
      rimraf(targetFile.replace('.textpack', '.textbundle'), (error) => {
        if (error != null) {
          error.message = `[Export] Could not remove the temporary textbundle: ${error.message}`
          reject(error)
        }
        resolve()
      })
    })
  }

  // After all is done, return the written file (folder, to be exact).
  return targetFile
}
