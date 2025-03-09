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

import { promises as fs } from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import YAML from 'yaml'

// Module utilities
import checkImportIntegrity from './check-import-integrity'
import importTextbundle from './import-textbundle'
import type { DirDescriptor } from '@dts/common/fsal'
import { app, dialog } from 'electron'
import { trans } from '@common/i18n-main'
import type AssetsProvider from '@providers/assets'
import { type PandocProfileMetadata } from '@providers/assets'
import { SUPPORTED_READERS } from '@common/pandoc-util/pandoc-maps'
import { hasMarkdownExt } from '@common/util/file-extention-checks'

export default async function makeImport (
  fileList: string[],
  dirToImport: DirDescriptor,
  assetsProvider: AssetsProvider,
  errorCallback: null|((filePath: string, errorMessage: string) => void) = null,
  successCallback: null|((filePath: string) => void) = null
): Promise<string[]> {
  let files = await checkImportIntegrity(fileList)
  let failedFiles = []

  // This for loop will initiate all pandoc instances at once. The return of
  // these processes will come in asynchronously, so we can let chokidar handle
  // the detection.
  for (const file of files) {
    if ([ '.textbundle', '.textpack' ].includes(path.extname(file.path))) {
      // We need to import using a special importer.
      try {
        await importTextbundle(file, dirToImport)
        if (successCallback !== null) {
          successCallback(file.path)
        }
      } catch (err: any) {
        failedFiles.push(file.path)
        if (errorCallback !== null) {
          errorCallback(file.path, err.message)
        }
      }
    } else if (hasMarkdownExt(file.path)) {
      // In this case we should just copy it over
      try {
        const newName = path.join(dirToImport.path, path.basename(file.path, path.extname(file.path))) + '.md'
        await fs.copyFile(file.path, newName)
        if (successCallback !== null) {
          successCallback(file.path)
        }
      } catch (err: any) {
        failedFiles.push(file.path)
        if (errorCallback !== null) {
          errorCallback(file.path, err.message)
        }
      }
    } else if (file.availableReaders.length > 0) {
      // The file is known -> let's import it!
      const newName = path.join(dirToImport.path, path.basename(file.path, path.extname(file.path))) + '.md'

      // Retrieve the corresponding defaults file ...
      const allDefaults = (await assetsProvider.listDefaults()).filter(e => SUPPORTED_READERS.includes(e.writer))
      const potentialProfiles: PandocProfileMetadata[] = []
      for (const profile of allDefaults) {
        if (profile.isInvalid) {
          continue // There's an error with this profile
        }
        if (file.availableReaders.includes(profile.reader)) {
          potentialProfiles.push(profile)
        }
      }

      let profileToUse = potentialProfiles[0]
      if (potentialProfiles.length > 1) {
        const fileName = path.basename(file.path)
        const response = await dialog.showMessageBox({
          title: trans('Select import profile'),
          message: trans('Select import profile'),
          detail: trans('There are multiple profiles that can import %s. Please choose one.', fileName),
          buttons: potentialProfiles.map(profile => {
            return `${profile.name} (${profile.writer})`
          }),
          defaultId: 0
        })

        profileToUse = potentialProfiles[response.response]
      }

      const defaults = await assetsProvider.getDefaultsFile(profileToUse.name)

      // ... supply our file paths ...
      defaults['input-files'] = [file.path]
      defaults['output-file'] = newName

      // ... get a temporary file name ...
      const defaultsFile = path.join(app.getPath('temp'), 'defaults.yml')

      // ... cast the defaults to string ...
      const YAMLOptions = {
        indent: 4,
        simpleKeys: false
      }

      // ... write to disk ...
      await fs.writeFile(defaultsFile, YAML.stringify(defaults, YAMLOptions), { encoding: 'utf8' })

      // ... and finally run pandoc, providing the file.
      const pandocProcess = spawn('pandoc', [ '--defaults', `"${defaultsFile}"` ], { shell: true })

      try {
        await new Promise<void>((resolve, reject) => {
          pandocProcess.on('message', (message, _handle) => {
            console.log(message)
          })
          pandocProcess.on('close', (code, _signal) => {
            if (code === 0) {
              resolve()
            } else {
              reject(new Error(`Could not import file: Pandoc exited with code ${String(code)}`))
            }
          })

          pandocProcess.on('error', (err) => { reject(err) })
        })
        if (successCallback !== null) {
          successCallback(file.path)
        }
      } catch (err: any) {
        failedFiles.push(file.path)
        if (errorCallback !== null) {
          errorCallback(file.path, err.message)
        }
      }
    } else {
      failedFiles.push(file.path)
    }
  }

  return failedFiles // All good if the array is empty
}
