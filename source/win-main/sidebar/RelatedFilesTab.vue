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

<script lang="ts">
import { trans } from '@common/i18n-renderer'
import { RecycleScroller } from 'vue-virtual-scroller'
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import { useWorkspacesStore } from 'source/pinia'
import { type OpenDocument } from '@dts/common/documents'
import { type CodeFileDescriptor, type MDFileDescriptor } from '@dts/common/fsal'
import { type TagRecord } from '@providers/tags'
import { pathBasename } from '@common/util/renderer-path-polyfill'

export interface RelatedFile {
  file: string
  path: string
  tags: string[]
  link: 'inbound'|'outbound'|'bidirectional'|'none'
}

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'RelatedFilesTab',
  components: {
    RecycleScroller
  },
  data: function () {
    const searchParams = new URLSearchParams(window.location.search)
    return {
      windowId: searchParams.get('window_id') as string,
      relatedFiles: [] as RelatedFile[]
    }
  },
  computed: {
    ...mapStores(useWorkspacesStore),
    relatedFilesLabel: function (): string {
      return trans('Related files')
    },
    noRelatedFilesMessage: function (): string {
      return trans('No related files')
    },
    bidirectionalLinkLabel: function () {
      return trans('This relation is based on a bidirectional link.')
    },
    outboundLinkLabel: function () {
      return trans('This relation is based on an outbound link.')
    },
    inboundLinkLabel: function () {
      return trans('This relation is based on a backlink.')
    },
    /**
     * The Vue Virtual Scroller component expects an array of objects which
     * expose two properties: id and "props". The latter contains the actual
     * object (i.e. the RelatedFile). We may want to merge this functionality
     * into the RelatedFiles generation later on, but this is the safest way
     * for now.
     *
     * @return  {{ id: number, props: RelatedFile }}  The data for the scroller
     */
    scrollerRelatedFiles: function (): any {
      return this.relatedFiles.map((elem, idx) => {
        return { id: idx, props: elem }
      })
    },
    lastActiveFile: function (): OpenDocument|null {
      return this.$store.getters.lastLeafActiveFile()
    },
    useH1: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('heading')
    },
    useTitle: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('title')
    },
    displayMdExtensions: function (): boolean {
      return this.$store.state.config['display.markdownFileExtensions']
    },
    lastLeafId: function (): string {
      return this.$store.state.lastLeafId
    }
  },
  watch: {
    lastActiveFile () {
      this.recomputeRelatedFiles().catch(err => console.error('Could not recompute related files:', err))
    }
  },
  mounted () {
    this.recomputeRelatedFiles().catch(err => console.log('Could not recompute related files:', err))
    ipcRenderer.on('workspace-changed', (e, _) => {
      this.recomputeRelatedFiles().catch(err => console.log('Could not recompute related files:', err))
    })
  },
  methods: {
    recomputeRelatedFiles: async function (): Promise<void> {
      if (this.lastActiveFile === null) {
        this.relatedFiles = []
        return
      }

      const unreactiveList: RelatedFile[] = []

      // Then retrieve the inbound links first, since that is the most important
      // relation, so they should be on top of the list.
      const { inbound, outbound } = await ipcRenderer.invoke('link-provider', {
        command: 'get-inbound-links',
        payload: { filePath: this.lastActiveFile.path }
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

      const descriptor: MDFileDescriptor|CodeFileDescriptor|undefined = await ipcRenderer.invoke('application', {
        command: 'get-descriptor',
        payload: this.lastActiveFile.path
      })

      if (descriptor === undefined || descriptor.type === 'code') {
        this.relatedFiles = []
        return
      }

      // The second way files can be related to each other is via shared tags.
      // This relation is not as important as explicit links, so they should
      // be below the inbound linked files.

      const tags = await ipcRenderer.invoke('tag-provider', { command: 'get-all-tags' }) as TagRecord[]
      const recommendations = tags.filter(tag => descriptor.tags.includes(tag.name))

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
      for (const tagRecord of tags) {
        idf[tagRecord.name] = tagRecord.idf
      }

      // We sort based on the IDF frequency of shared tags, which "weighs" the tags
      // by importance. Files with less shared tags hence can get higher counts and
      // are listed higher than files with more shared tags, if those few tags have
      // high IDF scores.
      tagsOnly.sort((a, b) => b.tags.map(tag => idf[tag]).reduce((p, c) => p + c, 0) - a.tags.map(tag => idf[tag]).reduce((p, c) => p + c, 0))

      this.relatedFiles = [
        ...backlinksAndTags,
        ...backlinksOnly,
        ...tagsOnly
      ]
    },
    beginDragRelatedFile: function (event: DragEvent, filePath: string) {
      const descriptor = this.workspacesStore.getFile(filePath)

      if (descriptor === undefined) {
        console.error('Cannot begin dragging related file: Descriptor not found')
        return
      }

      event.dataTransfer?.setData('text/x-zettlr-file', JSON.stringify({
        type: descriptor.type, // Can be file, code, or directory
        path: descriptor.path,
        id: descriptor.type === 'file' ? descriptor.id : '' // Convenience
      }))
    },
    requestFile: function (event: MouseEvent, filePath: string) {
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: {
          path: filePath,
          windowId: this.windowId,
          leafId: this.lastLeafId,
          newTab: event.type === 'mousedown' && event.button === 1
        }
      })
        .catch(e => console.error(e))
    },
    getRelatedFileName: function (filePath: string) {
      const descriptor = this.workspacesStore.getFile(filePath)
      if (descriptor === undefined || descriptor.type !== 'file') {
        return filePath
      }

      if (this.useTitle && descriptor.frontmatter !== null && typeof descriptor.frontmatter.title === 'string') {
        return descriptor.frontmatter.title
      } else if (this.useH1 && descriptor.firstHeading !== null) {
        return descriptor.firstHeading
      } else if (this.displayMdExtensions) {
        return descriptor.name
      } else {
        return descriptor.name.replace(descriptor.ext, '')
      }
    },
    getTagsLabel (tagList: string[]) {
      return trans('This relation is based on %s shared tags: %s', tagList.length, tagList.join(', '))
    }
  }
})
</script>
@common/util/renderer-path-polyfill
../../pinia
