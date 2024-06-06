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
    <template v-for="(folder, fIdx) in attachments" v-else v-bind:key="fIdx">
      <h2 class="other-files-panel-folder-name" v-bind:title="folder.path">
        {{ folder.path }}
      </h2>

      <template v-if="folder.files.length > 0">
        <a
          v-for="(attachment, idx) in folder.files"
          v-bind:key="idx"
          class="attachment"
          draggable="true"
          v-bind:data-link="attachment.path"
          v-bind:title="attachment.path"
          v-bind:href="`safe-file://${attachment.path}`"
          v-on:dragstart="handleDragStart($event, attachment.path)"
        >
          <span v-html="getIcon(attachment.ext)"></span>
          {{ attachment.name }}
        </a>
      </template>
      <span v-else>
        {{ noAttachmentsMessage }}
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { trans } from '@common/i18n-renderer'
import { type OtherFileDescriptor } from '@dts/common/fsal'
import { ClarityIcons } from '@cds/core/icon'
import { computed } from 'vue'
import { useConfigStore, useDocumentTreeStore, useWorkspacesStore } from 'source/pinia'
import { pathDirname, isAbsolutePath, resolvePath } from 'source/common/util/renderer-path-polyfill'

const configStore = useConfigStore()
const documentTreeStore = useDocumentTreeStore()
const workspacesStore = useWorkspacesStore()

const otherFilesLabel = trans('Other files')
const openDirLabel = trans('Open directory')
const noAttachmentsMessage = trans('No other files')

const attachments = computed<Array<{ path: string, files: OtherFileDescriptor[] }>>(() => {
  const activeFile = documentTreeStore.lastLeafActiveFile
  if (activeFile === undefined) {
    return [] as any
  }

  const currentDir = workspacesStore.getDir(pathDirname(activeFile.path))
  if (currentDir === undefined) {
    return []
  }

  const extensions = configStore.config.attachmentExtensions

  const files = currentDir.children
    .filter((child): child is OtherFileDescriptor => child.type === 'other')
    .filter(attachment => extensions.includes(attachment.ext))

  const att = [{ path: trans('Current folder'), files }]

  const assetsDir = configStore.config.editor.defaultSaveImagePath.trim()

  const assetsDescriptor = isAbsolutePath(assetsDir)
    ? workspacesStore.getDir(assetsDir)
    : workspacesStore.getDir(resolvePath(currentDir.path, assetsDir))

  if (assetsDescriptor !== undefined) {
    const files = assetsDescriptor.children
      .filter((child): child is OtherFileDescriptor => child.type === 'other')
      .filter(attachment => extensions.includes(attachment.ext))

    att.push({ path: assetsDir, files })
  }

  return att
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

function getIcon (ext: string): string {
  // @ts-expect-error We know that this thing has an outline, because we assign it in load-icons.ts
  const fileExtIcon = ClarityIcons.registry['file-ext'].outline!
  if (typeof fileExtIcon === 'string') {
    return fileExtIcon.replace('EXT', ext.substring(1))
  } else {
    return ''
  }
}
</script>

<style lang="less">
h2.other-files-panel-folder-name {
  font-size: 80%;
  margin: 10px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

a.attachment {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
