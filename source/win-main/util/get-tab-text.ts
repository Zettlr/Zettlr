/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tab text utility
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Returns the display label for an open document tab.
 *
 * END HEADER
 */

import type { OpenDocument } from '@dts/common/documents'
import { pathBasename } from '@common/util/renderer-path-polyfill'
import type { ConfigOptions } from 'source/app/service-providers/config/get-config-template'
import type { AnyDescriptor } from 'source/types/common/fsal'

interface WorkspaceDescriptorLookup {
  descriptorMap: Map<string, AnyDescriptor>
}

export default function getTabText (
  doc: OpenDocument,
  config: ConfigOptions,
  workspaceStore: WorkspaceDescriptorLookup
): string {
  const file = workspaceStore.descriptorMap.get(doc.path)
  if (file === undefined) {
    return pathBasename(doc.path)
  }

  const useTitle = config.fileNameDisplay.includes('title')
  const useH1 = config.fileNameDisplay.includes('heading')
  const displayMdExtensions = config.display.markdownFileExtensions

  if (file.type !== 'file') {
    return file.name
  } else if (useTitle && file.yamlTitle !== undefined) {
    return file.yamlTitle
  } else if (useH1 && file.firstHeading != null) {
    return file.firstHeading
  } else if (displayMdExtensions) {
    return file.name
  } else {
    return file.name.replace(file.ext, '')
  }
}
