/* global $ */
/**
* @ignore
* BEGIN HEADER
*
* Contains:        GettlrEditor class
* CVM-Role:        View
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This class controls and initializes the CodeMirror editor.
*
* END HEADER
*/

const path = require('path')
const popup = require('./gettlr-popup.js')
const showdown = require('showdown')
const Turndown = require('joplin-turndown')
const turndownGfm = require('joplin-turndown-plugin-gfm')
// const tippy = require('tippy.js/dist/tippy-bundle.cjs.js').default
const { clipboard } = require('electron')
const hash = require('../common/util/hash')
const countWords = require('../common/util/count-words')
const flattenDirectoryTree = require('../common/util/flatten-directory-tree')
const { trans } = require('../common/lang/i18n.js')
const generateKeymap = require('./assets/codemirror/generate-keymap.js')
const EditorSearch = require('./util/editor-search')
const openMarkdownLink = require('./util/open-markdown-link')

// The autoloader requires all necessary CodeMirror addons and modes that are
// used by the main class. It simply folds about 70 lines of code into an extra
// file.
require('./assets/codemirror/autoload.js')

// Finally load CodeMirror itself
const CodeMirror = require('codemirror')

// The timeout after which a "save"-command is triggered to automatically save changes
const SAVE_TIMOUT = require('../common/data.json').poll_time
const AUTOCLOSEBRACKETS = {
  pairs: '()[]{}\'\'""__``', // Autoclose markdown specific stuff
  override: true
}

const IMAGE_REGEX = /(jpg|jpeg|png|gif|svg|tiff|tif)$/i

const MD_MODE = { name: 'multiplex' }
const TEX_MODE = { name: 'stex' }

/**
* This class propably has the most `require`s in it, because it loads all
* functionality concerning the CodeMirror editor. It loads them, initializes
* the editor and then does stuff related to the editor. This class, together with
* the GettlrDialog class is of somewhat problematic appearance because here two
* styles of programming clash: My own and the one of CodeMirror. As I have to
* hook into their API for interacting with CodeMirror you will see unusual
* functions.
*/
class GettlrEditor {
  /**
    * Instantiate the editor
    * @param {GettlrRenderer} parent The parent renderer element.
    */
  constructor (parent) {
    this._renderer = parent
    this._div = $('#editor')
    this._positions = [] // Saves the positions of the editor
    this._currentHash = null // Needed for positions

    this._words = 0 // Currently written words
    this._fontsize = 100 // Font size (used for zooming)
    this._timeout = null // Stores a current timeout for a save-command

    this._searcher = new EditorSearch(null)

    // The starting position for a tag autocomplete.
    this._autoCompleteStart = null
    this._tagDB = [] // Holds all available tags for autocomplete
    this._citeprocIDs = [] // Holds all available IDs for autocomplete
    this._currentDatabase = null // Points either to the tagDB or the ID database

    // What elements should be rendered?
    this._renderCitations = false
    this._renderIframes = false
    this._renderImages = false
    this._renderLinks = false
    this._renderMath = false
    this._renderTasks = false
    this._renderHTags = false
    this._wysiwyg = false // TODO TESTING
    this._renderTables = false

    // Remembers the last mode when entering readability
    this._lastMode = MD_MODE // Default mode

    this._countChars = false // Whether or not Gettlr should count characters as words (e.g., for Chinese)

    // This Markdown to HTML converter is used in various parts of the
    // class to perform converting operations.
    this._showdown = new showdown.Converter()
    this._showdown.setFlavor('github')
    this._showdown.setOption('strikethrough', true)
    this._showdown.setOption('tables', true)
    this._showdown.setOption('omitExtraWLInCodeBlocks', true)
    this._showdown.setOption('tasklists', true)
    this._showdown.setOption('requireSpaceBeforeHeadingText', true)

    // HTML to Markdown conversion is better done with Turndown.
    this._turndown = new Turndown({
      headingStyle: 'atx',
      hr: '---'
    })
    this._turndown.use(turndownGfm.gfm)

    // The last array of IDs as fetched from the document
    this._lastKnownCitationCluster = []

    // All individual citations fetched during this session.
    this._citationBuffer = Object.create(null)

    // Should the editor mute lines while in distraction-free mode?
    this._mute = true
    // Caches the "left" style property during distraction free
    this._leftBeforeDistractionFree = ''

    this._cm = CodeMirror.fromTextArea(document.getElementById('cm-text'), {
      mode: MD_MODE,
      theme: 'Gettlr', // We don't actually use the cm-s-Gettlr class, but this way we prevent the default theme from overriding.
      autofocus: false,
      autoCorrect: false, // Default to false to keep this thing clean
      foldGutter: true,
      cursorScrollMargin: 60, // Keep the cursor 60px below/above editor edges
      cursorBlinkRate: 0, // Disable cursor blinking (we'll do this with a @keyframes animation)
      gutters: ['CodeMirror-foldgutter'],
      foldOptions: {
        'widget': '\u00A0\u2026\u00A0' // nbsp ellipse nbsp
      },
      placeholder: ' ', // Just an invisible space.
      hintOptions: {
        completeSingle: false, // Don't auto-complete, even if there's only one word available
        hint: (cm, opt) => {
          let term = cm.getRange(this._autoCompleteStart, cm.getCursor()).toLowerCase()
          let completionObject = {
            'list': Object.keys(this._currentDatabase).filter((key) => {
              // First search the ID. Second, search the displayText, if available.
              // Third: return false if nothing else has matched.
              if (this._currentDatabase[key].text.toLowerCase().indexOf(term) === 0) return true
              if (this._currentDatabase[key].hasOwnProperty('displayText') && this._currentDatabase[key].displayText.toLowerCase().indexOf(term) >= 0) return true
              return false
            })
              .map(key => this._currentDatabase[key]),
            'from': this._autoCompleteStart,
            'to': cm.getCursor()
          }
          // Set the autocomplete to false as soon as the user has actively selected something.
          CodeMirror.on(completionObject, 'pick', (completion) => {
            // In case the user wants to link a file, intercept during
            // the process and add the file link according to the user's
            // preference settings.
            if (this._currentDatabase !== this._tagDB &&
              this._currentDatabase !== this._citeprocIDs &&
              completion.displayText) {
              // Get the correct setting
              let linkPref = global.config.get('zkn.linkWithFilename')
              // Prepare the text to insert, removing the ID if found in the filename
              let text = completion.displayText
              if (completion.id && text.indexOf(completion.id) >= 0) {
                text = text.replace(completion.id, '').trim()
              }
              // In case the whole filename consists of the ID, well.
              // Then, have your ID duplicated.
              if (text.length === 0) text = completion.displayText
              let cur = JSON.parse(JSON.stringify(cm.getCursor()))
              // Check if the linkEnd has been already inserted
              let line = cm.getLine(cur.line)
              let end = this._cm.getOption('zkn').linkEnd || ''
              let prefix = ' '
              let linkEndMissing = false
              if (end !== '' && line.substr(cur.ch, end.length) !== end) {
                // Add the linkend
                prefix = end + prefix
                linkEndMissing = true
              } else {
                // Advance the cursor so that it is outside of the link again
                cur.ch += end.length
                cm.setCursor(cur)
              }
              if (linkPref === 'always' || (linkPref === 'withID' && completion.id)) {
                // We need to add the text after the link.
                cm.replaceSelection(prefix + text)
              } else if (linkEndMissing) {
                cm.replaceSelection(end) // Add the link ending
              }
            }
            this._autoCompleteStart = null
            this._currentDatabase = null // Reset the database used for the hints.
          })
          return completionObject
        }
      },
      lineWrapping: true,
      indentUnit: 4, // Indent lists etc. by 4, not 2 spaces (necessary, e.g., for pandoc)
      // inputStyle: "contenteditable", // Will enable this in a future version
      autoCloseBrackets: AUTOCLOSEBRACKETS,
      markdownImageBasePath: '', // The base path used to render the image in case of relative URLs
      markdownBoldFormatting: '**', // The characters used for bold
      markdownItalicFormatting: '_', // The characters used for italic
      markdownOnLinkOpen: (url) => { return openMarkdownLink(url, this) }, // Action for ALT-Clicks
      zkn: {
        idRE: '(\\d{14})', // What do the IDs look like?
        linkStart: '[[', // Start of links?
        linkEnd: ']]' // End of links?
      },
      continuelistModes: [ 'markdown', 'markdown-zkn' ],
      extraKeys: generateKeymap(this)
    })

    this._searcher.setInstance(this._cm)

    /**
     * Listen to the beforeChange event to modify pasted image paths into real
     * markdown images.
     * @type {function}
     */
    this._cm.on('beforeChange', (cm, changeObj) => {
      // Tap into pasting
      if (changeObj.origin === 'paste') {
        // First check if there's an image in the clipboard. In this case we
        // need to cancel the paste event and handle the image ourselves.
        let image = clipboard.readImage()
        let html = clipboard.readHTML()
        let plain = clipboard.readText()
        let explicitPaste = plain === changeObj.text.join('\n')

        if (!image.isEmpty() && (explicitPaste || !changeObj.text)) {
          // We've got an image. So we need to handle it.
          this._renderer.handleEvent('paste-image')
          return changeObj.cancel() // Cancel handling of the event
        }

        // Next possibility: There's HTML formatted text in the clipboard. In
        // this case we'll be sneaky and simply exchange the plain text with
        // the Markdown formatted version. We need an additional check to make
        // sure the HTML version is indeed different than the plain text
        // version, as some apps may write the same plain text stuff into the
        // HTML part of the clipboard, in which case dragging it through the
        // converter will result in unwanted behaviour (including Electron).
        // We have the problem that CodeMirror treats moving text around and
        // dropping links exactly the same as explicitly hitting Cmd/Ctrl+V.
        // The only way we can be sure is to make sure the changeObject is the
        // same as the plain text from the clipboard. ONLY in this instance
        // is it a regular, explicit paste. Else the text in the changeObject
        // takes precedence.
        if (html && html.length > 0 && (!plain || html !== plain) && explicitPaste) {
          // We've got HTML, so let's fire up Turndown.
          plain = this._turndown.turndown(html)
          // Let's update the (very likely plain) HTML text with some Markdown
          // that retains the formatting. PLEASE NOTE that we have to split the
          // resulting string as the update method expects an Array of lines,
          // not a complete string with line breaks.
          return changeObj.update(changeObj.from, changeObj.to, plain.split('\n'))
        }
      }
    })

    this._cm.on('change', (cm, changeObj) => {
      let cur = cm.getCursor()
      let newText = changeObj.text
      let linkStart = cm.getOption('zkn').linkStart
      let textUntilCursor = cm.getLine(cur.line).substr(cur.ch - linkStart.length, linkStart.length)
      // Show tag autocompletion window, if applicable (or close it)
      if (newText[0] === '#') {
        let cur = cm.getCursor()
        // Make sure the # is either at the beginning
        // of the line or is preceded by a space.
        if (cur.ch === 1 || cm.getLine(cur.line).charAt(cur.ch - 2) === ' ') {
          // Tag autocompletion
          this._autoCompleteStart = JSON.parse(JSON.stringify(cm.getCursor()))
          this._currentDatabase = this._tagDB
          this._cm.showHint()
        }
      } else if (newText[0] === '@') {
        // citeproc-ID autocompletion
        this._autoCompleteStart = JSON.parse(JSON.stringify(cm.getCursor()))
        this._currentDatabase = this._citeprocIDs
        this._cm.showHint()
      } else if (textUntilCursor === linkStart && this._renderer.getCurrentDir() != null) {
        // File name autocompletion
        this._autoCompleteStart = JSON.parse(JSON.stringify(cur))
        // Build the database in the correct format
        let db = {}
        let dir = this._renderer.getCurrentDir()

        // Navigate to the root to include as many files as possible
        while (dir.parent) dir = dir.parent

        // Okay, cool, now we have to replace dir with
        // a dir coming from findObject(). Why? Because
        // out of unknown reasons, traversing the directory
        // UP using the parent-property, removes the children
        // property of said parent. But when traversing DOWN
        // from the root level of the directories, the
        // children array is maintained. Just in case you're
        // wondering, comment out the following section and
        // run it (by bringing up the corresponding file link
        // hint). All three roots will be the same, but the
        // first one will have zero children, while the others
        // will have the correct amount. Therefore, only the
        // third operating statement will return true.

        // let foundRoot = dir
        // let pathsRoot = renderer._paths[11] (correct index for you, obvsly)
        // let hashRoot = renderer.findObject(foundRoot.hash)
        // console.log('Root via traversal: ', foundRoot.name, foundRoot.hash)
        // console.log('Root via _paths:', pathsRoot.name, pathsRoot.hash)
        // console.log('Root via findObject(): ', hashRoot.name, hashRoot.hash)
        // console.log('Num children (traversal)', foundRoot.children.length)
        // console.log('Num children (_paths)', pathsRoot.children.length)
        // console.log('Num children (findObject)', hashRoot.children.length)
        // console.log('Dir same as paths root?', foundRoot === pathsRoot)
        // console.log('Root same as found object?', foundRoot === hashRoot)
        // console.log('Paths same as found?', pathsRoot === hashRoot)

        // JavaScript never stops to amaze me.
        dir = this._renderer.findObject(dir.hash)

        let tree = flattenDirectoryTree(dir).filter(elem => elem.type === 'file')

        for (let file of tree) {
          let fname = path.basename(file.name, path.extname(file.name))
          let displayText = fname // Always display the filename
          if (file.frontmatter.title) displayText += ' ' + file.frontmatter.title
          db[fname] = {
            'text': file.id || fname, // Use the ID, if given, or the filename
            'displayText': displayText,
            'id': file.id || false
          }
        }
        this._currentDatabase = db
        this._cm.showHint()
      }

      if (changeObj.origin === 'paste' && newText.join(' ').split(' ').length > 10) {
        // In case the user pasted more than ten words don't let these count towards
        // the word counter. Simply update the word count before the save function
        // is triggered. This way none of the just pasted words will count.
        this.getWrittenWords()
      }

      if (changeObj.origin !== 'setValue') {
        // If origin is setValue this means that the contents have been
        // programatically changed -> no need to flag any modification!
        // Clear the timeouts in any case
        if (this._timeout) clearTimeout(this._timeout)
        if (this._citationTimeout) clearTimeout(this._citationTimeout)

        // Check if the change actually modified the
        // doc or not
        if (this.isClean()) {
          this._renderer.clearModified()
        } else {
          this._renderer.setModified()
          // Set the autosave timeout
          this._timeout = setTimeout((e) => {
            this._renderer.saveFile()
            this.updateCitations()
          }, SAVE_TIMOUT)
        }

        // Always run an update-citations command each time there have been changes
        this._citationTimeout = setTimeout((e) => {
          this.updateCitations()
        }, 500)
      }
    })

    // On cursor activity (not the mouse one but the text one), render all
    // things we should replace in the sense of render directly in the text
    // such as images, links, other stuff.
    this._cm.on('cursorActivity', (cm) => {
      // This event fires on either editor changes (because, obviously the
      // cursor changes its position as well then) or when the cursor moves.
      if (this._renderImages) this._cm.execCommand('markdownRenderImages') // Render images
      this._cm.execCommand('markdownRenderMermaid') // Render mermaid codeblocks
      if (this._renderIframes) this._cm.execCommand('markdownRenderIframes') // Render iFrames
      if (this._renderMath) this._cm.execCommand('markdownRenderMath') // Render equations
      if (this._renderLinks) this._cm.execCommand('markdownRenderLinks') // Render links
      if (this._renderCitations) this._cm.execCommand('markdownRenderCitations') // Render citations
      if (this._renderTables) this._cm.execCommand('markdownRenderTables') // Render tables
      if (this._renderTasks) this._cm.execCommand('markdownRenderTasks') // Render tasks
      if (this._renderHTags) this._cm.execCommand('markdownRenderHTags') // Render heading levels
      if (this._wysiwyg) this._cm.execCommand('markdownWYSIWYG') // Render all other elements
      this._cm.execCommand('markdownHeaderClasses') // Apply heading line classes
      if (this._cm.getOption('fullScreen') && this._mute) {
        this._muteLines()
      }

      // Additionally, render all citations that may have been newly added to
      // the DOM by CodeMirror.
      this.renderCitations()

      // Update fileInfo
      this._renderer.updateFileInfo(this.getFileInfo())
    })

    // We need to update citations also on updates, as this is the moment when
    // new spans get added to the DOM which we might have to render.
    this._cm.on('update', (cm) => {
      this.renderCitations()
      // Must be called to ensure all tables have active event listeners.
      if (this._renderTables) this._cm.execCommand('markdownInitiateTables')
    })

    this._cm.on('drop', (cm, event) => {
      if (event.dataTransfer.files.length > 0) {
        // In case of files being dropped, do *not* let CodeMirror handle them.
        event.codemirrorIgnore = true
        let imagesToInsert = []
        for (let x of event.dataTransfer.files) {
          if (IMAGE_REGEX.test(x.path)) {
            imagesToInsert.push(x.path)
          }
        }
        if (imagesToInsert.length > 0) {
          let where = this._cm.coordsChar({ 'left': event.clientX, 'top': event.clientY })
          // Don't let Gettlr handle this because opening something Additionally
          // to images would be weird.
          event.stopPropagation()
          event.preventDefault()

          // Add all images.
          this._cm.setCursor(where)
          let str = '\n'
          for (let p of imagesToInsert) {
            str += `![${p.substr(p.lastIndexOf('/') + 1)}](${p})\n`
          }
          this._cm.replaceSelection(str)
        }
      }
    })

    // Thanks for this to https://discuss.codemirror.net/t/hanging-indent/243/2
    this._cm.on('renderLine', (cm, line, elt) => {
      let charWidth = cm.defaultCharWidth() - 2
      let basePadding = 4
      // Show continued list/qoute lines aligned to start of text rather
      // than first non-space char.  MINOR BUG: also does this inside
      // literal blocks.
      let leadingSpaceListBulletsQuotes = /^\s*([*+-]\s+|\d+\.\s+|>\s*)+/ // NOTE: Replaced the last * with +
      let leading = (leadingSpaceListBulletsQuotes.exec(line.text) || [''])[0]
      let off = CodeMirror.countColumn(leading, leading.length, cm.getOption('tabSize')) * charWidth

      elt.style.textIndent = '-' + off + 'px'
      elt.style.paddingLeft = (basePadding + off) + 'px'
    })

    // Display a footnote if the target is a link (and begins with ^)
    this._cm.getWrapperElement().addEventListener('mousemove', (e) => {
      let t = $(e.target)
      if (t.hasClass('cm-link') && t.text().indexOf('^') === 0) {
        this._fntooltip(t)
      }
    })

    this._cm.getWrapperElement().addEventListener('click', (e) => {
      // Open links on both Alt and Ctrl clicks - otherwise stop handling event
      if (!(e.altKey || e.ctrlKey)) return true

      e.preventDefault()

      let elem = $(e.target)
      if (elem.hasClass('cm-zkn-tag')) {
        // The user clicked a zkn link -> create a search
        this._renderer.autoSearch(elem.text())
      } else if (elem.hasClass('cm-zkn-link')) {
        this._renderer.autoSearch(elem.text(), true)
      } else if (elem.hasClass('cm-link') && elem.text().indexOf('^') === 0) {
        // We've got a footnote
        this._editFootnote(elem)
      }
    })

    this._cm.getWrapperElement().addEventListener('paste', (e) => {
      let image = clipboard.readImage()
      // Trigger the insertion process from here only if there is no text in the
      // clipboard (because then CodeMirror will not do anything). If there is
      // text in the clipboard, do not try to trigger the process from here
      // because this way two dialogs would be opened -- first from the
      // beforeChange handler of CodeMirror, and, after the event has bubbled
      // to the wrapper, from here.
      if (!image.isEmpty() && clipboard.readText().length === 0) {
        // We've got an image. So we need to handle it.
        this._renderer.handleEvent('paste-image')
      }
    })

    this._cm.refresh()

    // Finally create the annotateScrollbar object to be able to annotate the scrollbar with search results.
    this._scrollbarAnnotations = this._cm.annotateScrollbar('sb-annotation')
    this._scrollbarAnnotations.update([])
  }
  // END constructor

  /**
   * Enters the readability mode
   */
  enterReadability () {
    this._lastMode = this._cm.getOption('mode')
    this._cm.setOption('mode', {
      name: 'readability',
      algorithm: global.config.get('editor.readabilityAlgorithm')
    })
    this._cm.refresh()
  }

  /**
   * Exits the readability mode.
   */
  exitReadability () {
    this._cm.setOption('mode', this._lastMode)
    this._cm.refresh()
  }

  /**
   * Returns whether or not the editor is currently in readability mode
   * @return {Boolean} Whether or not readability mode is active.
   */
  isReadabilityModeActive () {
    let mode = this._cm.getOption('mode')
    return mode.hasOwnProperty('name') && mode.name === 'readability'
  }

  /**
   * Toggles the readability mode on or off, depending on its state.
   */
  toggleReadability () {
    if (this.isReadabilityModeActive()) {
      this.exitReadability()
    } else {
      this.enterReadability()
    }
  }

  /**
    * Opens a file, i.e. replaced the editor's content
    * @param  {GettlrFile}   file The file to be renderer
    * @param  {Mixed}        flag An optional flag
    * @return {GettlrEditor}       Chainability.
    */
  open (file, flag = null) {
    this._cm.setValue(file.content)
    this._cm.setOption('markdownImageBasePath', path.dirname(file.path)) // Set the base path for image rendering

    // Switch modes based on the file type
    if (file.ext === '.tex') {
      this._cm.setOption('mode', TEX_MODE)
      $('.CodeMirror').addClass('cm-stex-mode')
    } else if (this._cm.getOption('mode') === TEX_MODE) {
      this._cm.setOption('mode', MD_MODE)
      $('.CodeMirror').removeClass('cm-stex-mode')
    }

    this._cm.refresh()
    // Scroll the scrollbar to top, to make sure it's at the top of the new
    // file (in case there are positions saved, they will be scrolled to
    // later in this function)
    $('.CodeMirror-vscrollbar').scrollTop(0)
    this._currentHash = 'hash' + file.hash
    this._words = countWords(this._cm.getValue(), this._countChars)

    // Mark clean, because now we got a new (and therefore unmodified) file
    this._cm.markClean()
    this._cm.clearHistory() // Clear history so that no "old" files can be
    // recreated using Cmd/Ctrl+Z.

    if (this._positions[this._currentHash] !== undefined) {
      // Restore scroll positions
      this._cm.scrollIntoView(this._positions[this._currentHash].scroll)
      this._cm.setSelection(this._positions[this._currentHash].cursor)
    }

    // Last but not least: If there are any search results currently
    // display, mark the respective positions.
    this._searcher.markResults(file)

    // If we've got a new file, we need to re-focus the editor
    if (flag === 'new-file') this._cm.focus()

    // Finally, set a timeout for a first run of citation rendering
    setTimeout(() => { this.updateCitations() }, 1000)

    return this
  }

  /**
    * Closes the current file.
    * @return {GettlrEditor} Chainability.
    */
  close () {
    if (this.isReadabilityModeActive()) this.exitReadability()
    // Save current positions in case the file is being opened again later.
    if (this._currentHash != null) {
      this._positions[this._currentHash] = {
        'scroll': JSON.parse(JSON.stringify(this._cm.getScrollInfo())),
        'cursor': JSON.parse(JSON.stringify(this._cm.getCursor()))
      }
    }

    this._cm.setValue('')
    this._cm.markClean()
    this._cm.clearHistory()
    this._words = 0
    this._cm.setOption('markdownImageBasePath', '') // Reset base path
    return this
  }

  /**
    * Toggles the distraction free mode
    */
  toggleDistractionFree () {
    this._cm.setOption('fullScreen', !this._cm.getOption('fullScreen'))
    if (!this._cm.getOption('fullScreen')) {
      this._unmuteLines()
      this._div.removeClass('fullscreen')
      this._div.css('left', this._leftBeforeDistractionFree)
    } else {
      if (this._mute) this._muteLines()
      this._div.addClass('fullscreen')
      this._leftBeforeDistractionFree = this._div.css('left')
      if (this._leftBeforeDistractionFree === '0px') this._leftBeforeDistractionFree = ''
      this._div.css('left', '') // Remove the "left" property
    }

    // We have to re-apply the font-size to the editor because this style gets
    // overwritten by one of the above operations.
    if (this._fontsize !== 100) this._div.css('font-size', this._fontsize + '%')

    // Refresh to reflect the size changes
    this._cm.refresh()
  }

  /**
   * Gets called by the Renderer everytime the configuration changes so that the
   * editor can reload all defaults
   * @return {GettlrEditor} Chainability
   */
  configChange () {
    // The configuration has changed, so reload everything

    // Re-generate the keymap
    this._cm.setOption('extraKeys', generateKeymap(this))

    // Should lines be muted in distraction free?
    this._mute = global.config.get('muteLines')
    if (this._cm.getOption('fullScreen') && !this._mute) {
      this._unmuteLines() // Unmute
    } else if (this._cm.getOption('fullScreen') && this._mute) {
      this._muteLines() // Mute
    }

    // Set the autoCloseBrackets option
    if (global.config.get('editor.autoCloseBrackets')) {
      this._cm.setOption('autoCloseBrackets', AUTOCLOSEBRACKETS)
    } else {
      this._cm.setOption('autoCloseBrackets', false)
    }

    // Set the image dimension constraints
    this._cm.setOption('imagePreviewWidth', global.config.get('display.imageWidth'))
    this._cm.setOption('imagePreviewHeight', global.config.get('display.imageHeight'))

    // Set indent unit
    this._cm.setOption('indentUnit', global.config.get('editor.indentUnit'))

    // Set the bold and italic formatting characters
    this._cm.setOption('markdownBoldFormatting', global.config.get('editor.boldFormatting'))
    this._cm.setOption('markdownItalicFormatting', global.config.get('editor.italicFormatting'))

    // Set the preview options
    this._renderCitations = global.config.get('display.renderCitations')
    this._renderIframes = global.config.get('display.renderIframes')
    this._renderImages = global.config.get('display.renderImages')
    this._renderLinks = global.config.get('display.renderLinks')
    this._renderMath = global.config.get('display.renderMath')
    this._renderTasks = global.config.get('display.renderTasks')
    this._renderHTags = global.config.get('display.renderHTags')
    this._renderTables = global.config.get('editor.enableTableHelper')

    this._countChars = global.config.get('editor.countChars')

    // Set the autoCorrect options
    let conf = global.config.get('editor.autoCorrect')
    if (!conf.active) {
      this._cm.setOption('autoCorrect', false)
    } else {
      // Convert the replacements into the correct format for the plugin
      let keys = {}
      for (let repl of conf.replacements) {
        keys[repl.key] = repl.val
      }
      this._cm.setOption('autoCorrect', {
        style: conf.style,
        quotes: conf.quotes,
        replacements: keys
      })
    }

    // Last but not least set the Zettelkasten options
    this._cm.setOption('zkn', global.config.get('zkn'))

    return this
  }

  /**
   * This sets the tag database necessary for the tag autocomplete.
   * @param {Object} tagDB An object (here with prototype due to JSON) containing tags
   */
  setTagDatabase (tagDB) { this._tagDB = tagDB }

  /**
   * Sets the citeprocIDs available to autocomplete to a new list
   * @param {Array} idList An array containing the new IDs
   */
  setCiteprocIDs (idList) {
    if (typeof idList !== 'object' || idList === null) {
      // Create an empty object.
      this._citeprocIDs = Object.create(null)
    } else {
      // Overwrite existing array
      this._citeprocIDs = idList
    }
  }

  /**
    * Removes the mute-class from all lines
    */
  _unmuteLines () {
    for (let i = 0; i < this._cm.lineCount(); i++) {
      this._cm.doc.removeLineClass(i, 'text', 'mute')
    }
  }

  /**
    * Adds the mute-class to all lines except where the cursor is at.
    */
  _muteLines () {
    this._unmuteLines()
    let highlightLine = this._cm.getCursor().line
    for (let i = 0; i < this._cm.lineCount(); i++) {
      if (highlightLine !== i) {
        this._cm.doc.addLineClass(i, 'text', 'mute')
      }
    }
  }

  /**
    * Returns an object containing info about the opened file.
    * @return {Object} An object containing words, chars, chars_wo_spaces, if selection: words_sel and chars_sel
    */
  getFileInfo () {
    let ret = {
      'words': countWords(this._cm.getValue(), this._countChars),
      'chars': this._cm.getValue().length,
      'chars_wo_spaces': this._cm.getValue().replace(/[\s ]+/g, '').length,
      'cursor': JSON.parse(JSON.stringify(this._cm.getCursor()))
    }

    if (this._cm.somethingSelected()) {
      ret.words_sel = countWords(this._cm.getSelections().join(' '), this._countChars)
      ret.chars_sel = this._cm.getSelections().join('').length
    }

    return ret
  }

  /**
    * Returns the (newly) written words since the last time this function was
    * called.
    * @return {Integer} The delta of the word count.
    */
  getWrittenWords () {
    // Return the additional written words
    let nbr = countWords(this._cm.getValue(), this._countChars) - this._words
    this._words = countWords(this._cm.getValue(), this._countChars)
    return nbr
  }

  /**
    * Replaces the currently selected words. Is only called by the context
    * menu currently.
    * @param  {String} word The new word.
    * @return {void}      Nothing to return.
    */
  replaceWord (word) {
    // We obviously need a selection to replace
    if (!this._cm.somethingSelected()) return

    // Replace word and select new word
    this._cm.replaceSelection(word, 'around')
  }

  /**
    * Displays the footnote content for a given footnote (element)
    * @param  {jQuery} element The footnote element
    * @return {void}         Nothing to return.
    */
  _fntooltip (element) {
    // First let us see if there is already a tippy-instance bound to this.
    // If so, we can abort now.
    if (element[0].hasOwnProperty('_tippy') && element[0]._tippy) {
      return
    }

    // Because we highlight the formatting as well, the element's text will
    // only contain ^<id> without the brackets
    let fn = element.text().substr(1)
    let fnref = ''

    // Now find the respective line and extract the footnote content using
    // our RegEx from the footnotes plugin.
    let fnrefRE = /^\[\^([\da-zA-Z_-]+)\]: (.+)/gm

    for (let lineNo = this._cm.doc.lastLine(); lineNo > -1; lineNo--) {
      fnrefRE.lastIndex = 0
      let line = this._cm.doc.getLine(lineNo)
      let match = null
      if (((match = fnrefRE.exec(line)) != null) && (match[1] === fn)) {
        fnref = match[2]
        break
      }
    }

    // TODO translate this message!
    fnref = (fnref && fnref !== '') ? fnref : '_No reference text_'

    // For preview we should convert the footnote text to HTML.
    fnref = this._showdown.makeHtml(fnref)

    // Now we either got a match or an empty fnref. So create a tippy
    // instance
    global.tippy(element[0], {
      'content': fnref,
      allowHTML: true,
      onHidden (instance) {
        instance.destroy() // Destroy the tippy instance.
      },
      arrow: true
    }).show() // Immediately show the tooltip
  }

  /**
    * This displays a small popup to allow editing the text from within the text, without the need to scroll.
    * @param  {jQuery} elem The (jQuery) encapsulated footnote reference.
    */
  _editFootnote (elem) {
    let ref = elem.text().substr(1)
    let line = null
    this._cm.eachLine((handle) => {
      if (handle.text.indexOf(`[^${ref}]:`) === 0) {
        // Got the line
        line = handle
      }
    })

    let cnt = '<div class="footnote-edit">'
    cnt += `<textarea id="footnote-edit-textarea">${line.text.substr(5 + ref.length)}</textarea>`
    cnt += '</div>'

    let p = popup(elem, cnt)

    // Focus the textarea immediately.
    $('#footnote-edit-textarea').focus()

    $('.popup .footnote-edit').on('keydown', (e) => {
      if (e.which === 13 && e.shiftKey) {
        // Done editing.
        e.preventDefault()
        let newtext = `[^${ref}]: ${e.target.value}`
        let sc = this._cm.getSearchCursor(line.text, { 'line': 0, 'ch': 0 })
        sc.findNext()
        sc.replace(newtext)
        p.close()
      }
    })
  }

  /**
    * This function builds a table of contents based on the editor contents
    * @return {Array} An array containing objects with all headings
    */
  buildTOC () {
    let toc = []
    for (let i = 0; i < this._cm.lineCount(); i++) {
      // Don't include comments from code examples in the TOC
      if (this._cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue
      let line = this._cm.getLine(i)
      if (/^#{1,6} /.test(line)) {
        toc.push({
          'line': i,
          'text': line.replace(/^#{1,6} /, ''),
          'level': (line.match(/^(#+)/) || [ [], [] ])[1].length
        })
      }
    }

    return toc
  }

  /**
    * Small function that jumps to a specific line in the editor.
    * @param  {Integer} line The line to pull into view
    * @return {void}      No return.
    */
  jtl (line) {
    // Wow. Such magic.
    this._cm.doc.setCursor({ 'line': line, 'ch': 0 })
    this._cm.refresh()
  }

  /**
   * Moves a whole section (as demarcated by ATX headings)
   * @param  {number} fromLine The line at which the section to be moved begins
   * @param  {number} toLine   The target line, above which the section should be inserted.
   * @return {GettlrEditor}    This for chainability.
   */
  moveSection (fromLine, toLine) {
    let sectionStart = fromLine
    let sectionEnd = fromLine
    let headingLevel = -1

    // First match of the following regex contains the heading characters, ergo
    // the length is the heading level
    headingLevel = /^(#{1,6}) (.*)$/.exec(this._cm.getLine(fromLine))[1].length

    // Build a regex to be used now. We'll only stop at either a higher or
    // same level heading. We're doing this, because this way we'll include
    // lesser headings in this section.
    let searchRegex = new RegExp(`^#{1,${headingLevel}} .+$`)
    for (let i = sectionStart + 1; i < this._cm.lineCount(); i++) {
      if (searchRegex.test(this._cm.getLine(i))) {
        // We've found a heading of at least this level.
        sectionEnd = i - 1 // Don't include the current line, obviously
        break
      }
    }

    // Sanity check: If sectionEnd has not been set, this means that the user
    // wanted to move the final section -- the RegExp will naturally not yield
    // any result, so we take everything until the very end to be included in
    // the section.
    if (sectionEnd === fromLine) sectionEnd = this._cm.lineCount() - 1

    let lines = this._cm.getValue().split('\n')
    let section = lines.slice(sectionStart, sectionEnd + 1)

    if (toLine < 0) {
      // We should move the section to the end, so cut and append it.
      // Remove the old section.
      lines.splice(sectionStart, section.length)
      // Sneak a new line into the section
      section.unshift('')
      // Concat the section
      lines = lines.concat(section)
    } else if (sectionEnd < toLine) {
      // The section should be moved to the back, so to not confuse line numbers,
      // we first need to insert the section (i.e. copy and paste), and only
      // afterwards remove the section.
      // First get the stuff before the old section position
      let beforeSection = lines.slice(0, sectionStart)
      // Then append the part behind the section up until the target line
      beforeSection = beforeSection.concat(lines.slice(sectionEnd + 1, toLine))

      // Get everything after the target line
      let afterSection = lines.slice(toLine)

      // Now glue it back together (afterSection -> section, then section -> beforeSection)
      lines = beforeSection.concat(section.concat(afterSection))
    } else if (sectionStart > toLine) {
      // The section should be moved to the front, so we can safely cut it directly.
      // Remove the old section.
      lines.splice(sectionStart, section.length)

      // Then insert it above the target line. We will make use of Function.apply
      // to pass the array completely to the function. What do I mean? Splice
      // basically needs 2 arguments plus a list of unknown length. This means
      // we create an array containing the first and second argument [toline, 0],
      // and afterwards add the whole section array. They will be inserted in the
      // right order and the function will be called accordingly.
      Array.prototype.splice.apply(lines, [ toLine, 0 ].concat(section))
      // Splice will be called on "lines" with the argument chain.
      // Equivalent: lines.splice(toLine, 0, section)
    }

    // Now we have the correct lines. So let's simply replace the whole content
    // with it. Tadaa!
    this._cm.setValue(lines.join('\n'))

    return this
  }

  /**
    * Alter the font size of the editor.
    * @param  {Integer} direction The direction, can be 1 (increase), -1 (decrease) or 0 (reset)
    * @return {GettlrEditor}           Chainability.
    */
  zoom (direction) {
    if (direction === 0) {
      this._fontsize = 100
    } else {
      let newSize = this._fontsize + 10 * direction
      // Constrain the size so it doesn't run into errors
      if (newSize < 30) newSize = 30 // Less than thirty and CodeMirror doesn't display the text anymore.
      if (newSize > 400) newSize = 400 // More than 400 and you'll run into problems concerning headings 1
      this._fontsize = newSize
    }
    this._div.css('font-size', this._fontsize + '%')
    this._cm.refresh()
    return this
  }

  /**
    * This function copies text as HTML, if there are selections
    * @return {GettlrEditor} This (chainabiltiy)
    */
  copyAsHTML () {
    if (this._cm.somethingSelected()) {
      let md = this._cm.getSelections().join(' ')
      let html = this._showdown.makeHtml(md)
      // Write both the HTML and the Markdown
      // (as fallback plain text) to the clipboard
      clipboard.write({ 'text': md, 'html': html })
    }
    return this
  }

  /**
   * This function pastes a clipboard selection as plain text regardless of what
   * the formatted HTML contents say.
   * @return {GettlrEditor} Chainability.
   */
  pasteAsPlain () {
    // Simply overwrite the clipboard's HTML with the plain text contents to
    // make it appear we've "matched style" lol
    let plain = clipboard.readText()

    // Simple programmatical paste.
    if (plain && plain.length > 0) this.insertText(plain)

    return this
  }

  /**
   * Renders all citations that haven't been rendered yet.
   * @return {void} Does not return.
   */
  renderCitations () {
    let needRefresh = false
    let elements = $('.CodeMirror .citeproc-citation')
    elements.each((index, elem) => {
      elem = $(elem)
      if (elem.attr('data-rendered') !== 'yes') {
        let item = elem.text()
        let id = hash(item)
        if (this._citationBuffer[id] !== undefined) {
          elem.html(this._citationBuffer[id]).removeClass('error').attr('data-rendered', 'yes')
          needRefresh = true
        } else {
          let newCite = global.citeproc.getCitation(item)
          switch (newCite.status) {
            case 4: // Engine was ready, newCite.citation contains the citation
              elem.html(newCite.citation).removeClass('error').attr('data-rendered', 'yes')
              this._citationBuffer[id] = newCite.citation
              needRefresh = true
              break
            case 3: // There was an error loading the database
              elem.addClass('error')
              break
            case 2: // There was no database, so don't do anything.
              elem.attr('data-rendered', 'yes')
              break
          }
        }
      }
    })

    // We need to refresh the editor, because the updating process has certainly
    // altered the widths of the spans.
    if (needRefresh) this._cm.refresh()
  }

  /**
   * This method updates both the in-text citations as well as the bibliography.
   * @return {void} Does not return.
   */
  updateCitations () {
    // This function searches for all elements with class .citeproc-citation and
    // updates the contents of these elements based upon the ID.

    // NEVER use jQuery to always query all citeproc-citations, because CodeMirror
    // does NOT always print them! We have to manually go through the value of
    // the code ...
    let cnt = this._cm.getValue()
    let totalIDs = Object.create(null)
    let match
    let citeprocIDRE = /@([a-z0-9_:.#$%&\-+?<>~/]+)/gi
    let somethingUpdated = false // This flag indicates if anything has changed and justifies a new bibliography.
    while ((match = citeprocIDRE.exec(cnt)) != null) {
      let id = match[1]
      totalIDs[id] = this._lastKnownCitationCluster[id] // Could be undefined.
    }

    // Now we have the correct amount of IDs in our cluster. Now fetch all
    // citations of new ones.
    for (let id in totalIDs) {
      if (totalIDs[id] === undefined) {
        totalIDs[id] = true
        somethingUpdated = true // We have to fetch a new citation
      }
    }

    // Check if there are some citations _missing_ from the new array
    for (let id in this._lastKnownCitationCluster) {
      if (totalIDs[id] === undefined) {
        somethingUpdated = true // We only need one entry to justify an update
        break
      }
    }

    // Swap
    this._lastKnownCitationCluster = totalIDs

    if (Object.keys(this._lastKnownCitationCluster).length === 0) {
      return this._renderer.setBibliography(trans('gui.citeproc.references_none'))
    }

    if (somethingUpdated) {
      // Need to update
      // We need to update the items first!
      let bib = global.citeproc.updateItems(Object.keys(this._lastKnownCitationCluster))
      if (bib === true) {
        global.citeproc.makeBibliography() // Trigger a new bibliography build
      } else if (bib === 1) { // 1 means booting
        this._renderer.setBibliography(trans('gui.citeproc.references_booting'))
        // Unset so that the update process is triggered again next time
        this._lastKnownCitationCluster = Object.create(null)
      } else if (bib === 3) { // There was an error
        this._renderer.setBibliography(trans('gui.citeproc.references_error'))
      } else if (bib === 2) { // No database loaded
        this._renderer.setBibliography(trans('gui.citeproc.no_db'))
      }
    }
  }

  /**
   * Returns the current value of the editor.
   * @return {String} The current editor contents.
   */
  getValue () { return this._cm.getValue() }

  /**
   * This method can be used to insert some text at the current cursor position.
   * ATTENTION: It WILL overwrite any given selection!
   * @param  {String} text The text to insert
   * @return {void}      Does not return.
   */
  insertText (text) { this._cm.replaceSelection(text) }

  /**
    * Mark clean the CodeMirror instance
    * @return {void} Nothing to return.
    */
  markClean () { this._cm.markClean() }

  /**
    * Query if the editor is currently modified
    * @return {Boolean} True, if there are no changes, false, if there are.
    */
  isClean () { return this._cm.doc.isClean() }

  /**
    * Run a CodeMirror command.
    * @param  {String} cmd The command to be passed to cm.
    * @return {void}     Nothing to return.
    */
  runCommand (cmd) {
    // Shortcut for the only command that
    // actively should change the selection.
    if (cmd === 'selectWordUnderCursor') {
      this._cm.execCommand(cmd)
      return
    }

    let sel = this._cm.doc.listSelections()
    let oldCur = JSON.parse(JSON.stringify(this._cm.getCursor()))
    this._cm.execCommand(cmd)

    if (sel.length > 0) this._cm.doc.setSelections(sel)

    if (cmd === 'insertFootnote') {
      // In case the user inserted a footnote, we have to re-set the cursor
      // for ease of access.
      oldCur.ch += 2 // This sets the cursor inside, so the user has a visual on where to ALT-Click
      this._cm.setCursor(oldCur)
    }
  }

  /**
    * Focus the CodeMirror instance
    */
  focus () { this._cm.focus() }

  /**
    * Refresh the CodeMirror instance
    */
  refresh () { this._cm.refresh() }

  /**
   * Get the CodeMirror instance
   * @return {CodeMirror} The editor instance
   */
  getEditor () { return this._cm }
}

module.exports = GettlrEditor
