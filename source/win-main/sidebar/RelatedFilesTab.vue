<template>
  <div role="tabpanel">
    <h1>{{ relatedFilesLabel }}</h1>
    <div class="related-files-container">
      <div v-if="relatedFiles.length === 0">
        {{ noRelatedFilesMessage }}
      </div>
      <div v-else>
        <RecycleScroller
          v-slot="{ item, index }"
          v-bind:items="scrollerRelatedFiles"
          v-bind:item-size="43"
          v-bind:emit-update="true"
          v-bind:page-mode="true"
        >
          <div
            v-bind:key="index"
            v-bind:class="{
              'related-file': true,
              'tags': item.props.tags.length > 0,
              'inbound': item.props.link === 'inbound',
              'outbound': item.props.link === 'outbound',
              'bidirectional': item.props.link === 'bidirectional'
            }"
            v-on:click.stop="requestFile($event, item.props.path)"
            v-on:dragstart="beginDragRelatedFile($event, item.props.path)"
          >
            <span
              class="filename"
              draggable="true"
            >{{ getRelatedFileName(item.props.path) }}</span>
            <span class="icons">
              <cds-icon
                v-if="item.props.tags.length > 0"
                shape="tag"
                v-bind:title="getTagsLabel(item.props.tags)"
              ></cds-icon>
              <cds-icon
                v-if="item.props.link === 'inbound'"
                shape="arrow"
                direction="left"
                v-bind:title="inboundLinkLabel"
              ></cds-icon>
              <cds-icon
                v-else-if="item.props.link === 'outbound'"
                shape="arrow"
                direction="right"
                v-bind:title="outboundLinkLabel"
              ></cds-icon>
              <cds-icon
                v-else-if="item.props.link === 'bidirectional'"
                shape="two-way-arrows"
                v-bind:title="bidirectionalLinkLabel"
              ></cds-icon>
            </span>
          </div>
        </RecycleScroller>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { trans } from '@common/i18n-renderer'
import { RecycleScroller } from 'vue-virtual-scroller'
import { ref, computed, watch } from 'vue'
import { useConfigStore, useWorkspacesStore, useDocumentTreeStore, useTagsStore } from 'source/pinia'
import type { OtherFileDescriptor, CodeFileDescriptor, MDFileDescriptor } from '@dts/common/fsal'
import { pathBasename } from '@common/util/renderer-path-polyfill'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'

export interface RelatedFile {
  file: string
  path: string
  tags: string[]
  link: 'inbound'|'outbound'|'bidirectional'|'none'
}

const ipcRenderer = window.ipc

const workspacesStore = useWorkspacesStore()
const configStore = useConfigStore()
const tagStore = useTagsStore()
const documentTreeStore = useDocumentTreeStore()

const searchParams = new URLSearchParams(window.location.search)
const windowId = searchParams.get('window_id')

if (windowId === null) {
  throw new Error('windowID was null')
}

const relatedFiles = ref<RelatedFile[]>([])

const relatedFilesLabel = trans('Related files')
const noRelatedFilesMessage = trans('No related files')
const bidirectionalLinkLabel = trans('This relation is based on a bidirectional link.')
const outboundLinkLabel = trans('This relation is based on an outbound link.')
const inboundLinkLabel = trans('This relation is based on a backlink.')

/**
 * The Vue Virtual Scroller component expects an array of objects which
 * expose two properties: id and "props". The latter contains the actual
 * object (i.e. the RelatedFile). We may want to merge this functionality
 * into the RelatedFiles generation later on, but this is the safest way
 * for now.
 *
 * @return  {{ id: number, props: RelatedFile }}  The data for the scroller
 */
const scrollerRelatedFiles = computed(() => {
  return relatedFiles.value.map((elem, idx) => {
    return { id: idx, props: elem }
  })
})

const lastActiveFile = computed(() => documentTreeStore.lastLeafActiveFile)
const roots = computed(() => workspacesStore.roots)
const useH1 = computed(() => configStore.config.fileNameDisplay.includes('heading'))
const useTitle = computed(() => configStore.config.fileNameDisplay.includes('title'))
const displayMdExtensions = computed(() => configStore.config.display.markdownFileExtensions)
const lastLeafId = computed(() => documentTreeStore.lastLeafId)

watch(lastActiveFile, () => {
  recomputeRelatedFiles().catch(err => console.error('Could not recompute related files:', err))
})

watch(roots, () => {
  recomputeRelatedFiles().catch(err => console.log('Could not recompute related files:', err))
})

async function recomputeRelatedFiles (): Promise<void> {
  if (lastActiveFile.value === undefined) {
    relatedFiles.value = []
    return
  }

  const descriptor: MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor|undefined = await ipcRenderer.invoke('application', {
    command: 'get-descriptor',
    payload: lastActiveFile.value.path
  })

  if (descriptor === undefined || descriptor.type === 'code') {
    relatedFiles.value = []
    return
  }

  const unreactiveList: RelatedFile[] = []

  // Then retrieve the inbound links first, since that is the most important
  // relation, so they should be on top of the list.
  const { inbound, outbound } = await ipcRenderer.invoke('link-provider', {
    command: 'get-inbound-links',
    payload: { filePath: lastActiveFile.value.path }
  }) as { inbound: string[], outbound: string[] }

  for (const absPath of [ ...inbound, ...outbound ]) {
    const found = unreactiveList.find(elem => elem.path === absPath)
    if (found !== undefined) {
      continue
    }

    const related: RelatedFile = {
      file: pathBasename(absPath),
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

  // The second way files can be related to each other is via shared tags.
  // This relation is not as important as explicit links, so they should
  // be below the inbound linked files.

  const recommendations = tagStore.tags.filter(tag => {
    if (descriptor.type === 'other') {
      return false
    }

    return descriptor.tags.includes(tag.name)
  })

  for (const tagRecord of recommendations) {
    for (const filePath of tagRecord.files) {
      if (filePath === descriptor.path) {
        continue
      }
      const existingFile = unreactiveList.find(elem => elem.path === filePath)
      if (existingFile !== undefined) {
        // This file already links here
        existingFile.tags.push(tagRecord.name)
      } else {
        // This file doesn't explicitly link here but it shares tags
        unreactiveList.push({
          file: pathBasename(filePath),
          path: filePath,
          tags: [tagRecord.name],
          link: 'none'
        })
      }
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
  const idf: Record<string, number> = {}
  for (const tagRecord of tagStore.tags) {
    idf[tagRecord.name] = tagRecord.idf
  }

  // We sort based on the IDF frequency of shared tags, which "weighs" the tags
  // by importance. Files with less shared tags hence can get higher counts and
  // are listed higher than files with more shared tags, if those few tags have
  // high IDF scores.
  tagsOnly.sort((a, b) => b.tags.map(tag => idf[tag]).reduce((p, c) => p + c, 0) - a.tags.map(tag => idf[tag]).reduce((p, c) => p + c, 0))

  relatedFiles.value = [
    ...backlinksAndTags,
    ...backlinksOnly,
    ...tagsOnly
  ]
}

function beginDragRelatedFile (event: DragEvent, filePath: string): void {
  const descriptor = workspacesStore.getFile(filePath)

  if (descriptor === undefined) {
    console.error('Cannot begin dragging related file: Descriptor not found')
    return
  }

  event.dataTransfer?.setData('text/x-zettlr-file', JSON.stringify({
    type: descriptor.type, // Can be file, code, or directory
    path: descriptor.path,
    id: descriptor.type === 'file' ? descriptor.id : '' // Convenience
  }))
}

function requestFile (event: MouseEvent, filePath: string): void {
  ipcRenderer.invoke('documents-provider', {
    command: 'open-file',
    payload: {
      path: filePath,
      windowId,
      leafId: lastLeafId.value,
      newTab: event.type === 'mousedown' && event.button === 1
    }
  } as DocumentManagerIPCAPI)
    .catch(e => console.error(e))
}

function getRelatedFileName (filePath: string): string {
  const descriptor = workspacesStore.getFile(filePath)
  if (descriptor === undefined || descriptor.type !== 'file') {
    return filePath
  }

  if (useTitle.value && descriptor.frontmatter !== null && typeof descriptor.frontmatter.title === 'string') {
    return descriptor.frontmatter.title
  } else if (useH1.value && descriptor.firstHeading !== null) {
    return descriptor.firstHeading
  } else if (displayMdExtensions.value) {
    return descriptor.name
  } else {
    return descriptor.name.replace(descriptor.ext, '')
  }
}

function getTagsLabel (tagList: string[]): string {
  return trans('This relation is based on %s shared tags: %s', tagList.length, tagList.join(', '))
}
</script>
@common/util/renderer-path-polyfill
../../pinia
