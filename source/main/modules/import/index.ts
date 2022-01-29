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
import YAML from 'yaml'

// Module utilities
import checkImportIntegrity from './check-import-integrity'
import importTextbundle from './import-textbundle'
import { DirDescriptor } from '@dts/main/fsal'
import { app } from 'electron'
import { trans } from '@common/i18n-main'

export default async function makeImport (fileList: string[], dirToImport: DirDescriptor, errorCallback: Function|null = null, successCallback: Function|null = null): Promise<string[]> {
  // Determine the availability of Pandoc. As the Pandoc path is added to
  // process.env.PATH during the environment check, this should always work
  // if a supported Zettlr variant is being used. In other cases (e.g. custom
  // 32 bit builds) users can manually add a path. In any case, the exporter
  // requires Pandoc, and if it's not there we fail.
  try {
    await commandExists('pandoc')
  } catch (err) {
    throw new Error(trans('system.error.no_pandoc_message'))
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
      } catch (err: any) {
        if (errorCallback !== null) {
          errorCallback(file.path, err.message)
        }
      }
    } else if (file.knownFormat !== '') {
      // The file is known -> let's import it!

      let newName = path.join(dirToImport.path, path.basename(file.path, path.extname(file.path))) + '.md'

      // Retrieve the corresponding defaults file ...
      const defaults = await global.assets.getDefaultsFor(file.knownFormat, 'import')

      // ... supply our file paths ...
      defaults['input-files'] = [file.path]
      defaults['output-file'] = newName

      // ... get a temporary file name ...
      const defaultsFile = path.join(app.getPath('temp'), 'defaults.yml')

      // ... cast the defaults to string ...
      const YAMLOptions: YAML.Options = {
        indent: 4,
        simpleKeys: false
      }

      // ... write to disk ...
      await fs.writeFile(defaultsFile, YAML.stringify(defaults, YAMLOptions), { encoding: 'utf8' })

      // ... and finally run pandoc, providing the file.
      const pandocProcess = spawn('pandoc', [ '--defaults', `"${defaultsFile}"` ], { shell: true })

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
