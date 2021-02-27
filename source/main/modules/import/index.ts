/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrImport
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The importer module for Zettlr.
 *
 * END HEADER
 */

import commandExists from 'command-exists'
import { promises as fs } from 'fs'
import path from 'path'
import { spawn } from 'child_process'

// Module utilities
import checkImportIntegrity from './check-import-integrity'
import importTextbundle from './import-textbundle'
import { DirDescriptor } from '../fsal/types'

export default async function makeImport (fileList: string[], dirToImport: DirDescriptor, errorCallback: Function|null = null, successCallback: Function|null = null): Promise<string[]> {
  // Determine the availability of Pandoc. As the Pandoc path is added to
  // process.env.PATH during the environment check, this should always work
  // if a supported Zettlr variant is being used. In other cases (e.g. custom
  // 32 bit builds) users can manually add a path. In any case, the exporter
  // requires Pandoc, and if it's not there we fail.
  try {
    await commandExists('pandoc')
  } catch (err) {
    throw new Error('Cannot run importer: Pandoc has not been found.')
  }

  let files = await checkImportIntegrity(fileList)
  let failedFiles = []

  // This for loop will initiate all pandoc instances at once. The return of
  // these processes will come in asynchronously, so we can let chokidar handle
  // the detection.
  for (let file of files) {
    // There are two files that we cannot import using pandoc: textbundle and textpack.
    if (file.knownFormat === 'textbundle' || file.knownFormat === 'textpack') {
      // We need to import using a special importer.
      await importTextbundle(file, dirToImport)
    } else if ([ 'markdown', 'txt' ].includes(file.knownFormat)) {
      // In this case we should just copy it over
      try {
        let newName = path.join(dirToImport.path, path.basename(file.path, path.extname(file.path))) + '.md'
        await fs.copyFile(file.path, newName)
        if (successCallback !== null) {
          successCallback(file.path)
        }
      } catch (err) {
        if (errorCallback !== null) {
          errorCallback(file.path, err.message)
        }
      }
    } else if (file.knownFormat !== '') {
      // The file is known -> let's import it!
      let newName = path.join(dirToImport.path, path.basename(file.path, path.extname(file.path))) + '.md'
      const argv = [
        '-t', 'markdown',
        '-o', `"${newName}"`,
        '--wrap=none', '--atx-headers',
        `"${String(file.path)}"`
      ]

      const pandocProcess = spawn('pandoc', argv, { shell: true })

      await new Promise<void>((resolve, reject) => {
        pandocProcess.on('message', (message, handle) => {
          console.log(String(message))
        })
        pandocProcess.on('close', (code, signal) => {
          // Code should be 0
          if (code === 0 && successCallback !== null) {
            successCallback(file.path)
            resolve()
          } else if (errorCallback !== null) {
            errorCallback(file.path)
            reject(new Error(`Could not import file: Pandoc exited with code ${String(code)}`))
          }
        })

        pandocProcess.on('error', (err) => {
          if (errorCallback !== null) {
            errorCallback(file.path, err)
          }
          reject(err)
        })
      })
    } else {
      failedFiles.push(file.path)
    }
  }

  return failedFiles // All good if the array is empty
}
