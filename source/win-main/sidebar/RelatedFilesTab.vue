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
            v-on:mousedown.stop="requestFile($event, item.props.path)"
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
                title="This relation is based on tag similarity."
              ></clr-icon>
              <clr-icon
                v-if="item.props.link === 'inbound'"
                shape="arrow left"
                title="This relation is based on a backlink."
              ></clr-icon>
              <clr-icon
                v-else-if="item.props.link === 'outbound'"
                shape="arrow right"
                title="This relation is based on an outbound link."
              ></clr-icon>
              <clr-icon
                v-else-if="item.props.link === 'bidirectional'"
                shape="two-way-arrows"
                title="This relation is based on a bidirectional link."
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

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'RelatedFilesTab',
  components: {
    RecycleScroller
  },
  computed: {
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
    relatedFilesLabel: function (): string {
      return trans('gui.related_files_label')
    },
    relatedFiles: function (): RelatedFile[] {
      return this.$store.state.relatedFiles
    },
    noRelatedFilesMessage: function (): string {
      return trans('gui.no_related_files')
    },
    useH1: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('heading')
    },
    useTitle: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('title')
    },
    displayMdExtensions: function (): boolean {
      return this.$store.state.config['display.markdownFileExtensions']
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
      ipcRenderer.invoke('application', {
        command: 'open-file',
        payload: {
          path: filePath,
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
    }
  }
})
</script>
