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
import { useConfigStore, useWorkspaceStore } from 'source/pinia'

export default function getDocumentTitle (
  doc: OpenDocument
): string {
  const configStore = useConfigStore()
  const workspaceStore = useWorkspaceStore()
  const config = configStore.config
  const descriptor = workspaceStore.descriptorMap.get(doc.path)
  if (descriptor === undefined) {
    return pathBasename(doc.path)
  }

  const useTitle = config.fileNameDisplay.includes('title')
  const useH1 = config.fileNameDisplay.includes('heading')
  const displayMdExtensions = config.display.markdownFileExtensions

  if (descriptor.type !== 'file') {
    return descriptor.name
  } else if (useTitle && descriptor.yamlTitle !== undefined) {
    return descriptor.yamlTitle
  } else if (useH1 && descriptor.firstHeading != null) {
    return descriptor.firstHeading
  } else if (displayMdExtensions) {
    return descriptor.name
  } else {
    return descriptor.name.replace(descriptor.ext, '')
  }
}
