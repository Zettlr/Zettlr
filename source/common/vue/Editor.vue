<template>
  <div id="editor" ref="editor" v-bind:style="{ 'font-size': `${fontSize}px` }">
    <div v-if="showSearch" id="editor-search">
      <div class="row">
        <input
          ref="search-input"
          v-model="query"
          type="text"
          placeholder="Find"
          v-bind:class="{'monospace': regexpSearch }"
          v-on:keypress.enter="searchNext()"
        >
        <button
          v-bind:class="{ 'active': regexpSearch }"
          v-on:click="toggleQueryRegexp()"
        >
          <clr-icon shape="regexp"></clr-icon>
        </button>
        <button v-on:click="showSearch = false">
          <clr-icon shape="times"></clr-icon>
        </button>
      </div>
      <div class="row">
        <input
          v-model="replaceString"
          type="text"
          placeholder="Replace"
          v-bind:class="{'monospace': regexpSearch }"
          v-on:keypress.enter.exact="replaceNext()"
          v-on:keypress.alt.enter.exact="replaceAll()"
        >
        <button v-on:click="replaceNext()">
          <clr-icon shape="two-way-arrows"></clr-icon>
        </button>
        <button v-on:click="replaceAll()">
          <clr-icon shape="step-forward-2"></clr-icon>
        </button>
      </div>
    </div>
    <textarea id="cm-text" ref="textarea" style="display:none;"></textarea>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import countWords from '../util/count-words'
import makeSearchRegEx from '../util/make-search-regex'
import MarkdownEditor from '../modules/markdown-editor'
import CodeMirror from 'codemirror'
import { util as citrUtil, parseSingle } from '@zettlr/citr'
import objectToArray from '../util/object-to-array'

export default {
  name: 'Editor',
  components: {
  },
  props: {
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
      // Should we perform a regexp search?
      regexpSearch: false,
      showSearch: false, // Set to true to show the search box
      searchCursor: null,
      currentLocalSearch: '',
      lastSearchResult: false, // Holds the last search result
      query: '', // Models the search value
      replaceString: '', // Models the replace string
      findTimeout: undefined, // Holds a timeout so that not every single keypress results in a searchNext
      // END: Search options
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
          },
          replacements: this.$store.state.config['editor.autoCorrect.replacements']
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

      console.time('File allocation')

      for (const item of tree) {
        if (item.type === 'directory') {
          const contents = objectToArray(item, 'children').filter(descriptor => descriptor.type === 'file')
          files.push(...contents)
        } else if (item.type === 'file') {
          files.push(item)
        }
      }

      console.timeEnd('File allocation')

      return files
    }
  },
  watch: {
    cslItems: function () {
      // We have received new items, so we should update them in the editor.
      const items = this.cslItems.map(item => {
        // Get a rudimentary author list
        let authors = ''
        if (item.author !== undefined) {
          authors = item.author.map(author => {
            if (author.family !== undefined) {
              return author.family
            } else if (author.literal !== undefined) {
              return author.literal
            } else {
              return undefined
            }
          }).filter(elem => elem !== undefined).join(', ')
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
      this.editor.setCompletionDatabase('citekeys', items)
    },
    readabilityMode: function () {
      this.editor.readabilityMode = this.readabilityMode
    },
    editorConfiguration: function () {
      // Update the editor configuration, if anything changes.
      this.editor.setOptions(this.editorConfiguration)
    },
    tagDatabase: function () {
      this.editor.setCompletionDatabase('tags', this.tagDatabase)
    },
    fsalFiles: function () {
      const fileDatabase = {}

      console.time('Database allocation')
      for (let file of this.fsalFiles) {
        let fname = file.name.substr(0, file.name.lastIndexOf('.'))
        let displayText = fname // Fallback: Only filename
        if ('frontmatter' in file && file.frontmatter !== null && file.frontmatter.title !== undefined) {
          // (Else) if there is a frontmatter, use that title
          displayText = file.frontmatter.title
        } else if (Boolean(this.$store.state.config['display.useFirstHeadings']) && file.firstHeading != null) {
          // The user wants to use first headings as fallbacks
          displayText = file.firstHeading
        }

        if (file.id !== '') {
          displayText = `${file.id}: ${displayText}`
        }

        fileDatabase[fname] = {
          // Use the ID, if given, or the filename
          'text': (file.id !== '') ? file.id : fname,
          'displayText': displayText,
          'id': file.id
        }
      }
      console.timeEnd('Database allocation')

      this.editor.setCompletionDatabase('files', fileDatabase)
    },
    activeFile: function () {
      console.log('Active file changed')
      if (this.editor === null) {
        console.error('Received a file update but the editor was not yet initiated!')
        return
      }

      if (this.activeFile === null) {
        this.editor.swapDoc(CodeMirror.Doc('', 'multiplex'), 'multiplex')
        this.editor.readOnly = true
        this.$store.commit('updateTableOfContents', this.editor.tableOfContents)
        // Update the citation keys with an empty array
        this.updateCitationKeys()
        return
      }

      const doc = this.openDocuments.find(doc => doc.path === this.activeFile.path)

      if (doc !== undefined) {
        // Simply swap it
        this.editor.setOptions({
          zettlr: { markdownImageBasePath: this.activeFile.dir }
        })
        this.editor.swapDoc(doc.cmDoc, doc.mode)
        this.activeDocument = doc
        this.editor.readOnly = false
        this.$store.commit('updateTableOfContents', this.editor.tableOfContents)
        this.$store.commit('activeDocumentInfo', this.editor.documentInfo)
        // Update the citation keys
        this.updateCitationKeys()
      } else if (this.currentlyFetchingFiles.includes(this.activeFile.path) === false) {
        // We have to request the document beforehand
        this.currentlyFetchingFiles.push(this.activeFile.path)
        ipcRenderer.invoke('application', { command: 'get-file-contents', payload: this.activeFile.path })
          .then((descriptorWithContent) => {
            const mode = (this.activeFile.ext === '.tex') ? 'stex' : 'multiplex'
            const newDoc = {
              path: descriptorWithContent.path,
              mode: mode, // Save the mode for later swaps
              cmDoc: CodeMirror.Doc(descriptorWithContent.content, mode),
              modified: false,
              lastWordCount: countWords(descriptorWithContent.content, false) // TODO: re-enable countChars
            }

            // Listen to change events on the doc, because if the user pastes
            // more than ten words at once, we need to substract it to not
            // mess with the word count.
            newDoc.cmDoc.on('change', (doc, changeObj) => {
              if (changeObj.origin !== 'paste') {
                return
              }

              const newTextWords = countWords(changeObj.text.join(' '), false) // TODO: re-enable countChars
              if (newTextWords > 10) {
                newDoc.lastWordCount = countWords(newDoc.cmDoc.getValue(), false) // TODO: re-enable countChars
              }
            })
            this.openDocuments.push(newDoc)
            const idx = this.currentlyFetchingFiles.findIndex(e => e === descriptorWithContent.path)
            this.currentlyFetchingFiles.splice(idx, 1)
            // Let's check whether the active file has in the meantime changed
            // If it has, don't overwrite the current one
            if (this.activeFile.path === descriptorWithContent.path) {
              this.editor.setOptions({
                zettlr: { markdownImageBasePath: this.activeFile.dir }
              })
              this.editor.swapDoc(newDoc.cmDoc, newDoc.mode)
              this.activeDocument = newDoc
              this.editor.readOnly = false
              this.$store.commit('updateTableOfContents', this.editor.tableOfContents)
              this.$store.commit('activeDocumentInfo', this.editor.documentInfo)
              this.updateCitationKeys()
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
      // Make sure to switch the regexp search depending on the search input
      const isRegexp = /^\/.+\/[gimy]{0,4}$/.test(this.query)
      if (isRegexp && this.regexpSearch === false) {
        this.regexpSearch = true
      } else if (!isRegexp && this.regexpSearch === true) {
        this.regexpSearch = false
      }

      // Begin a search
      if (this.findTimeout !== undefined) {
        clearTimeout(this.findTimeout)
      }

      if (this.regexpSearch === true) {
        // Don't automatically start a search b/c certain expressions will crash
        // the process (such as searching for /.*/ in a large document)
        return
      }

      this.findTimeout = setTimeout(() => {
        this.searchNext()
      }, 1000)
    },
    showSearch: function (newValue, oldValue) {
      if (newValue === true && oldValue === false) {
        // The user activated search, so focus the input and run a search (if
        // the query wasnt' empty)
        this.$nextTick(() => {
          this.$refs['search-input'].focus()
          this.searchNext()
        })
      } else if (newValue === false && oldValue === true) {
        // Unmark all search results
        this.unmarkResults()
      }
    }
  },
  mounted: function () {
    // As soon as the component is mounted, initiate the editor
    this.editor = new MarkdownEditor(this.$refs.textarea, this.editorConfiguration)

    // Update the document info on corresponding events
    this.editor.on('change', (changeObj) => {
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

    this.editor.on('zettelkasten-link', (linkContents) => {
      ipcRenderer.invoke('application', {
        command: 'force-open',
        payload: linkContents
      })
        .catch(err => console.error(err))
    })
    this.editor.on('zettelkasten-tag', (tag) => {
      this.$root.$emit('start-global-search', tag)
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
      } else if (shortcut === 'toggle-typewriter-mode') {
        this.editor.hasTypewriterMode = this.editor.hasTypewriterMode === false
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
      const doc = this.openDocuments.find(item => item.path === fileDescriptor.path)

      if (doc !== undefined) {
        const cur = Object.assign({}, doc.cmDoc.getCursor())
        doc.cmDoc.setValue(fileDescriptor.content)
        this.$nextTick(() => {
          // Wait a little bit for the unwanted modification-events to emit and
          // then immediately revert that status again.
          doc.cmDoc.markClean()
          doc.cmDoc.setCursor(cur)
          this.$store.commit('announceModifiedFile', {
            filePath: doc.path,
            isClean: doc.cmDoc.isClean()
          })
        })
      }
    })

    // Other elements can emit a toc-line event on $root to request a jump to
    // a specific line.
    this.$root.$on('toc-line', (line) => {
      this.editor.jtl(line)
    })
  },
  methods: {
    jtl (lineNumber) {
      if (this.editor !== null) {
        this.editor.jtl(lineNumber)
      }
    },
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

      ipcRenderer.invoke('application', {
        command: 'file-save',
        payload: descriptor
      })
        .then((result) => {
          if (result !== true) {
            console.error('Retrieved a falsy result from main, indicating an error with saving the file.')
            return
          }

          // Everything worked out, so clean up
          this.activeDocument.cmDoc.markClean()
          this.$store.commit('announceModifiedFile', {
            filePath: this.activeDocument.path,
            isClean: this.activeDocument.cmDoc.isClean()
          })

          // Also, extract all cited keys
          this.updateCitationKeys()
        })
        .catch((err) => { console.error(err) })
    },
    updateCitationKeys: function () {
      const value = this.editor.value

      const citations = citrUtil.extractCitations(value)
      const keys = []
      for (const citation of citations) {
        const cslArray = parseSingle(citation)

        for (const csl of cslArray) {
          keys.push(csl.id)
        }
      }
      this.$store.commit('updateCitationKeys', keys)
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
    executeCommand (cmd) {
      // Executes a markdown command on the editor instance
      this.editor.runCommand(cmd)
      this.editor.focus()
    },
    searchNext () {
      if (this.query.trim() === '') {
        // Stop search if the field is empty
        this.stopSearch()
        return
      }

      let currentTerm = this.query.trim()
      const isRegexp = /^\/.+\/[gimy]{0,4}$/.test(currentTerm)
      if (this.regexpSearch === true && !isRegexp) {
        // Make sure it looks like a regular expression
        currentTerm = `/${currentTerm}/`
      }

      if (this.searchCursor === null || this.currentLocalSearch !== currentTerm) {
        // (Re)start search in case there was none or the term has changed
        this.startSearch()
      } else if (this.searchCursor !== null) {
        this.lastSearchResult = this.searchCursor.findNext()
        if (this.lastSearchResult !== false) {
          // Another match
          this.editor.codeMirror.setSelection(this.searchCursor.from(), this.searchCursor.to())
        } else {
          // Start from beginning
          const regex = makeSearchRegEx(this.currentLocalSearch)
          this.searchCursor = this.editor.codeMirror.getSearchCursor(regex, { 'line': 0, 'ch': 0 })
          this.searchNext()
        }
      }
    },
    replaceNext () {
      if (this.searchCursor === null) {
        return
      }

      // First we need to check whether or not there have been capturing groups
      // within the search result. If so, replace each variable with one of the
      // matched groups from the last found search result. Do this globally for
      // multiple occurrences.
      let replacement = this.replaceString
      for (let i = 1; i < this.lastSearchResult.length; i++) {
        replacement = replacement.replace(new RegExp('\\$' + i, 'g'), this.lastSearchResult[i])
      }

      this.searchCursor.replace(replacement)
      return this.searchNext()
    },
    replaceAll () {
      let searchWhat = this.query.trim()
      let replaceWhat = this.replaceString
      // First select all matches
      let ranges = []
      let replacements = []
      let res
      const regex = makeSearchRegEx(searchWhat)
      let cur = this.editor.codeMirror.getSearchCursor(regex, { 'line': 0, 'ch': 0 })
      while ((res = cur.findNext()) !== false) {
        // First push the match to the ranges to be replaced
        ranges.push({ 'anchor': cur.from(), 'head': cur.to() })
        // Also make sure to replace variables in the replaceWhat, if applicable
        if (res.length < 2) {
          replacements.push(replaceWhat)
        } else {
          let repl = replaceWhat
          for (let i = 1; i < res.length; i++) {
            repl = repl.replace(new RegExp('\\$' + i, 'g'), res[i])
          }
          replacements.push(repl)
        }
      }

      // Aaaand do it
      this.editor.codeMirror.setSelections(ranges, 0)
      this.editor.codeMirror.replaceSelections(replacements)

      this.unmarkResults() // Nothing to show afterwards.
    },

    /**
      * Starts the search by preparing a search cursor we can use to forward the
      * search.
      */
    startSearch () {
      // Create a new search cursor
      this.currentLocalSearch = this.query.trim()
      const cursor = this.editor.codeMirror.getCursor()
      const regex = makeSearchRegEx(this.currentLocalSearch)
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
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;

  .katex {
    // display: inline-block;
    // width: 100%;
    // text-align: center;
  }

  div#editor-search {
    position: absolute;
    width: 300px;
    right: 0;
    z-index: 7; // One less and the scrollbar will on top of the input field
    padding: 5px 10px;

    div.row { display: flex; }

    input {
      flex: 3;
      &.monospace { font-family: monospace; }
    }

    button {
      flex: 1;
      max-width: 24px;
    }
  }

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

  div#editor-search {
    background-color: rgba(230, 230, 230, 1);
    border-bottom-left-radius: 6px;
    padding: 6px;

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
