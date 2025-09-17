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
          href="#"
          v-bind:data-link="attachment.path"
          v-bind:title="attachment.path"
          v-on:click.prevent="handleClick(attachment.path)"
          v-on:dragstart="handleDragStart($event, attachment.path)"
        >
          <img v-if="hasPreview(attachment.path)" v-bind:src="getPreviewImageData(attachment.path)">
          <span v-else v-html="getIcon(attachment.ext)"></span>

          <span class="attachment-name">{{ attachment.name }}</span>
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
import makeValidUri from '@common/util/make-valid-uri'
import { type OtherFileDescriptor } from '@dts/common/fsal'
import { ClarityIcons } from '@cds/core/icon'
import { computed } from 'vue'
import { useConfigStore, useDocumentTreeStore, useWorkspacesStore } from 'source/pinia'
import { pathDirname, isAbsolutePath, resolvePath } from 'source/common/util/renderer-path-polyfill'
import { hasImageExt } from 'source/common/util/file-extention-checks'

const ipcRenderer = window.ipc

const searchParams = new URLSearchParams(window.location.search)
const windowId = searchParams.get('window_id')

if (windowId === null) {
  throw new Error('windowID was null')
}

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
    return fileExtIcon.replace('EXT', ext.slice(1, 4))
  } else {
    return ''
  }
}

function handleClick (filePath: string) {
  if (hasImageExt(filePath) && configStore.config.files.images.openWith === 'zettlr') {
    // Open this image in Zettlr
    ipcRenderer.invoke('documents-provider', {
      command: 'open-file',
      // We leave leafId undefined
      payload: { path: filePath, windowId }
    })
      .catch(e => console.error(e))
  } else {
    // Open the file externally (again, NOTE, this only works because main
    // intercepts every navigation attempt).
    window.location.href = makeValidUri(filePath)
  }

}

/**
 * Returns true for any attachments that Zettlr can show a preview for
 *
 * @param   {string}   attachmentPath  The absolute path to the attachment
 *
 * @return  {boolean}                  Returns true for previewable attachments
 */
function hasPreview (attachmentPath: string): boolean {
  if (hasImageExt(attachmentPath)) {
    return true
  }

  return false
}

/**
 * Returns a string that can be used as an Image source to show the preview for
 * the provided file.
 *
 * @param   {string}  attachmentPath  The absolute path to the attachment
 *
 * @return  {string}                  The image src attribute's contents
 */
function getPreviewImageData (attachmentPath: string): string {
  if (hasImageExt(attachmentPath)) {
    return makeValidUri(attachmentPath) // Can be used (almost) as-is
  }

  return ''
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
  display: grid;
  align-items: center;
  gap: 4px;
  grid-template-columns: 48px auto;

  padding: 4px;
  text-decoration: none;
  color: inherit;
  // Some filenames are too long for the sidebar. However, unlike with the
  // file manager where we have the full filename visible in multiple places,
  // here we must make sure the filename is fully visible. Hence, we don't
  // use white-space: nowrap, but rather word-break: break-all.
  word-break: break-all;
  white-space: nowrap;

  span.attachment-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  img {
    max-width: 100%;
  }

  svg {
    width: 32px;
    height: 32px;
    margin-right: 4px;
    vertical-align: bottom;
    margin-bottom: -1px;
    // Necessary to give the extension icons the correct colour
    fill: currentColor;
  }
}

body.dark a.attachment {
  color: inherit;
}
</style>
