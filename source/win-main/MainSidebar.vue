<template>
  <div id="sidebar">
    <TabBar
      v-bind:tabs="tabs"
      v-bind:current-tab="currentTab"
      v-on:tab="setCurrentTab($event)"
    ></TabBar>

    <!-- Now the tab containers -->
    <div
      v-if="currentTab === 'toc'"
      role="tabpanel"
    >
      <!-- Table of Contents -->
      <h1>{{ tocLabel }}</h1>
      <!-- Show the ToC entries -->
      <div
        v-for="(entry, idx) of tableOfContents"
        v-bind:key="idx"
        class="toc-entry-container"
        v-bind:style="{
          'margin-left': `${entry.level * 10}px`, 'background-color': tocEntryContainerShade(idx)}"
        v-on:click="($root as any).jtl(entry.line)"
      >
        <div class="toc-level">
          {{ entry.renderedLevel }}
        </div>
        <div
          v-bind:class="{ 'toc-entry': true, 'toc-entry-active': tocEntryIsActive(entry.line, idx) }"
          v-bind:data-line="entry.line"
          v-html="entry.text"
        ></div>
      </div>
    </div>

    <div
      v-if="currentTab === 'references'"
      role="tabpanel"
    >
      <!-- References -->
      <h1>{{ referencesLabel }}</h1>
      <!-- Will contain the actual HTML -->
      <div v-html="referenceHTML"></div>
    </div>

    <div
      v-if="currentTab === 'relatedFiles'"
      role="tabpanel"
    >
      <h1>{{ relatedFilesLabel }}</h1>
      <div class="related-files-container">
        <div v-if="relatedFiles.length === 0">
          {{ noRelatedFilesMessage }}
        </div>
        <div v-else>
          <div
            v-for="fileRecord, idx in relatedFiles"
            v-bind:key="idx"
            class="related-file"
          >
            <span
              class="filename"
              draggable="true"
              v-on:mousedown.stop="requestFile($event, fileRecord.path)"
              v-on:dragstart="beginDragRelatedFile($event, fileRecord.path)"
            >{{ getRelatedFileName(fileRecord.path) }}</span>
            <span class="icons">
              <clr-icon
                v-if="fileRecord.tags.length > 0"
                shape="tag"
                title="This relation is based on tag similarity."
              ></clr-icon>
              <clr-icon
                v-if="fileRecord.backlink"
                shape="link"
                title="This relation is based on a backlink"
              ></clr-icon>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="currentTab === 'attachments'"
      role="tabpanel"
    >
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
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Sidebar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component renders the sidebar.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { ClarityIcons } from '@clr/icons'
import TabBar from '@common/vue/TabBar.vue'
import { defineComponent } from 'vue'
import path from 'path'
import { IpcRenderer } from 'electron'
import { MDFileMeta, OtherFileMeta } from '@dts/common/fsal'
import { TabbarControl } from '@dts/renderer/window'

const ipcRenderer: IpcRenderer = (window as any).ipc

interface RelatedFile {
  file: string
  path: string
  tags: string[]
  backlink: boolean
}

export default defineComponent({
  name: 'MainSidebar',
  components: {
    TabBar
  },
  data: function () {
    return {
      bibContents: undefined as undefined|any[],
      relatedFiles: [] as RelatedFile[],
      // Contains the ToC index of the currently active section
      activeTocEntryIdx: undefined as undefined|number
    }
  },
  computed: {
    currentTab: function (): string {
      return this.$store.state.config['window.currentSidebarTab']
    },
    tabs: function (): TabbarControl[] {
      return [
        {
          icon: 'indented-view-list',
          id: 'toc',
          target: 'sidebar-toc',
          label: this.tocLabel
        },
        {
          icon: 'book',
          id: 'references',
          target: 'sidebar-bibliography',
          label: this.referencesLabel
        },
        {
          icon: 'file-group',
          id: 'relatedFiles',
          target: 'sidebar-related-files',
          label: this.relatedFilesLabel
        },
        {
          icon: 'attachment',
          id: 'attachments',
          target: 'sidebar-files',
          label: this.otherFilesLabel
        }
      ]
    },
    otherFilesLabel: function (): string {
      return trans('gui.other_files')
    },
    referencesLabel: function (): string {
      return trans('gui.citeproc.references_heading')
    },
    tocLabel: function (): string {
      return trans('gui.table_of_contents')
    },
    relatedFilesLabel: function (): string {
      return trans('gui.related_files_label')
    },
    openDirLabel: function (): string {
      return trans('gui.attachments_open_dir')
    },
    noAttachmentsMessage: function (): string {
      return trans('gui.no_other_files')
    },
    noRelatedFilesMessage: function (): string {
      return trans('gui.no_related_files')
    },
    attachments: function (): OtherFileMeta[] {
      const currentDir = this.$store.state.selectedDirectory
      if (currentDir === null) {
        return []
      } else {
        return currentDir.attachments
      }
    },
    activeFile: function (): MDFileMeta|null {
      return this.$store.state.activeFile
    },
    modifiedFiles: function (): string[] {
      return this.$store.state.modifiedDocuments
    },
    tableOfContents: function (): any|null {
      return this.$store.state.tableOfContents
    },
    citationKeys: function (): string[] {
      return this.$store.state.citationKeys
    },
    referenceHTML: function (): string {
      if (this.bibContents === undefined || this.bibContents[1].length === 0) {
        return `<p>${trans('gui.citeproc.references_none')}</p>`
      } else {
        const html = [this.bibContents[0].bibstart]

        for (const entry of this.bibContents[1]) {
          html.push(entry)
        }

        html.push(this.bibContents[0].bibend)

        return html.join('\n')
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
    }
  },
  watch: {
    citationKeys: function () {
      // Reload the bibliography
      this.updateReferences().catch(e => console.error('Could not update references', e))
    },
    activeFile: function () {
      this.updateRelatedFiles().catch(e => console.error('Could not update related files', e))
    },
    modifiedFiles: function () {
      if (this.activeFile == null) {
        return
      }

      // Update the related files when the current document is not modified to
      // immediately account for any changes in the related files.
      const activePath = this.activeFile.path
      if (!(activePath in this.modifiedFiles)) {
        this.updateRelatedFiles().catch(e => console.error('Could not update related files', e))
      }
    }
  },
  mounted: function () {
    ipcRenderer.on('citeproc-renderer', (event, { command, payload }) => {
      if (command === 'citeproc-bibliography') {
        this.bibContents = payload
      }
    })

    try {
      this.updateReferences().catch(e => console.error('Could not update references', e))
    } catch (err) {
      console.error(err)
    }
    this.updateRelatedFiles().catch(e => console.error('Could not update related files', e))
  },
  methods: {
    setCurrentTab: function (which: string) {
      (global as any).config.set('window.currentSidebarTab', which)
    },
    updateReferences: async function () {
      // NOTE We're manually cloning the citationKeys array, since Proxies
      // cannot be cloned to be sent across the IPC bridge
      this.bibContents = await ipcRenderer.invoke('citeproc-provider', {
        command: 'get-bibliography',
        payload: this.citationKeys.map(e => e)
      })
    },
    updateRelatedFiles: async function () {
      // First reset, default is no related files
      this.relatedFiles = []
      if (this.activeFile === null || this.activeFile.type !== 'file') {
        return
      }

      const unreactiveList: RelatedFile[] = []

      // Then retrieve the inbound links first, since that is the most important
      // relation, so they should be on top of the list.
      const inboundLinks = await ipcRenderer.invoke('link-provider', {
        command: 'get-inbound-links',
        payload: {
          filePath: this.activeFile.path,
          fileID: this.activeFile.id
        }
      })

      for (const absPath of inboundLinks) {
        unreactiveList.push({
          file: path.basename(absPath),
          path: absPath,
          tags: [],
          backlink: true
        })
      }

      // The second way files can be related to each other is via shared tags.
      // This relation is not as important as explicit links, so they should
      // be below the inbound linked files.
      const recommendations = await ipcRenderer.invoke('tag-provider', {
        command: 'recommend-matching-files',
        payload: this.activeFile.tags.map(tag => tag) // De-proxy
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
            backlink: false
          })
        }
      }

      // Now we have all relations based on either tags or backlinks. We must
      // now order them in such a way that the hierarchy is like that:
      // 1. Backlinks that also share common tags
      // 2. Backlinks that do not share common tags
      // 3. Files that only share common tags
      const backlinksAndTags = unreactiveList.filter(e => e.backlink && e.tags.length > 0)
      backlinksAndTags.sort((a, b) => { return b.tags.length - a.tags.length })

      const backlinksOnly = unreactiveList.filter(e => e.backlink && e.tags.length === 0)
      // No sorting necessary

      const tagsOnly = unreactiveList.filter(e => !e.backlink)
      tagsOnly.sort((a, b) => { return b.tags.length - a.tags.length })

      this.relatedFiles = [ ...backlinksAndTags, ...backlinksOnly, ...tagsOnly ]
    },
    getIcon: function (attachmentPath: string) {
      const fileExtIcon = ClarityIcons.get('file-ext')
      if (typeof fileExtIcon === 'string') {
        return fileExtIcon.replace('EXT', path.extname(attachmentPath).slice(1, 4))
      } else {
        return ''
      }
    },
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
      if (descriptor === null) {
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
    beginDragRelatedFile: function (event: DragEvent, filePath: string) {
      const descriptor = this.$store.getters.file(filePath)

      event.dataTransfer?.setData('text/x-zettlr-file', JSON.stringify({
        type: descriptor.type, // Can be file, code, or directory
        path: descriptor.path,
        id: descriptor.id // Convenience
      }))
    },
    /**
     * Whether the cursor is within the corresponding document section
     *
     * @param   {number}  tocEntryLine          Line number of section heading
     * @param   {number}  tocEntryIdx           Index of heading in ToC
     */
    tocEntryIsActive: function (tocEntryLine: number, tocEntryIdx: number) {
      const cursorLine = this.$store.state.activeDocumentInfo.cursor.line

      // Determine index of next heading in ToC list
      const nextTocEntryIdx = Math.min(tocEntryIdx + 1, this.tableOfContents.length - 1)

      // Now, determine the next heading's line number
      let nextTocEntryLine = Infinity
      if (tocEntryIdx !== nextTocEntryIdx) {
        nextTocEntryLine = this.tableOfContents[nextTocEntryIdx].line
      }

      // True, when cursor lies between current and next heading
      const isActive = (cursorLine >= tocEntryLine && cursorLine < nextTocEntryLine)
      if (isActive) {
        this.activeTocEntryIdx = tocEntryIdx
      }
      return isActive
    },
    /**
     * Applies a background shade to the entry container depending on the
     * distance to the active heading.
     *
     * @param   {number}  tocEntryIdx           Index of heading in ToC
     */
    tocEntryContainerShade: function (tocEntryIdx: number) {
      const dist = Math.abs(tocEntryIdx - this.activeTocEntryIdx)

      if (dist === 0) {
        return 'rgba(255,255,255,1)'
      } else if (dist === 1) {
        return 'rgba(255,255,255,0.5)'
      } else if (dist === 2) {
        return 'rgba(255,255,255,0.25)'
      } else if (dist === 3) {
        return 'rgba(255,255,255,0.125)'
      }
    }
  }
})
</script>

<style lang="less">
body {
  @button-margin: 5px;
  @border-radius: 5px;
  @button-size: 5px;
  @button-icon-size: 5px;

  #sidebar {
    background-color: rgb(230, 230, 230);
    height: 100%;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    #open-dir-external {
      padding: @button-margin;
      border-radius: @border-radius;
      display: inline-block;
      width: @button-size;
      height: @button-size;

      clr-icon {
        width: @button-icon-size;
        height: @button-icon-size;
      }
    }

    h1 {
      padding: 10px;
      font-size: 16px;
    }

    p { padding: 10px; }

    a.attachment {
      display: block;
      margin: 10px;
      padding: 4px;
      text-decoration: none;
      color: inherit;
      // Padding 4px + 4px margin + 24px icon width = 32px
      text-indent: -32px;
      padding-left: 32px;
      // Some filenames are too long for the sidebar. However, unlike with the
      // file manager where we have the full filename visible in multiple places,
      // here we must make sure the filename is fully visible. Hence, we don't
      // use white-space: nowrap, but rather word-break: break-all.
      word-break: break-all;

      svg {
        width: 24px;
        height: 24px;
        margin-right: 4px;
        vertical-align: bottom;
        margin-bottom: -1px;
        // Necessary to give the extension icons the correct colour
        fill: currentColor;
      }
    }

    // Bibliography entries
    div.csl-bib-body {
      div.csl-entry {
        display: list-item;
        list-style-type: square;
        margin: 1em 0.2em 1em 1.8em;
        font-size: 80%;
        user-select: text;
        cursor: text;
      }

      a { color: var(--blue-0); }
    }

    // Table of Contents entries
    div.toc-entry-container {
      // Clever calculation based on the data-level property
      // margin-left: calc(attr(data-level) * 10px);
      display: flex;
      margin-bottom: 10px;
      margin-right: 10px;

      div.toc-level {
        flex-shrink: 1;
        padding: 0px 5px;
        font-weight: bold;
        color: var(--system-accent-color, --c-primary);
      }

      div.toc-entry {
        flex-grow: 3;
        cursor: pointer;
        &:hover { text-decoration: underline; }
      }

      div.toc-entry-active {
        font-weight: bold;
        color: var(--system-accent-color);
      }
    }

    div.related-files-container {
      padding: 10px;

      div.related-file {
        margin-bottom: 10px;
        display: flex;

        span.filename {
          display: inline-block;
          font-size: 11px;
          padding: 10px 5px;
          flex-grow: 8;

          &:hover {
            background-color: rgb(200, 200, 200);
          }
        }

        span.icons {
          display: inline-block;
          border-radius: 4px;
          padding: 2px;
          flex-grow: 2;
          flex-shrink: 0;
          text-align: right;
        }
      }
    }
  }

  &.dark {
    #sidebar {
      background-color: rgba(30, 30, 30, 1);
      color: rgb(230, 230, 230);

      div.related-files-container {
        div.related-file {
          span.filename:hover { background-color: rgb(80, 80, 80); }
        }
      }
    }
  }
}

body.darwin {
  div#sidebar {
    // On macOS the toolbar is 40px high and the documents titlebar is 30px high,
    // so we want to offset the sidebar by that.
    top: calc(40px + 30px);
    background-color: transparent;

    div.related-files-container {
      div.related-file span.filename { border-radius: 4px; }
    }
  }

  &.dark {
    div#sidebar {
      background-color: transparent;
    }
  }
}
</style>
