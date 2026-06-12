/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        filterDescriptorChildren
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Constructs a function that can be passed to a filter
 *                  function operating operating on descriptors which will
 *                  ensure that files and folders that should not be displayed
 *                  are filtered out.
 *
 * END HEADER
 */

import { hasImageExt, hasPDFExt, hasMSOfficeExt, hasOpenOfficeExt, hasDataExt, hasMdOrCodeExt, hasExt } from 'source/common/util/file-extention-checks'
import { isDotFile } from 'source/common/util/ignore-path'
import { useConfigStore } from 'source/pinia'
import type { AnyDescriptor } from 'source/types/common/fsal'

/**
 * Utility function that can filter the children of a directory descriptor,
 * taking into account various visibility settings from the configuration. Call
 * this function to get a filter-compatible function.
 *
 * @return  {(item: AnyDescriptor) => boolean}The filter function
 */
export function filterDescriptorChildren (): (item: AnyDescriptor) => boolean {
  const { files, attachmentExtensions } = useConfigStore().config
  return (child: AnyDescriptor) => {
    // Filter files based on our settings
    if (child.type === 'directory') {
      return files.dotFiles.showInFilemanager || !isDotFile(child.name)
    }

    // We have to check for hidden files first so they are not
    // included if they end in one of the accepted extensions
    if (isDotFile(child.name)) {
      return files.dotFiles.showInFilemanager
    } else if (hasImageExt(child.path)) {
      return files.images.showInFilemanager
    } else if (hasPDFExt(child.path)) {
      return files.pdf.showInFilemanager
    } else if (hasMSOfficeExt(child.path)) {
      return files.msoffice.showInFilemanager
    } else if (hasOpenOfficeExt(child.path)) {
      return files.openOffice.showInFilemanager
    } else if (hasDataExt(child.path)) {
      return files.dataFiles.showInFilemanager
    } else if (hasMdOrCodeExt(child.path)) {
      return true
    } else {
      return hasExt(child.path, attachmentExtensions) // Any other "other" file should be excluded
    }
  }
}
