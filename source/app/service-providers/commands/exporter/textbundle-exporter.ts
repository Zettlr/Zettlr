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
import { pipeline } from 'stream/promises'
import { ZipArchive } from 'archiver'
import isFile from '@common/util/is-file'
import { app } from 'electron'
import type { ExporterOptions, ExporterPlugin, ExporterOutput, ExportResult, ExporterAPI } from './types'
import sanitize from 'sanitize-filename'

const ASSETS_FOLDER_NAME = 'assets'

export const plugin: ExporterPlugin = async function (options: ExporterOptions, sourceFiles, ctx: ExporterAPI): Promise<ExportResult> {
  const output: ExporterOutput = {
    code: 0,
    stdout: [],
    stderr: [],
    targetFile: ''
  }

  if (sourceFiles.length > 1) {
    throw new Error('Cannot export to Textbundle: Please only pass one single file.')
  }

  const baseName = path.basename(options.sourceFiles[0].name, options.sourceFiles[0].ext)
  const title = (options.defaultsOverride?.title !== undefined) ? sanitize(options.defaultsOverride.title, { replacement: '-' }) : baseName
  const ext = options.profile.writer === 'textpack' ? '.textpack' : '.textbundle'
  const targetPath = path.join(options.targetDirectory, title + ext)

  if (!await ctx.confirmTargetOverwrite(targetPath)) {
    return { status: 'cancelled' }
  }

  try {
    output.targetFile = await makeTextbundle(
      sourceFiles[0],
      targetPath,
      options.profile.writer === 'textpack',
      path.basename(sourceFiles[0])
    )
  } catch (err: unknown) {
    output.code = 1
    if (err instanceof Error) {
      output.stderr.push(err.message)
    } else {
      output.stderr.push('Unknown error')
    }
  }

  return { status: 'completed', output }
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
  let bundleFile = targetFile

  // Create a temporary textbundle directory for textpack
  if (textpack) {
    const bundleBaseName = path.basename(targetFile).replace('.textpack', '.textbundle')
    bundleFile = path.join(app.getPath('temp'), bundleBaseName)

    // cleanups stale builds
    await fs.rm(bundleFile, { force: true, recursive: true })
  }

  try {
    await fs.mkdir(bundleFile, { recursive: true })

    const dirName = path.dirname(sourceFile)
    const imgRE = /!\[.*?\]\(([^)]+)\)/g
    const imagesToCopy: string[] = []

    // Read in the file and replace image paths, if applicable
    let content = await fs.readFile(sourceFile, 'utf8')
    content = content.replace(imgRE, (match: string, url: string) => {
      const absPath = path.resolve(dirName, url)

      // We only care about images that are currently present on the filesystem.
      if (isFile(absPath)) {
        match = match.replace(url, path.join(ASSETS_FOLDER_NAME, path.basename(url)))
        imagesToCopy.push(absPath)
      }

      return match
    })

    // Write the file into the target directory
    await fs.writeFile(path.join(bundleFile, 'text.md'), content, { encoding: 'utf8' })

    // Create the assets folder
    await fs.mkdir(path.join(bundleFile, ASSETS_FOLDER_NAME), { recursive: true })

    // Copy over all images
    for (const image of imagesToCopy) {
      await fs.copyFile(image, path.join(bundleFile, ASSETS_FOLDER_NAME, path.basename(image)))
    }

    // Finally, create the info.json
    await fs.writeFile(path.join(bundleFile, 'info.json'), JSON.stringify({
      version: 2,
      type: 'net.daringfireball.markdown',
      creatorIdentifier: 'com.zettlr.app',
      sourceURL: overrideFilename ?? sourceFile
    }, undefined, 4), { encoding: 'utf8' })

    // As a last step, check whether or not we should actually create a textpack
    if (textpack) {
      const archive = new ZipArchive({ zlib: { level: 9 } })
      const stream = pipeline(archive, writeStream(targetFile))

      archive.directory(bundleFile, path.basename(bundleFile))

      await Promise.all([ stream, archive.finalize() ])
    }
  } finally {
    if (textpack) {
      await fs.rm(bundleFile, { force: true, recursive: true })
    }
  }

  // After all is done, return the written file (folder, to be exact).
  return targetFile
}
