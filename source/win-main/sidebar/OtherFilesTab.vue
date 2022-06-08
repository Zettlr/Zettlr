<template>
  <div role="tabpanel">
    <!-- Other files contents -->
    <h1>
      {{ otherFilesLabel }}
      <clr-icon
        id="open-dir-external"
        v-bind:title="openDirLabel"
        shape="folder"
        class="is-solid"
      ></clr-icon>
    </h1>

    <!-- Render all attachments -->
    <p v-if="attachments.length === 0">
      {{ noAttachmentsMessage }}
    </p>
    <template v-else>
      <a
        v-for="(attachment, idx) in attachments"
        v-bind:key="idx"
        class="attachment"
        draggable="true"
        v-bind:data-link="attachment.path"
        v-bind:data-hash="attachment.hash"
        v-bind:title="attachment.path"
        v-bind:href="`safe-file://${attachment.path}`"
        v-on:dragstart="handleDragStart($event, attachment.path)"
      >
        <span v-html="getIcon(attachment.path)"></span>
        {{ attachment.name }}
      </a>
    </template>
  </div>
</template>

<script lang="ts">
import { trans } from '@common/i18n-renderer'
import { DirMeta, OtherFileMeta } from '@dts/common/fsal'
import { ClarityIcons } from '@clr/icons'
import { defineComponent } from 'vue'

const path = window.path

export default defineComponent({
  name: 'OtherFilesTab',
  computed: {
    otherFilesLabel: function (): string {
      return trans('gui.other_files')
    },
    openDirLabel: function (): string {
      return trans('gui.attachments_open_dir')
    },
    noAttachmentsMessage: function (): string {
      return trans('gui.no_other_files')
    },
    attachments: function (): OtherFileMeta[] {
      const currentDir = this.$store.state.selectedDirectory as DirMeta|null
      if (currentDir === null) {
        return []
      } else {
        const extensions: string[] = this.$store.state.config.attachmentExtensions
        const attachments = currentDir.children.filter(child => child.type === 'other') as OtherFileMeta[]
        return attachments.filter(attachment => extensions.includes(attachment.ext))
      }
    }
  },
  methods: {
    /**
     * Adds additional data to the dragevent
     *
     * @param   {DragEvent}  event           The drag event
     * @param   {string}  attachmentPath  The path to add as a file
     */
    handleDragStart: function (event: DragEvent, attachmentPath: string) {
      // Indicate with custom data that this is a file from the sidebar
      event.dataTransfer?.setData('text/x-zettlr-other-file', attachmentPath)
    },
    getIcon: function (attachmentPath: string) {
      const fileExtIcon = ClarityIcons.get('file-ext')
      if (typeof fileExtIcon === 'string') {
        return fileExtIcon.replace('EXT', path.extname(attachmentPath).slice(1, 4))
      } else {
        return ''
      }
    }
  }
})
</script>
