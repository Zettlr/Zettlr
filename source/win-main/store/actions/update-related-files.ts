/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateRelatedFilesAction
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Updates the list of related files
 *
 * END HEADER
 */

import { OpenDocument } from '@dts/common/documents'
import { MDFileDescriptor } from '@dts/common/fsal'
import { RelatedFile } from '@dts/renderer/misc'
import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'
import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const path = window.path
const ipcRenderer = window.ipc

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  const activeFile: OpenDocument|null = context.getters.lastLeafActiveFile()
  if (activeFile === null || !hasMarkdownExt(activeFile.path)) {
    context.commit('updateRelatedFiles', [])
    return
  }

  const unreactiveList: RelatedFile[] = []

  // Then retrieve the inbound links first, since that is the most important
  // relation, so they should be on top of the list.
  const { inbound, outbound } = await ipcRenderer.invoke('link-provider', {
    command: 'get-inbound-links',
    payload: { filePath: activeFile.path }
  }) as { inbound: string[], outbound: string[]}

  for (const absPath of [ ...inbound, ...outbound ]) {
    const found = unreactiveList.find(elem => elem.path === absPath)
    if (found !== undefined) {
      continue
    }

    const related: RelatedFile = {
      file: path.basename(absPath),
      path: absPath,
      tags: [],
      link: 'none'
    }

    if (inbound.includes(absPath) && outbound.includes(absPath)) {
      related.link = 'bidirectional'
    } else if (inbound.includes(absPath)) {
      related.link = 'inbound'
    } else {
      related.link = 'outbound'
    }

    unreactiveList.push(related)
  }

  const descriptor: MDFileDescriptor|undefined = await ipcRenderer.invoke('application', {
    command: 'get-descriptor',
    payload: activeFile.path
  })

  if (descriptor === undefined) {
    context.commit('updateRelatedFiles', [])
    return
  }

  // The second way files can be related to each other is via shared tags.
  // This relation is not as important as explicit links, so they should
  // be below the inbound linked files.
  const recommendations = await ipcRenderer.invoke('tag-provider', {
    command: 'recommend-matching-files',
    payload: descriptor.tags.map(tag => tag) // De-proxy
  })

  // Recommendations come in the form of [file: string]: string[]
  for (const filePath of Object.keys(recommendations)) {
    const existingFile = unreactiveList.find(elem => elem.path === filePath)
    if (existingFile !== undefined) {
      // This file already links here
      existingFile.tags = recommendations[filePath]
    } else {
      // This file doesn't explicitly link here but it shares tags
      unreactiveList.push({
        file: path.basename(filePath),
        path: filePath,
        tags: recommendations[filePath],
        link: 'none'
      })
    }
  }

  // Now we have all relations based on either tags or backlinks. We must
  // now order them in such a way that the hierarchy is like that:
  // 1. Backlinks that also share common tags
  // 2. Backlinks that do not share common tags
  // 3. Files that only share common tags
  const backlinksAndTags = unreactiveList.filter(e => e.link !== 'none' && e.tags.length > 0)
  backlinksAndTags.sort((a, b) => { return b.tags.length - a.tags.length })

  const backlinksOnly = unreactiveList.filter(e => e.link !== 'none' && e.tags.length === 0)
  // No sorting necessary

  const tagsOnly = unreactiveList.filter(e => e.link === 'none')
  tagsOnly.sort((a, b) => { return b.tags.length - a.tags.length })

  context.commit('updateRelatedFiles', [
    ...backlinksAndTags,
    ...backlinksOnly,
    ...tagsOnly
  ])
}
