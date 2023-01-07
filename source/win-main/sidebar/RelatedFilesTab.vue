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
              <clr-icon
                v-if="item.props.tags.length > 0"
                shape="tag"
                v-bind:title="getTagsLabel(item.props.tags)"
              ></clr-icon>
              <clr-icon
                v-if="item.props.link === 'inbound'"
                shape="arrow left"
                v-bind:title="inboundLinkLabel"
              ></clr-icon>
              <clr-icon
                v-else-if="item.props.link === 'outbound'"
                shape="arrow right"
                v-bind:title="outboundLinkLabel"
              ></clr-icon>
              <clr-icon
                v-else-if="item.props.link === 'bidirectional'"
                shape="two-way-arrows"
                v-bind:title="bidirectionalLinkLabel"
              ></clr-icon>
            </span>
          </div>
        </RecycleScroller>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { trans } from '@common/i18n-renderer'
import { RelatedFile } from '@dts/renderer/misc'
import { RecycleScroller } from 'vue-virtual-scroller'
import { defineComponent } from 'vue'
import { OpenDocument } from '@dts/common/documents'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'RelatedFilesTab',
  components: {
    RecycleScroller
  },
  data: function () {
    const searchParams = new URLSearchParams(window.location.search)
    return {
      windowId: searchParams.get('window_id') as string
    }
  },
  computed: {
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
    relatedFiles: function (): RelatedFile[] {
      if (this.lastActiveFile === null) {
        return []
      } else {
        return this.$store.state.relatedFiles
      }
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
  methods: {
    beginDragRelatedFile: function (event: DragEvent, filePath: string) {
      const descriptor = this.$store.getters.file(filePath)

      event.dataTransfer?.setData('text/x-zettlr-file', JSON.stringify({
        type: descriptor.type, // Can be file, code, or directory
        path: descriptor.path,
        id: descriptor.id // Convenience
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
      const descriptor = this.$store.getters.file(filePath)
      if (descriptor === undefined) {
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
