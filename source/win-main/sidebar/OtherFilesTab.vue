<template>
  <div role="tabpanel">
    <!-- Other files contents -->
    <h1>
      {{ otherFilesLabel }}
      <cds-icon
        id="open-dir-external"
        v-bind:title="openDirLabel"
        shape="folder"
        class="is-solid"
      ></cds-icon>
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

<script setup lang="ts">
import { trans } from '@common/i18n-renderer'
import { type OtherFileDescriptor } from '@dts/common/fsal'
import { ClarityIcons } from '@cds/core/icon'
import { computed } from 'vue'
import { useConfigStore, useDocumentTreeStore, useWorkspacesStore } from 'source/pinia'
import { pathDirname } from 'source/common/util/renderer-path-polyfill'

const configStore = useConfigStore()
const documentTreeStore = useDocumentTreeStore()
const workspacesStore = useWorkspacesStore()

const otherFilesLabel = trans('Other files')
const openDirLabel = trans('Open directory')
const noAttachmentsMessage = trans('No other files')

const attachments = computed(() => {
  const activeFile = documentTreeStore.lastLeafActiveFile
  if (activeFile === undefined) {
    return []
  }

  const currentDir = workspacesStore.getDir(pathDirname(activeFile.path))
  if (currentDir === undefined) {
    return []
  }

  const extensions = configStore.config.attachmentExtensions
  return currentDir.children
    .filter((child): child is OtherFileDescriptor => child.type === 'other')
    .filter(attachment => extensions.includes(attachment.ext))
})

/**
 * Adds additional data to the dragevent
 *
 * @param   {DragEvent}  event           The drag event
 * @param   {string}  attachmentPath  The path to add as a file
 */
function handleDragStart (event: DragEvent, attachmentPath: string): void {
  // Indicate with custom data that this is a file from the sidebar
  const data = { type: 'other', path: attachmentPath }
  event.dataTransfer?.setData('text/x-zettlr-file', JSON.stringify(data))
}

function getIcon (attachmentPath: string): string {
  const fileExtIcon = ClarityIcons.registry?.['file-ext']
  if (typeof fileExtIcon === 'string') {
    const ext = attachmentPath.substring(attachmentPath.lastIndexOf('.') + 1)
    return fileExtIcon.replace('EXT', ext)
  } else {
    return ''
  }
}
</script>
../../pinia
