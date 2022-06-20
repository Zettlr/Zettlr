<template>
  <div
    id="editor"
    ref="editor"
    v-bind:style="{ 'font-size': `${fontSize}px` }"
    v-bind:class="{
      'code-file': !isMarkdown,
      'fullscreen': distractionFree
    }"
    v-on:wheel="onEditorScroll($event)"
    v-on:mousedown="editorMousedown($event)"
    v-on:mouseup="editorMouseup($event)"
    v-on:mousemove="editorMousemove($event)"
  >
    <div v-show="showSearch" id="editor-search">
      <div class="row">
        <input
          ref="search-input"
          v-model="query"
          type="text"
          v-bind:placeholder="findPlaceholder"
          v-bind:class="{'has-regex': regexpSearch }"
          v-on:keypress.enter.exact="searchNext()"
          v-on:keypress.shift.enter.exact="searchPrevious()"
          v-on:keydown.esc.exact="showSearch = false"
        >
        <button
          v-bind:title="regexLabel"
          v-bind:class="{ 'active': regexpSearch }"
          v-on:click="toggleQueryRegexp()"
        >
          <clr-icon shape="regexp"></clr-icon>
        </button>
        <button
          v-bind:title="closeLabel"
          v-on:click="showSearch = false"
        >
          <clr-icon shape="times"></clr-icon>
        </button>
      </div>
      <div class="row">
        <input
          v-model="replaceString"
          type="text"
          v-bind:placeholder="replacePlaceholder"
          v-bind:class="{'monospace': regexpSearch }"
          v-on:keypress.enter.exact="replaceNext()"
          v-on:keypress.shift.enter.exact="replacePrevious()"
          v-on:keypress.alt.enter.exact="replaceAll()"
          v-on:keydown.esc.exact="showSearch = false"
        >
        <button
          v-bind:title="replaceNextLabel"
          v-on:click="replaceNext()"
        >
          <clr-icon shape="two-way-arrows"></clr-icon>
        </button>
        <button
          v-bind:title="replaceAllLabel"
          v-on:click="replaceAll()"
        >
          <clr-icon shape="step-forward-2"></clr-icon>
        </button>
      </div>
    </div>
    <textarea id="cm-text" ref="textarea" style="display:none;"></textarea>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Editor
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This displays the main editor for the app. It uses the
 *                  MarkdownEditor class to implement the full CodeMirror editor.
 *
 * END HEADER
 */

import countWords from '@common/util/count-words'
import MarkdownEditor from '@common/modules/markdown-editor'
import CodeMirror from 'codemirror'
import extractCitations from '@common/util/extract-citations'
import objectToArray from '@common/util/object-to-array'
import { trans } from '@common/i18n-renderer'
import extractYamlFrontmatter from '@common/util/extract-yaml-frontmatter'
import YAML from 'yaml'

import { nextTick, defineComponent } from 'vue'
import { MainEditorDocumentWrapper } from '@dts/renderer/editor'
import retrieveDocumentFromMain from './util/retrieve-document-from-main'

const ipcRenderer = window.ipc

/**
 * We must define the Markdown instance outside of Vue, since the proxy-fication
 * will cause errors with CodeMirror.
 *
 * @var {MarkdownEditor|null}
 */
let mdEditor: MarkdownEditor|null = null

/**
 * Contains all loaded and currently open documents. Needs to be defined outside
 * because of the Proxies.
 *
 * @var {any[]}
 */
const openDocuments: MainEditorDocumentWrapper[] = []

/**
 * Contains the currently displayed activeDocument; needs to be defined outside
 * due to the same reasons as mdEditor and openDocuments.
 *
 * @var {null|MainEditorDocumentWrapper}
 */
let activeDocument: MainEditorDocumentWrapper|null = null

export default defineComponent({
  name: 'MainEditor',
  components: {
  },
  props: {
    readabilityMode: {
      type: Boolean,
      default: false
    },
    distractionFree: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      currentlyFetchingFiles: [] as string[], // Contains the paths of files that are right now being fetched
      // Should we perform a regexp search?
      regexpSearch: false,
      showSearch: false, // Set to true to show the search box
      query: '', // Models the search value
      replaceString: '', // Models the replace string
      findTimeout: undefined as any, // Holds a timeout so that not every single keypress results in a searchNext
      docInfoTimeout: undefined as any, // Holds a timeout to not update the docInfo every millisecond
      anchor: undefined as undefined|CodeMirror.Position
    }
  },
  computed: {
    useH1: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('heading')
    },
    useTitle: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('title')
    },
    filenameOnly: function (): boolean {
      return this.$store.state.config['zkn.linkFilenameOnly']
    },
    findPlaceholder: function (): string {
      return trans('dialog.find.find_placeholder')
    },
    replacePlaceholder: function (): string {
      return trans('dialog.find.replace_placeholder')
    },
    replaceNextLabel: function (): string {
      return trans('dialog.find.replace_next_label')
    },
    replaceAllLabel: function (): string {
      return trans('dialog.find.replace_all_label')
    },
    closeLabel: function (): string {
      return trans('dialog.find.close_label')
    },
    regexLabel: function (): string {
      return trans('dialog.find.regex_label')
    },
    activeFile: function (): any {
      return this.$store.state.activeFile
    },
    isMarkdown: function (): boolean {
      if (this.activeFile === null) {
        return true // By default, assume Markdown
      }

      return this.activeFile.type === 'file'
    },
    openFiles: function (): any[] {
      return this.$store.state.openFiles
    },
    fontSize: function (): number {
      return this.$store.state.config['editor.fontSize']
    },
    shouldCountChars: function (): boolean {
      return this.$store.state.config['editor.countChars']
    },
    editorConfiguration: function (): any {
      // We update everything, because not so many values are actually updated
      // right after setting the new configurations. Plus, the user won't update
      // everything all the time, but rather do one initial configuration, so
      // even if we incur a performance penalty, it won't be noticed that much.
      const doubleQuotes = this.$store.state.config['editor.autoCorrect.magicQuotes.primary'].split('…')
      const singleQuotes = this.$store.state.config['editor.autoCorrect.magicQuotes.secondary'].split('…')
      return {
        keyMap: this.$store.state.config['editor.inputMode'],
        direction: this.$store.state.config['editor.direction'],
        rtlMoveVisually: this.$store.state.config['editor.rtlMoveVisually'],
        indentUnit: this.$store.state.config['editor.indentUnit'],
        indentWithTabs: this.$store.state.config['editor.indentWithTabs'],
        autoCloseBrackets: this.$store.state.config['editor.autoCloseBrackets'],
        autoCorrect: {
          style: this.$store.state.config['editor.autoCorrect.style'],
          quotes: {
            single: {
              start: singleQuotes[0],
              end: singleQuotes[1]
            },
            double: {
              start: doubleQuotes[0],
              end: doubleQuotes[1]
            }
          },
          replacements: this.$store.state.config['editor.autoCorrect.replacements']
        },
        zettlr: {
          imagePreviewWidth: this.$store.state.config['display.imageWidth'],
          imagePreviewHeight: this.$store.state.config['display.imageHeight'],
          markdownBoldFormatting: this.$store.state.config['editor.boldFormatting'],
          markdownItalicFormatting: this.$store.state.config['editor.italicFormatting'],
          muteLines: this.$store.state.config.muteLines,
          citeStyle: this.$store.state.config['editor.citeStyle'],
          readabilityAlgorithm: this.$store.state.config['editor.readabilityAlgorithm'],
          zettelkasten: {
            idRE: this.$store.state.config['zkn.idRE'],
            idGen: this.$store.state.config['zkn.idGen'],
            linkStart: this.$store.state.config['zkn.linkStart'],
            linkEnd: this.$store.state.config['zkn.linkEnd'],
            linkWithFilename: this.$store.state.config['zkn.linkWithFilename']
          },
          render: {
            citations: this.$store.state.config['display.renderCitations'],
            iframes: this.$store.state.config['display.renderIframes'],
            images: this.$store.state.config['display.renderImages'],
            links: this.$store.state.config['display.renderLinks'],
            math: this.$store.state.config['display.renderMath'],
            tasks: this.$store.state.config['display.renderTasks'],
            headingTags: this.$store.state.config['display.renderHTags'],
            tables: this.$store.state.config['editor.enableTableHelper'],
            emphasis: this.$store.state.config['display.renderEmphasis']
          }
        }
      }
    },
    autoSave: function (): any {
      return this.$store.state.config['editor.autoSave']
    },
    tagDatabase: function () {
      return this.$store.state.tagDatabase
    },
    cslItems: function () {
      return this.$store.state.cslItems
    },
    fsalFiles: function () {
      const tree = this.$store.state.fileTree
      const files = []

      for (const item of tree) {
        if (item.type === 'directory') {
          const contents = objectToArray(item, 'children').filter(descriptor => descriptor.type === 'file')
          files.push(...contents)
        } else if (item.type === 'file') {
          files.push(item)
        }
      }

      return files
    },
    globalSearchResults: function () {
      return this.$store.state.searchResults
    }
  },
  watch: {
    useH1: function () {
      this.updateFileDatabase()
    },
    useTitle: function () {
      this.updateFileDatabase()
    },
    filenameOnly: function () {
      this.updateFileDatabase()
    },
    fsalFiles: function () {
      this.updateFileDatabase()
    },
    cslItems: function () {
      if (mdEditor === null) {
        return
      }

      // We have received new items, so we should update them in the editor.
      const items = this.cslItems.map((item: any) => {
        // Get a rudimentary author list
        let authors = ''
        if (item.author !== undefined) {
          authors = item.author.map((author: any) => {
            if (author.family !== undefined) {
              return author.family
            } else if (author.literal !== undefined) {
              return author.literal
            } else {
              return undefined
            }
          }).filter((elem: any) => elem !== undefined).join(', ')
        }

        let title = ''
        if (item.title !== undefined) {
          title = item.title
        } else if (item['container-title'] !== undefined) {
          title = item['container-title']
        }

        // This is just a very crude representation of the citations.
        return {
          text: item.id,
          displayText: `${item.id}: ${authors} - ${title}`
        }
      })
      mdEditor.setCompletionDatabase('citekeys', items)
    },
    readabilityMode: function () {
      if (mdEditor === null) {
        return
      }

      mdEditor.readabilityMode = this.readabilityMode
    },
    distractionFree: function () {
      if (mdEditor === null) {
        return
      }

      mdEditor.distractionFree = this.distractionFree
    },
    editorConfiguration: function () {
      if (mdEditor === null) {
        return
      }

      // Update the editor configuration, if anything changes.
      mdEditor.setOptions(this.editorConfiguration)
    },
    tagDatabase: function () {
      if (mdEditor === null) {
        return
      }

      // We must deproxy the tag database
      const unproxy: any = {}
      for (const tag in this.tagDatabase) {
        unproxy[tag] = {
          text: this.tagDatabase[tag].text,
          count: this.tagDatabase[tag].count,
          className: this.tagDatabase[tag].className
        }
      }
      mdEditor.setCompletionDatabase('tags', unproxy)
    },
    globalSearchResults: function () {
      this.maybeHighlightSearchResults()
    },
    activeFile: async function () {
      if (mdEditor === null) {
        console.error('Received a file update but the editor was not yet initiated!')
        return
      }

      if (this.activeFile === null) {
        mdEditor.swapDoc(CodeMirror.Doc('', 'multiplex'), 'multiplex')
        mdEditor.readOnly = true
        this.$store.commit('updateTableOfContents', mdEditor.tableOfContents)
        // Update the citation keys with an empty array
        this.updateCitationKeys()
        return
      }

      const doc = openDocuments.find(doc => doc.path === this.activeFile.path)

      if (doc !== undefined) {
        // Simply swap it
        this.swapDocument(doc)
      } else if (!this.currentlyFetchingFiles.includes(this.activeFile.path)) {
        // We have to request the document beforehand
        this.currentlyFetchingFiles.push(this.activeFile.path)
        const newDoc = await retrieveDocumentFromMain(
          this.activeFile.path,
          this.activeFile.ext,
          this.shouldCountChars,
          this.autoSave,
          (doc) => { this.save(doc).catch(e => console.error(e)) }
        )

        openDocuments.push(newDoc)
        const idx = this.currentlyFetchingFiles.findIndex(e => e === newDoc.path)
        this.currentlyFetchingFiles.splice(idx, 1)
        // Let's check whether the active file has in the meantime changed
        // If it has, don't overwrite the current one
        if (this.activeFile.path === newDoc.path && mdEditor !== null) {
          this.swapDocument(newDoc)
        }
      } // Else: The file might currently being fetched, so let's wait ...
    },
    openFiles: function () {
      // The openFiles array in the store has changed --> remove all documents
      // that are not present anymore
      for (const doc of openDocuments) {
        const found = this.openFiles.find(descriptor => descriptor.path === doc.path)
        if (found === undefined) {
          // Remove the document from our array
          const idx = openDocuments.indexOf(doc)
          openDocuments.splice(idx, 1)
        }
      }
    },
    query: function () {
      // Make sure to switch the regexp search depending on the search input
      const isRegexp = /^\/.+\/[gimy]{0,4}$/.test(this.query)
      if (isRegexp && this.regexpSearch === false) {
        this.regexpSearch = true
      } else if (!isRegexp && this.regexpSearch === true) {
        this.regexpSearch = false
      }
    },
    showSearch: function (newValue, oldValue) {
      if (newValue === true && oldValue === false) {
        // The user activated search, so focus the input and run a search (if
        // the query wasnt' empty)
        nextTick()
          .then(() => {
            (this.$refs['search-input'] as HTMLInputElement).focus()
            ;(this.$refs['search-input'] as HTMLInputElement).select()
          })
          .catch(err => console.error(err))
      } else if (newValue === false) {
        // Always "stopSearch" if the input is not shown, since this will clear
        // out, e.g., the matches on the scrollbar
        if (mdEditor !== null) {
          mdEditor.stopSearch()
        }
      }
    },
    shouldCountChars: function (newVal, oldVal) {
      if (mdEditor === null) {
        return
      }

      mdEditor.countChars = newVal
    }
  },
  mounted: function () {
    // As soon as the component is mounted, initiate the editor
    mdEditor = new MarkdownEditor(this.$refs.textarea as HTMLTextAreaElement, this.editorConfiguration)

    // We have to set this to the appropriate value after mount, afterwards it
    // will be updated as appropriate.
    mdEditor.countChars = this.shouldCountChars

    // Update the document info on corresponding events
    mdEditor.on('change', (changeObj) => {
      if (activeDocument === null || mdEditor === null) {
        return
      }

      // Announce that the file is modified (if applicable) to the whole application
      this.$store.commit('announceModifiedFile', {
        filePath: activeDocument.path,
        isClean: activeDocument.cmDoc.isClean()
      })

      this.$store.commit('updateTableOfContents', mdEditor.tableOfContents)
    })

    mdEditor.on('cursorActivity', () => {
      // Don't update every keystroke to not run into performance problems with
      // very long documents, since calculating the word count needs considerable
      // time, and without the delay, typing seems "laggy".
      if (mdEditor !== null) {
        this.$store.commit('activeDocumentInfo', mdEditor.documentInfo)
      }
    })

    mdEditor.on('zettelkasten-link', (linkContents) => {
      ipcRenderer.invoke('application', {
        command: 'force-open',
        payload: {
          linkContents: linkContents,
          newTab: undefined // let open-file command decide based on preferences
        }
      })
        .catch(err => console.error(err))

      if (this.$store.state.config['zkn.autoSearch'] === true) {
        (this.$root as any).startGlobalSearch(linkContents)
      }
    })

    mdEditor.on('zettelkasten-tag', (tag) => {
      (this.$root as any).startGlobalSearch(tag)
    })

    // Listen to shortcuts from the main process
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'save-file' && activeDocument !== null) {
        this.save(activeDocument).catch(e => console.error(e))
      } else if (shortcut === 'copy-as-html' && mdEditor !== null) {
        mdEditor.copyAsHTML()
      } else if (shortcut === 'paste-as-plain' && mdEditor !== null) {
        mdEditor.pasteAsPlainText()
      } else if (shortcut === 'toggle-typewriter-mode' && mdEditor !== null) {
        mdEditor.hasTypewriterMode = mdEditor.hasTypewriterMode === false
      } else if (shortcut === 'search') {
        this.showSearch = this.showSearch === false
      }
    })

    ipcRenderer.on('open-file-changed', (event, fileDescriptor) => {
      // This event is emitted by the main process if the user wants to exchange
      // a file with remote changes. It already ships with the file descriptor
      // so all we have to do is find the right file and just swap the contents.
      // We don't need to update anything else, since that has been updated in
      // the application's store already by the time this event arrives.
      const doc = openDocuments.find(item => item.path === fileDescriptor.path)

      if (doc !== undefined) {
        const { top } = (mdEditor as MarkdownEditor).codeMirror.getScrollInfo()
        const cur = Object.assign({}, doc.cmDoc.getCursor())
        doc.cmDoc.setValue(fileDescriptor.content)
        nextTick()
          .then(() => {
            // Wait a little bit for the unwanted modification-events to emit and
            // then immediately revert that status again.
            doc.cmDoc.markClean()
            doc.cmDoc.setCursor(cur)
            ;(mdEditor as MarkdownEditor).codeMirror.getWrapperElement().scrollTop = top
            this.$store.commit('announceModifiedFile', {
              filePath: doc.path,
              isClean: doc.cmDoc.isClean()
            })
          })
          .catch(err => console.error(err))
      }
    })

    ipcRenderer.on('save-documents', (event, pathList = []) => {
      // If this event gets emitted, the main process wants
      // some open and modified documents to be saved.
      if (pathList.length === 0) {
        pathList = openDocuments.map(doc => doc.path)
      }

      const docsToSave = openDocuments.filter(doc => pathList.includes(doc.path))

      for (const doc of docsToSave) {
        this.save(doc).catch((e: any) => console.error(e))
      }
    })

    // Finally, let's observe if the editor element changes. If so, refresh the
    // editor. This will keep the cursor correct when the SplitViews are either
    // opened/closed or resized.
    const obs = new ResizeObserver(entries => {
      if (mdEditor !== null) {
        mdEditor.codeMirror.refresh()
      }
    })

    obs.observe(this.$refs.editor as any)
  },
  methods: {
    swapDocument (doc: MainEditorDocumentWrapper) {
      if (mdEditor === null) {
        console.error(`Could not swap to document ${doc.path}: Editor was not initialized`)
        return
      }

      // Provide the editor instance with metadata for the new file
      mdEditor.setOptions({
        zettlr: {
          markdownImageBasePath: this.activeFile.dir,
          metadata: { path: this.activeFile.path, id: this.activeFile.id }
        }
      })
      mdEditor.swapDoc(doc.cmDoc, doc.mode)
      activeDocument = doc
      mdEditor.readOnly = false
      this.$store.commit('updateTableOfContents', mdEditor.tableOfContents)
      this.$store.commit('activeDocumentInfo', mdEditor.documentInfo)
      // Check if there are search results available for this file that we can
      // pull in and highlight
      this.maybeHighlightSearchResults()
      // Update the citation keys
      this.updateCitationKeys()
    },
    maybeUpdateActiveDocumentInfo () {
      if (this.docInfoTimeout !== undefined) {
        return // There will be an update soon enough.
      }

      this.docInfoTimeout = setTimeout(() => {
        this.docInfoTimeout = undefined
        if (mdEditor !== null) {
          this.$store.commit('activeDocumentInfo', mdEditor.documentInfo)
        }
      }, 1000)
    },
    jtl (lineNumber: number, setCursor: boolean = false) {
      if (mdEditor !== null) {
        mdEditor.jtl(lineNumber, setCursor)
      }
    },
    async save (doc: MainEditorDocumentWrapper) {
      if (doc.cmDoc.isClean() === true) {
        return // Nothing to save
      }

      const newContents = doc.cmDoc.getValue()
      const currentWordCount = countWords(newContents, this.shouldCountChars)
      const descriptor = {
        path: doc.path,
        newContents: doc.cmDoc.getValue(),
        offsetWordCount: currentWordCount - doc.lastWordCount
      }

      doc.lastWordCount = currentWordCount

      const result = await ipcRenderer.invoke('application', {
        command: 'file-save',
        payload: descriptor
      })

      if (result !== true) {
        console.error('Retrieved a falsy result from main, indicating an error with saving the file.')
        return
      }

      // Everything worked out, so clean up
      doc.cmDoc.markClean()
      this.$store.dispatch('regenerateTagSuggestions').catch(e => console.error(e))
      this.$store.commit('announceModifiedFile', {
        filePath: doc.path,
        isClean: doc.cmDoc.isClean()
      })

      // Also, extract all cited keys
      this.updateCitationKeys()
      // Saving can additionally do some changes to the files which are relevant
      // to the autocomplete, so make sure to update that as well. See #2330
      this.updateFileDatabase()
    },
    updateCitationKeys: function () {
      if (mdEditor === null) {
        return
      }

      const value = mdEditor.value

      const citations = extractCitations(value)
      const keys = []
      for (const citation of citations) {
        keys.push(...citation.citations.map(elem => elem.id))
      }
      this.$store.commit('updateCitationKeys', keys)
      // After we have updated the current file's citation keys, it is time
      // to generate a new list of references.
      this.$store.dispatch('updateBibliography').catch(e => console.error(e))
    },
    updateFileDatabase () {
      if (mdEditor === null) {
        return
      }

      const fileDatabase: any = {}

      for (const file of this.fsalFiles) {
        const fname = file.name.substr(0, file.name.lastIndexOf('.'))
        let displayText = fname // Fallback: Only filename
        if (this.useTitle && typeof file.frontmatter?.title === 'string') {
          // (Else) if there is a frontmatter, use that title
          displayText = file.frontmatter.title
        } else if (this.useH1 && file.firstHeading !== null) {
          // The user wants to use first headings as fallbacks
          displayText = file.firstHeading
        }

        if (file.id !== '' && !this.filenameOnly) {
          displayText = `${file.id}: ${displayText}`
        }

        fileDatabase[file.path] = {
          // Use the ID, if given, or the filename
          text: (file.id !== '' && !this.filenameOnly) ? file.id : fname,
          displayText: displayText,
          id: (file.id !== '' && !this.filenameOnly) ? file.id : ''
        }
      }

      mdEditor.setCompletionDatabase('files', fileDatabase)
    },
    toggleQueryRegexp () {
      const isRegexp = /^\/.+\/[gimy]{0,4}$/.test(this.query.trim())

      if (isRegexp) {
        const match = /^\/(.+)\/[gimy]{0,4}$/.exec(this.query.trim())
        if (match !== null) {
          this.query = match[1]
        }
      } else {
        this.query = `/${this.query}/`
      }
    },
    executeCommand (cmd: string) {
      if (mdEditor === null) {
        return
      }

      // Executes a markdown command on the editor instance
      mdEditor.runCommand(cmd)
      mdEditor.focus()
    },
    replaceSelection (value: string) {
      if (mdEditor === null) {
        return
      }

      mdEditor.codeMirror.replaceSelection(value)
    },
    // SEARCH FUNCTIONALITY BLOCK
    searchNext () {
      // Make sure to clear out a timeout to prevent Zettlr from auto-searching
      // again after the user deliberately searched by pressing Enter.
      if (this.findTimeout !== undefined) {
        clearTimeout(this.findTimeout)
        this.findTimeout = undefined
      }

      if (mdEditor === null) {
        return
      }

      mdEditor.searchNext(this.query)
    },
    searchPrevious () {
      if (mdEditor === null) {
        return
      }

      mdEditor.searchPrevious(this.query)
    },
    replaceNext () {
      if (mdEditor === null) {
        return
      }

      mdEditor.replaceNext(this.query, this.replaceString)
    },
    replacePrevious () {
      if (mdEditor === null) {
        return
      }

      mdEditor.replacePrevious(this.query, this.replaceString)
    },
    replaceAll () {
      if (mdEditor === null) {
        return
      }

      mdEditor.replaceAll(this.query, this.replaceString)
    },
    maybeHighlightSearchResults () {
      const doc = this.activeFile
      if (doc === null || mdEditor === null) {
        return // No open file/no editor
      }

      const result = this.globalSearchResults.find((r: any) => r.file.path === doc.path)
      if (result !== undefined) {
        // Construct CodeMirror.Ranges from the results
        const rangesToHighlight = []
        for (const res of result.result) {
          const line: number = res.line
          for (const range of res.ranges) {
            const { from, to } = range
            rangesToHighlight.push({
              anchor: { line: line, ch: from },
              head: { line: line, ch: to }
            })
          }
        }
        mdEditor.highlightRanges(rangesToHighlight as any)
      }
    },
    /**
     * Scrolls the editor according to the value if the user scrolls left of the
     * .CodeMirror-scroll element
     *
     * @param   {WheelEvent}  event  The mousewheel event
     */
    onEditorScroll (event: WheelEvent) {
      if (event.target !== this.$refs.editor) {
        return // Only handle if the event's target is the editor itself
      }

      const scroller = (this.$refs.editor as HTMLElement).querySelector('.CodeMirror-scroll')

      if (scroller !== null) {
        scroller.scrollTop += event.deltaY
      }
    },
    /**
     * Triggers when the user presses any mouse button
     *
     * @param   {MouseEvent}  event  The mouse event
     */
    editorMousedown (event: MouseEvent) {
      // start selecting lines only if we are on the left margin and the left mouse button is pressed
      if (event.target !== this.$refs.editor || event.button !== 0 || mdEditor === null) {
        return
      }

      // set the start point of the selection to be where the mouse was clicked
      this.anchor = mdEditor.codeMirror.coordsChar({ left: event.pageX, top: event.pageY })
      mdEditor.codeMirror.setSelection(this.anchor)
    },

    editorMousemove (event: MouseEvent) {
      if (this.anchor === undefined || mdEditor === null) {
        return
      }
      // get the point where the mouse has moved
      const addPoint = mdEditor.codeMirror.coordsChar({ left: event.pageX, top: event.pageY })
      // use the original start point where the mouse first was clicked
      // and change the end point to where the mouse has moved so far
      mdEditor.codeMirror.setSelection(this.anchor, addPoint)
    },
    /**
     * Triggers when the user releases any mouse button
     *
     * @param   {MouseEvent}  event  The mouse event
     */
    editorMouseup (event: MouseEvent) {
      if (this.anchor === undefined || mdEditor === null) {
        // This event gets also fired when someone, e.g., wants to edit an image
        // caption, so we must explicitly check if we are currently in a left-
        // side selection event, and if we aren't, don't do anything.
        return
      }

      // when the mouse is released, set anchor to undefined to stop adding lines
      this.anchor = undefined
      // Also, make sure the editor is focused.
      mdEditor.codeMirror.focus()
    },
    addKeywordsToFile (keywords: string[]) {
      if (mdEditor === null || activeDocument === null) {
        return
      }

      // Split the contents of the editor into frontmatter and contents, then
      // add the keywords to the frontmatter, slice everything back together
      // and then overwrite the editor's contents.
      let { frontmatter, content } = extractYamlFrontmatter(mdEditor.value)

      let postFrontmatter = '\n'
      if (frontmatter !== null) {
        if ('keywords' in frontmatter) {
          frontmatter.keywords = frontmatter.keywords.concat(keywords)
        } else if ('tags' in frontmatter) {
          frontmatter.tags = frontmatter.tags.concat(keywords)
        } else {
          frontmatter.keywords = keywords
        }
      } else {
        // Frontmatter was null, so create one
        frontmatter = {}
        frontmatter.keywords = keywords
        postFrontmatter += '\n' // Make sure if we're now ADDING a frontmatter to space it from the content
      }

      // Glue it back together and set it as content
      activeDocument.cmDoc.setValue('---\n' + YAML.stringify(frontmatter) + '---' + postFrontmatter + content)
    },
    getValue () {
      return mdEditor?.value ?? ''
    },
    moveSection (from: number, to: number) {
      mdEditor?.moveSection(from, to)
    }
  }
})
</script>

<style lang="less">
// Editor Geometry

// Editor margins left and right for all breakpoints in both fullscreen and
// normal mode.
@editor-margin-fullscreen-sm:   50px;
@editor-margin-fullscreen-md:  5vw;
@editor-margin-fullscreen-lg:  10vw;
@editor-margin-fullscreen-xl:  20vw;
@editor-margin-fullscreen-xxl: 30vw;

@editor-margin-normal-sm:  20px;
@editor-margin-normal-md:  50px;
@editor-margin-normal-lg: 100px;

#editor {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: #ffffff;
  transition: 0.2s background-color ease;

  div#editor-search {
    position: absolute;
    width: 300px;
    right: 0;
    z-index: 7; // One less and the scrollbar will on top of the input field
    padding: 5px 10px;

    div.row { display: flex; }

    input {
      flex: 3;
      &.has-regex { font-family: monospace; }
    }

    button {
      flex: 1;
      max-width: 24px;
    }
  }

  .CodeMirror {
    // The CodeMirror editor needs to respect the new tabbar; it cannot take
    // up 100 % all for itself anymore.
    margin-left: 0.5em;
    height: 100%;
    font-family: inherit;
    // background: none;

    @media(min-width: 1025px) { margin-left: @editor-margin-normal-lg; }
    @media(max-width: 1024px) { margin-left: @editor-margin-normal-md; }
    @media(max-width:  900px) { margin-left: @editor-margin-normal-sm; }
  }

  // If a code file is loaded, we need to display the editor contents in monospace.
  &.code-file .CodeMirror {
    font-family: monospace;

    margin-left: 0px;
    .CodeMirror-scroll {
      padding-right: 0px;
    }

    // We're using this solarized theme here: https://ethanschoonover.com/solarized/
    // See also the CodeEditor.vue component, which uses the same colours
    @base03:    #002b36;
    @base02:    #073642;
    @base01:    #586e75;
    @base00:    #657b83;
    @base0:     #839496;
    @base1:     #93a1a1;
    @base2:     #eee8d5;
    @base3:     #fdf6e3;
    @yellow:    #b58900;
    @orange:    #cb4b16;
    @red:       #dc322f;
    @magenta:   #d33682;
    @violet:    #6c71c4;
    @blue:      #268bd2;
    @cyan:      #2aa198;
    @green:     #859900;

    color: @base01;
    .cm-string     { color: @green; }
    .cm-string-2   { color: @green; }
    .cm-keyword    { color: @green; }
    .cm-atom       { color: @green; }
    .cm-tag        { color: @blue; }
    .cm-qualifier  { color: @blue; }
    .cm-builtin    { color: @blue; }
    .cm-variable-2 { color: @yellow; }
    .cm-variable   { color: @yellow; }
    .cm-comment    { color: @base1; }
    .cm-attribute  { color: @orange; }
    .cm-property   { color: @magenta; }
    .cm-type       { color: @red; }
    .cm-number     { color: @violet; }

    // Reset the margins for code files (top/bottom, see the other
    // CodeMirror-code definition)
    .CodeMirror-code { margin: 0; }
  }

  .CodeMirror-code {
    margin: 5em 0em;
    @media(max-width: 1024px) { margin: @editor-margin-fullscreen-md 0em; }

    .mute { opacity:0.2; }
  }

  .CodeMirror-scroll {
    padding-right: 5em;
    @media(min-width: 1025px) { padding-right: @editor-margin-normal-lg; }
    @media(max-width: 1024px) { padding-right: @editor-margin-normal-md; }
    @media(max-width:  900px) { padding-right: @editor-margin-normal-sm; }
    overflow-x: hidden !important; // Necessary to hide the horizontal scrollbar

    // We need to override a negative margin
    // and a bottom padding from the standard
    // CSS for some calculations to be correct
    // such as the table editor
    margin-bottom: 0px;
    padding-bottom: 0px;
  }

  .CodeMirror.CodeMirror-readonly {
    .CodeMirror-cursor { display: none !important; }
  }

  // Math equations in text mode
  .katex {
    font-size: 1.1em; // reduce font-size of math a bit
    display: inline-block; // needed for display math to behave properly
    user-select: none; // Disable user text selection
  }

  // Math equations in display mode
  .katex-display, .katex-display > .katex > .katex-html {
    display: inline-block; // needed for display math to behave properly
    width: 100%; // display math should be centred
    margin-bottom: -0.5em; // counterbalance additional empty line that is added by code mirror due to a bug https://github.com/codemirror/CodeMirror/issues/6600
  }
}

body.dark #editor {
  background-color: rgba(20, 20, 30, 1);
  .CodeMirror .CodeMirror-gutters { background-color: rgba(20, 20, 30, 1); }
}

body.darwin #editor {
  // On macOS the tabbar is 30px high.
  &:not(.fullscreen) {
    height: calc(100% - 30px);
  }

  div#editor-search {
    background-color: rgba(230, 230, 230, 1);
    border-bottom-left-radius: 6px;
    padding: 6px;
    box-shadow: -2px 2px 4px 1px rgba(0, 0, 0, .3);

    input[type="text"], button {
      border-radius: 0;
      margin: 0;
    }

    button:hover { background-color: rgb(240, 240, 240); }
    button.active { background-color: rgb(200, 200, 200) }
  }
}

body.darwin.dark #editor {
  div#editor-search {
    background-color: rgba(60, 60, 60, 1);
  }
}

body.win32 #editor, body.linux #editor {
  // On Windows, the tab bar is 30px high
  &:not(.fullscreen) {
    height: calc(100% - 30px);
  }

  div#editor-search {
    background-color: rgba(230, 230, 230, 1);
    box-shadow: -2px 2px 4px 1px rgba(0, 0, 0, .3);

    button { max-width: fit-content; }
    button, input { border-width: 1px; }

    button:hover { background-color: rgb(240, 240, 240); }
    button.active { background-color: rgb(200, 200, 200) }
  }
}

// CodeMirror fullscreen
#editor.fullscreen {
    .CodeMirror {
    @media(min-width: 1301px) { margin-left: @editor-margin-fullscreen-xxl !important; }
    @media(max-width: 1300px) { margin-left: @editor-margin-fullscreen-xl  !important; }
    @media(max-width: 1100px) { margin-left: @editor-margin-fullscreen-lg  !important; }
    @media(max-width: 1000px) { margin-left: @editor-margin-fullscreen-md  !important; }
    @media(max-width:  800px) { margin-left: @editor-margin-fullscreen-sm  !important; }

    .CodeMirror-scroll {
      @media(min-width: 1301px) { padding-right: @editor-margin-fullscreen-xxl !important; }
      @media(max-width: 1300px) { padding-right: @editor-margin-fullscreen-xl  !important; }
      @media(max-width: 1100px) { padding-right: @editor-margin-fullscreen-lg  !important; }
      @media(max-width: 1000px) { padding-right: @editor-margin-fullscreen-md  !important; }
      @media(max-width:  800px) { padding-right: @editor-margin-fullscreen-sm  !important; }
    }
  }
}

body.darwin {
    #editor.fullscreen {
     border-top: 1px solid #d5d5d5;
  }

  &.dark {
    #editor.fullscreen {
      border-top-color: #505050;
    }
  }
}

// Define the readability classes
.cm-readability-0   { background-color: hsv(52, 27.6%, 96.5%); color: #444444 !important; }
.cm-readability-1   { background-color: hsv( 1, 19.7%, 89.8%); color: #444444 !important; }
.cm-readability-2   { background-color: hsv( 184, 36%, 93.7%); color: #444444 !important; }
.cm-readability-3   { background-color: hsv( 202, 20.4%, 96.1%); color: #444444 !important; }
.cm-readability-4   { background-color: hsv( 31, 41.9%, 90%); color: #444444 !important; }
.cm-readability-5   { background-color: hsv( 91, 36%, 95%); color: #444444 !important; }
.cm-readability-6   { background-color: hsv( 91, 80%, 91%); color: #444444 !important; }
.cm-readability-7   { background-color: hsv( 52, 60%, 40%); color: #444444 !important; }
.cm-readability-8   { background-color: hsv( 1, 62.4%, 52.5%); color: #444444 !important; }
.cm-readability-9   { background-color: hsv( 184, 70%, 45.5%); color: #444444 !important; }
.cm-readability-10  { background-color: hsv( 201, 89%, 24.5%); color: #444444 !important; }
</style>
