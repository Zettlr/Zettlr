<template>
  <div id="editor" ref="editor" v-bind:style="{ 'font-size': `${fontSize}px` }">
    <textarea id="cm-text" ref="textarea" style="display:none;"></textarea>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import countWords from '../common/util/count-words'
import makeSearchRegEx from '../common/util/make-search-regex'
import MarkdownEditor from '../common/modules/markdown-editor'
import CodeMirror from 'codemirror'

export default {
  name: 'Editor',
  props: {
    query: {
      type: String,
      default: ''
    },
    readabilityMode: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      editor: null,
      openDocuments: [], // Contains all loaded documents if applicable
      currentlyFetchingFiles: [], // Contains the paths of files that are right now being fetched
      searchCursor: null,
      currentLocalSearch: '',
      scrollbarAnnotations: null,
      activeDocument: null // Almost like activeFile, only with additional info
    }
  },
  computed: {
    activeFile: function () {
      return this.$store.state.activeFile
    },
    openFiles: function () {
      return this.$store.state.openFiles
    },
    fontSize: function () {
      return this.$store.state.config['editor.fontSize']
    },
    editorConfiguration: function () {
      // We update everything, because not so many values are actually updated
      // right after setting the new configurations. Plus, the user won't update
      // everything all the time, but rather do one initial configuration, so
      // even if we incur a performance penalty, it won't be noticed that much.
      const doubleQuotes = this.$store.state.config['editor.autoCorrect.magicQuotes.primary'].split('…')
      const singleQuotes = this.$store.state.config['editor.autoCorrect.magicQuotes.secondary'].split('…')
      return {
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
          }
        },
        zettlr: {
          imagePreviewWidth: this.$store.state.config['display.imageWidth'],
          imagePreviewHeight: this.$store.state.config['display.imageHeight'],
          markdownBoldFormatting: this.$store.state.config['editor.boldFormatting'],
          markdownItalicFormatting: this.$store.state.config['editor.italicFormatting'],
          zettelkasten: {
            idRE: this.$store.state.config['zkn.idRE'],
            idGen: this.$store.state.config['zkn.idGen'],
            linkStart: this.$store.state.config['zkn.linkStart'],
            linkEnd: this.$store.state.config['zkn.linkEnd'],
            linkWithFilename: this.$store.state.config['zkn.linkWithFilename'] // ,
            // autoCreateLinkedFiles: this.$store.state.config['zkn.autoCreateLinkedFiles'],
            // autoSearch: this.$store.state.config['zkn.autoSearch']
          },
          readabilityAlgorithm: this.$store.state.config['editor.readabilityAlgorithm'],
          render: {
            citations: this.$store.state.config['display.renderCitations'],
            iframes: this.$store.state.config['display.renderIframes'],
            images: this.$store.state.config['display.renderImages'],
            links: this.$store.state.config['display.renderLinks'],
            math: this.$store.state.config['display.renderMath'],
            tasks: this.$store.state.config['display.renderTasks'],
            headingTags: this.$store.state.config['display.renderHTags'],
            tables: this.$store.state.config['editor.enableTableHelper']
          }
        }
      }
    }

  },
  watch: {
    readabilityMode: function () {
      this.editor.readabilityMode = this.readabilityMode
    },
    editorConfiguration: function () {
      // Update the editor configuration, if anything changes.
      this.editor.setOptions(this.editorConfiguration)
    },
    activeFile: function () {
      if (this.editor === null) {
        console.error('Received a file update but the editor was not yet initiated!')
        return
      }

      // TODO: Handle all closed state!

      const doc = this.openDocuments.find(doc => doc.path === this.activeFile.path)

      if (doc !== undefined) {
        // Simply swap it
        this.editor.setOptions({
          zettlr: { markdownImageBasePath: this.activeFile.dir }
        })
        this.editor.swapDoc(doc.cmDoc)
        this.activeDocument = doc
        this.editor.readOnly = false
        this.$store.commit('updateTableOfContents', this.editor.tableOfContents)
      } else if (this.currentlyFetchingFiles.includes(this.activeFile.path) === false) {
        // We have to request the document beforehand
        this.currentlyFetchingFiles.push(this.activeFile.path)
        ipcRenderer.invoke('application', { command: 'get-file-contents', payload: this.activeFile.path })
          .then((descriptorWithContent) => {
            const mode = (this.activeFile.ext === '.tex') ? 'stex' : 'multiplex'
            const newDoc = {
              path: descriptorWithContent.path,
              cmDoc: CodeMirror.Doc(descriptorWithContent.content, mode),
              modified: false,
              lastWordCount: countWords(descriptorWithContent.content, false) // TODO: re-enable countChars
            }
            this.openDocuments.push(newDoc)
            const idx = this.currentlyFetchingFiles.findIndex(e => e === descriptorWithContent.path)
            this.currentlyFetchingFiles.splice(idx, 1)
            // Let's check whether the active file has in the meantime changed
            // If it has, don't overwrite the current one
            if (this.activeFile.path === descriptorWithContent.path) {
              this.editor.setOptions({
                zettlr: { markdownImageBasePath: this.activeFile.dir }
              })
              this.editor.swapDoc(newDoc.cmDoc)
              this.activeDocument = newDoc
              this.editor.readOnly = false
              this.$store.commit('updateTableOfContents', this.editor.tableOfContents)
            }
          })
          .catch(e => console.error(e))
      } // Else: The file might currently being fetched, so let's wait ...
    },
    openFiles: function () {
      // The openFiles array in the store has changed --> remove all documents
      // that are not present anymore
      for (const doc of this.openDocuments) {
        const found = this.openFiles.find(descriptor => descriptor.path === doc.path)
        if (found === undefined) {
          // Remove the document from our array
          const idx = this.openDocuments.indexOf(doc)
          this.openDocuments.splice(idx, 1)
        }
      }
    },
    query: function () {
      // Begin a search
      this.searchNext()
    }
  },
  mounted: function () {
    // As soon as the component is mounted, initiate the editor
    this.editor = new MarkdownEditor(this.$refs.textarea, this.editorConfiguration)

    // Update the document info on corresponding events
    this.editor.on('change', (changeOrigin, newTextCharCount, newTextWordCount) => {
      this.$store.commit('activeDocumentInfo', this.editor.documentInfo)
      // this.activeDocument.modified = this.activeDocument.cmDoc.isClean()
      // Announce that the file is modified (if applicable) to the whole application
      this.$store.commit('announceModifiedFile', {
        filePath: this.activeDocument.path,
        isClean: this.activeDocument.cmDoc.isClean()
      })

      this.$store.commit('updateTableOfContents', this.editor.tableOfContents)
    })

    this.editor.on('cursorActivity', () => {
      this.$store.commit('activeDocumentInfo', this.editor.documentInfo)
    })

    // Initiate the scrollbar annotations
    this.scrollbarAnnotations = this.editor.codeMirror.annotateScrollbar('sb-annotation')
    this.scrollbarAnnotations.update([])

    this.$root.$on('search-next', () => {
      this.searchNext()
    })

    // Listen to shortcuts from the main process
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'save-file') {
        this.save()
      } else if (shortcut === 'copy-as-html') {
        this.editor.copyAsHTML()
      } else if (shortcut === 'paste-as-plain') {
        this.editor.pasteAsPlainText()
      }
    })

    // Other elements can emit a toc-line event on $root to request a jump to
    // a specific line.
    this.$root.$on('toc-line', (line) => {
      this.editor.jtl(line)
    })
  },
  methods: {
    save () {
      // Go through all open files, and, if they are modified, save them
      if (this.activeDocument.cmDoc.isClean()) {
        return // Nothing to save
      }

      const newContents = this.activeDocument.cmDoc.getValue()
      const currentWordCount = countWords(newContents, false) // TODO: Re-enable char count
      const descriptor = {
        path: this.activeDocument.path,
        newContents: this.activeDocument.cmDoc.getValue(),
        offsetWordCount: currentWordCount - this.activeDocument.lastWordCount
      }

      this.activeDocument.lastWordCount = currentWordCount

      // TODO: Switch to handle/invoke to only mark it as clean if there was no error
      ipcRenderer.send('message', { command: 'file-save', content: descriptor })

      this.activeDocument.cmDoc.markClean()
      this.$store.commit('announceModifiedFile', {
        filePath: this.activeDocument.path,
        isClean: this.activeDocument.cmDoc.isClean()
      })
    },
    searchNext () {
      if (this.query.trim() === '') {
        // Stop search if the field is empty
        this.stopSearch()
        return
      }

      if (this.searchCursor === null || this.currentLocalSearch !== this.query.trim()) {
        // (Re)start search in case there was none or the term has changed
        this.startSearch()
      } else if (this.searchCursor.findNext() === true) {
        this.editor.codeMirror.setSelection(this.searchCursor.from(), this.searchCursor.to())
      } else {
        // Start from beginning
        this.searchCursor = this.editor.codeMirror.getSearchCursor(makeSearchRegEx(this.query), { 'line': 0, 'ch': 0 })
        if (this.searchCursor.findNext() === true) {
          this.editor.codeMirror.setSelection(this.searchCursor.from(), this.searchCursor.to())
        }
      }
    },

    /**
      * Starts the search by preparing a search cursor we can use to forward the
      * search.
      */
    startSearch () {
      // Create a new search cursor
      this.currentLocalSearch = this.query
      const cursor = this.editor.codeMirror.getCursor()
      let regex = makeSearchRegEx(this.currentLocalSearch)
      this.searchCursor = this.editor.codeMirror.getSearchCursor(regex, cursor)

      // Find all matches
      let tRE = makeSearchRegEx(this.currentLocalSearch, 'gi')
      let res = []
      let match = null
      for (let i = 0; i < this.editor.codeMirror.lineCount(); i++) {
        let l = this.editor.codeMirror.getLine(i)
        tRE.lastIndex = 0
        while ((match = tRE.exec(l)) != null) {
          res.push({
            'from': { 'line': i, 'ch': match.index },
            'to': { 'line': i, 'ch': match.index + this.currentLocalSearch.length }
          })
        }
      }

      // Mark these in document and on the scroll bar
      this.mark(res)

      return this
    },

    /**
      * Stops the search by destroying the search cursor
      * @return {ZettlrEditor}   This for chainability.
      */
    stopSearch () {
      this.searchCursor = null
      this.unmarkResults()

      return this
    },

    // MARK FUNCTIONS ALSO STOLEN FROM ZETTLREDITOR

    /**
      * Why do you have a second _mark-function, when there is markResults?
      * Because the local search also generates search results that have to be
      * marked without retrieving anything from the ZettlrPreview.
      * @param  {Array} res An Array containing all positions to be rendered.
      */
    mark (res) {
      this.unmarkResults() // Clear potential previous marks

      let sbannotate = []
      for (let result of res) {
        if (!result.from || !result.to) {
          // One of these was undefined. And somehow this if-clause has made
          // searching approximately three times faster. Crazy.
          continue
        }
        sbannotate.push({ 'from': result.from, 'to': result.to })
        this.editor.codeMirror.markText(
          result.from, result.to,
          { className: 'search-result' }
        )
      }

      this.scrollbarAnnotations.update(sbannotate)
    },

    /**
      * Removes all marked search results
      */
    unmarkResults () {
      // Simply remove all markers
      for (let mark of this.editor.codeMirror.getAllMarks()) {
        mark.clear()
      }

      this.scrollbarAnnotations.update([])
    }
  }
}
</script>

<style lang="less">
// Editor Geometry

// Editor margins left and right for all breakpoints in both fullscreen and
// normal mode.
@editor-margin-fullscreen-sm:   50px;
@editor-margin-fullscreen-md:  100px;
@editor-margin-fullscreen-lg:  150px;
@editor-margin-fullscreen-xl:  200px;
@editor-margin-fullscreen-xxl: 350px;

@editor-margin-normal-sm:  20px;
@editor-margin-normal-md:  50px;
@editor-margin-normal-lg: 100px;

#editor {
  width: 100%;
  height: 97%;
  overflow-x: hidden;
  overflow-y: auto;

  &.fullscreen {
    left: 0%; padding-left: 0px;

    // Hide the tabs in distraction-free
    #document-tabs { display: none; }
  }

    .CodeMirror {
      // The CodeMirror editor needs to respect the new tabbar; it cannot take
      // up 100 % all for itself anymore.
      margin-left: 0.5em;
      height: 100%;
      cursor: text;
      font-family: inherit;

      @media(min-width: 1025px) { margin-left: @editor-margin-normal-lg; }
      @media(max-width: 1024px) { margin-left: @editor-margin-normal-md; }
      @media(max-width:  900px) { margin-left: @editor-margin-normal-sm; }
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

    // Reduce font size of math a bit
    .katex { font-size: 1.1em; }
  }

body.darwin #editor {
  // On macOS the tabbar is 30px high.
  height: calc(100% - 30px);
}

// CodeMirror fullscreen
.CodeMirror-fullscreen {
  position: fixed !important; // Have to override another relative
  margin-top: 0px !important; // Normally 25px for tab bar, but not in distraction free
  left: 0;
  right: 0;
  bottom: 0;
  height: auto;
  z-index: 500;

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

// Define the readability classes
.cm-readability-0   { background-color: hsv(100, 70%, 95%); color: #444444 !important; }
.cm-readability-1   { background-color: hsv( 90, 70%, 95%); color: #444444 !important; }
.cm-readability-2   { background-color: hsv( 80, 70%, 95%); color: #444444 !important; }
.cm-readability-3   { background-color: hsv( 70, 70%, 95%); color: #444444 !important; }
.cm-readability-4   { background-color: hsv( 60, 70%, 95%); color: #444444 !important; }
.cm-readability-5   { background-color: hsv( 50, 70%, 95%); color: #444444 !important; }
.cm-readability-6   { background-color: hsv( 40, 70%, 95%); color: #444444 !important; }
.cm-readability-7   { background-color: hsv( 30, 70%, 95%); color: #444444 !important; }
.cm-readability-8   { background-color: hsv( 10, 70%, 95%); color: #444444 !important; }
.cm-readability-9   { background-color: hsv(  0, 70%, 95%); color: #444444 !important; }
.cm-readability-10  { background-color: hsv(350, 70%, 95%); color: #444444 !important; }
</style>
