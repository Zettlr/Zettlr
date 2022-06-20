<template>
  <div role="tabpanel">
    <!-- Table of Contents -->
    <h1>{{ titleOrTocLabel }}</h1>
    <!-- Show the ToC entries -->
    <div
      v-for="(entry, idx) of tableOfContents"
      v-bind:key="idx"
      v-bind:data-line="entry.line"
      class="toc-entry-container"
      draggable="true"
      v-bind:style="{
        'margin-left': `${entry.level * 10}px`
      }"
      v-on:click="($root as any).jtl(entry.line, true)"
      v-on:dragstart="startDragging"
      v-on:dragenter="dragEnter"
      v-on:dragleave="dragLeave"
      v-on:drop="drop"
    >
      <div class="toc-level">
        {{ entry.renderedLevel }}
      </div>
      <div
        v-bind:class="{ 'toc-entry': true, 'toc-entry-active': tocEntryIsActive(entry.line, idx) }"
        v-bind:data-line="entry.line"
        v-html="toc2html(entry.text)"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { trans } from '@common/i18n-renderer'
import { MDFileMeta } from '@dts/common/fsal'
import { defineComponent } from 'vue'
import sanitizeHtml from 'sanitize-html'
import { getConverter } from '@common/util/md-to-html'
import { ToCEntry } from '@common/modules/markdown-editor/util/generate-toc'

// Must be instantiated after loading, i.e. when the Sidebar is initialized
let md2html: Function

export default defineComponent({
  name: 'ToCTab',
  emits: ['move-section'],
  computed: {
    tableOfContents: function (): ToCEntry[]|null {
      return this.$store.state.tableOfContents
    },
    /**
     * Returns either the title property for the active file or the generic ToC
     * label -- to be used within the ToC of the sidebar
     *
     * @return  {string}  The title for the ToC sidebar
     */
    titleOrTocLabel: function (): string {
      if (this.activeFile === null || this.activeFile.frontmatter == null) {
        return this.tocLabel
      }

      const frontmatter = this.activeFile.frontmatter

      if ('title' in frontmatter && frontmatter.title.length > 0) {
        return this.activeFile.frontmatter.title
      } else {
        return this.tocLabel
      }
    },
    activeFile: function (): MDFileMeta|null {
      return this.$store.state.activeFile
    },
    tocLabel: function (): string {
      return trans('gui.table_of_contents')
    }
  },
  created: function () {
    // Instantiate a converter so that we can convert the md of our ToC entries
    // to html with citation support
    md2html = getConverter(window.getCitation)
  },
  methods: {
    /**
     * Whether the cursor is within the corresponding document section
     *
     * @param   {number}  tocEntryLine          Line number of section heading
     * @param   {number}  tocEntryIdx           Index of heading in ToC
     */
    tocEntryIsActive: function (tocEntryLine: number, tocEntryIdx: number) {
      if (this.tableOfContents === null) {
        return false
      }

      const cursorLine = this.$store.state.activeDocumentInfo.cursor.line

      // Determine index of next heading in ToC list
      const nextTocEntryIdx = Math.min(tocEntryIdx + 1, this.tableOfContents.length - 1)

      // Now, determine the next heading's line number
      let nextTocEntryLine = Infinity
      if (tocEntryIdx !== nextTocEntryIdx) {
        nextTocEntryLine = this.tableOfContents[nextTocEntryIdx].line
      }

      // True, when cursor lies between current and next heading
      return (cursorLine >= tocEntryLine && cursorLine < nextTocEntryLine)
    },
    /**
     * Converts a Table of Contents-entry to (safe) HTML
     *
     * @param   {string}  entryText  The Markdown ToC entry
     *
     * @return  {string}             The safe HTML string
     */
    toc2html: function (entryText: string): string {
      const html = md2html(entryText)
      return sanitizeHtml(html, {
        // Headings may be emphasised and contain code
        allowedTags: [ 'em', 'kbd', 'code' ]
      })
    },
    startDragging: function (event: DragEvent) {
      if (event.currentTarget === null) {
        return
      }
      const fromLine = (event.currentTarget as HTMLElement).dataset.line
      event.dataTransfer?.setData('x-zettlr/toc-drag', fromLine as string)
    },
    dragEnter: function (event: DragEvent) {
      if (event.currentTarget === null) {
        return
      }
      const container = event.currentTarget as HTMLElement
      container.classList.add('toc-drop-effect')
    },
    dragLeave: function (event: DragEvent) {
      if (event.currentTarget === null) {
        return
      }
      const container = event.currentTarget as HTMLElement
      container.classList.remove('toc-drop-effect')
    },
    drop: function (event: DragEvent) {
      if (event.currentTarget === null) {
        return
      }

      const container = event.currentTarget as HTMLElement
      container.classList.remove('toc-drop-effect')

      const fromLine = parseInt(event.dataTransfer?.getData('x-zettlr/toc-drag') as string, 10)
      const toLine = parseInt(container.dataset.line as string, 10)
      const actualToLine = this.findEndOfEntry(toLine)
      if (actualToLine === undefined) {
        console.warn('Could not move section: Could not find correct target line')
        return
      }

      this.$emit('move-section', { from: fromLine, to: actualToLine })
    },
    findEndOfEntry: function (originalToLine: number) {
      if (this.tableOfContents === null) {
        return
      }

      const idx = this.tableOfContents.findIndex(elem => elem.line === originalToLine)

      if (idx < 0) {
        return
      }

      if (idx === this.tableOfContents.length - 1) {
        return -1
      } else {
        return this.tableOfContents[idx + 1].line - 1
      }
    }
  }
})

</script>

<style lang="less">
// Add a neat little effect to the table of content entries as you drag them
.toc-entry-container {
  border-bottom: 2px solid transparent;

  &.toc-drop-effect {
    border-bottom-color: rgb(40, 100, 255);
  }
}
</style>
