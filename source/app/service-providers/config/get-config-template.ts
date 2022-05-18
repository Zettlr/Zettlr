/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getConfigTemplate utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Returns a functional template to be used by the config provider.
 *
 * END HEADER
 */

import { app } from 'electron'
import * as bcp47 from 'bcp-47'
import { v4 as uuid4 } from 'uuid'
import getLanguageFile from '@common/util/get-language-file'

const ZETTLR_VERSION = app.getVersion()
const ATTACHMENT_EXTENSIONS = [
  '.pdf', '.odt', '.odp', '.ods',
  // Microsoft office
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Data scientific file types
  '.do', '.r', '.py',
  // Data files
  '.sav', '.zsav', '.csv', '.tsv',
  // Image types
  '.png', '.jpg', '.jpeg', '.gif', '.tiff'
]

export default function getConfigTemplate (): ConfigOptions {
  // Before returning the settings object, we have to make sure we retrieve a
  // locale that is both installed as a translation AND more or less the user's
  // wish.
  let locale = app.getLocale()
  let locSchema = bcp47.parse(locale)
  if (locSchema.language === undefined) {
    // Fall back to en-US
    locale = 'en-US'
  } else {
    // Return the best match that the app can find (only the tag).
    locale = getLanguageFile(locale).tag
  }

  // Return the complete configuration object
  return {
    version: ZETTLR_VERSION, // Useful for migrating
    openPaths: [], // Array to include all opened root paths
    openFiles: [], // Array to include all currently opened files
    activeFile: null, // Save last opened file hash here
    openDirectory: null, // Save last opened dir path here
    dialogPaths: {
      askFileDialog: '',
      askDirDialog: '',
      askLangFileDialog: ''
    },
    window: {
      // Only use native window appearance by default on macOS. If this value
      // is false, this means that Zettlr will display the menu bar and window
      // controls as defined in the HTML.
      nativeAppearance: process.platform === 'darwin',
      // Store a few GUI related settings here as well
      sidebarVisible: false,
      currentSidebarTab: 'toc',
      recentGlobalSearches: []
    },
    // Visible attachment filetypes
    attachmentExtensions: ATTACHMENT_EXTENSIONS,
    // UI related options
    darkMode: false,
    alwaysReloadFiles: false, // Should Zettlr automatically load remote changes?
    autoDarkMode: 'off', // Possible values: 'off', 'system', 'schedule', 'auto'
    autoDarkModeStart: '22:00', // Switch into dark mode at this time
    autoDarkModeEnd: '06:00', // Switch to light mode at this time
    fileMeta: true,
    fileMetaTime: 'modtime', // The time to be displayed in file meta
    sorting: 'natural', // Can be natural or based on ASCII values
    sortFoldersFirst: false, // should folders be shown first in combined fileview
    sortingTime: 'modtime', // can be modtime or creationtime
    muteLines: true, // Should the editor mute lines in distraction free mode?
    fileManagerMode: 'thin', // thin = Preview or directories visible --- expanded = both visible --- combined = tree view displays also files
    fileNameDisplay: 'title', // Controls what info is displayed as filenames
    newFileNamePattern: '%id.md',
    newFileDontPrompt: false, // If true immediately creates files
    export: {
      dir: 'temp', // Can either be "temp" or "cwd" (current working directory)
      stripTags: false, // Strip tags a.k.a. #tag
      stripLinks: 'full', // Strip internal links: "full" - remove completely, "unlink" - only remove brackets, "no" - don't alter
      cslLibrary: '', // Path to a CSL JSON library file
      cslStyle: '', // Path to a CSL Style file
      useBundledPandoc: true, // Whether to use the bundled Pandoc
      singleFileLastExporter: 'html' // Remembers the last chosen exporter for easy re-exporting
    },
    // Zettelkasten stuff (IDs, as well as link matchers)
    zkn: {
      idRE: '(\\d{14})',
      idGen: '%Y%M%D%h%m%s',
      linkStart: '[[',
      linkEnd: ']]',
      linkFilenameOnly: false,
      linkWithFilename: 'always', // can be always|never|withID
      // If true, create files that are not found, if forceOpen is called
      autoCreateLinkedFiles: false,
      autoSearch: true, // Automatically start a search upon following a link?
      customDirectory: '' // If present, saves auto-created files here
    },
    // Editor related stuff
    editor: {
      autoSave: 'delayed',
      autocompleteAcceptSpace: false, // Whether you can type spaces in autocorrect
      autoCloseBrackets: true,
      defaultSaveImagePath: '',
      citeStyle: 'regular', // Determines how autocomplete will complete citations
      homeEndBehaviour: false, // If true, Home/End goes to start/end of a paragraph, false means start/end of line.
      enableTableHelper: true, // Enable the table helper plugin
      indentUnit: 4, // The number of spaces to be added
      indentWithTabs: false,
      fontSize: 16, // The editor's font size in pixels
      countChars: false, // Set to true to enable counting characters instead of words
      inputMode: 'default', // Can be default, vim, emacs
      boldFormatting: '**', // Can be ** or __
      italicFormatting: '_', // Can be * or _
      readabilityAlgorithm: 'dale-chall', // The algorithm to use with readability mode.
      direction: 'ltr', // Can be set to rtl for right-to-left scripts such as Persian
      rtlMoveVisually: true, // Whether the cursor should move visually with arrows in RTL mode
      autoCorrect: {
        active: true, // AutoCorrect is on by default
        style: 'LibreOffice', // Default to LibreOffice style
        magicQuotes: {
          // Can be various quote pairs. The default characters (" and ')
          // will disable magic quotes.
          primary: '"…"',
          secondary: "'…'"
        },
        replacements: [
          // Arrows
          { key: '-->', value: '→' },
          { key: '–>', value: '→' }, // For Word mode arrows
          { key: '<--', value: '←' },
          { key: '<->', value: '↔' },
          { key: '<-->', value: '↔' },
          { key: '==>', value: '⇒' },
          { key: '<==', value: '⇐' },
          { key: '<=>', value: '⇔' },
          { key: '<==>', value: '⇔' },
          // Mathematical symbols
          { key: '!=', value: '≠' },
          { key: '<>', value: '≠' },
          { key: '+-', value: '±' },
          { key: ':time:', value: '×' },
          { key: ':division:', value: '÷' },
          { key: '<=', value: '≤' },
          { key: '>=', value: '≥' },
          { key: '1/2', value: '½' },
          { key: '1/3', value: '⅓' },
          { key: '2/3', value: '⅔' },
          { key: '1/4', value: '¼' },
          { key: '3/4', value: '¾' },
          { key: '1/8', value: '⅛' },
          { key: '3/8', value: '⅜' },
          { key: '5/8', value: '⅝' },
          { key: '7/8', value: '⅞' },
          // Units
          { key: 'mm2', value: 'mm²' },
          { key: 'cm2', value: 'cm²' },
          { key: 'm2', value: 'm²' },
          { key: 'km2', value: 'km²' },
          { key: 'mm3', value: 'mm³' },
          { key: 'cm3', value: 'cm³' },
          { key: 'ccm', value: 'cm³' },
          { key: 'm3', value: 'm³' },
          { key: 'km3', value: 'km³' },
          { key: ':sup2:', value: '²' },
          { key: ':sup3:', value: '³' },
          { key: ':deg:', value: '°' },
          // Currencies
          { key: ':eur', value: '€' },
          { key: ':gbp', value: '£' },
          { key: ':yen', value: '¥' },
          { key: ':cent', value: '¢' },
          { key: ':inr:', value: '₹' },
          // Special symbols
          { key: '(c)', value: '©' },
          { key: '(tm)', value: '™' },
          { key: '(r)', value: '®' },
          // Interpunctation
          { key: '...', value: '…' },
          { key: '--', value: '–' },
          { key: '---', value: '—' }
        ]
      } // END autoCorrect options
    },
    display: {
      theme: 'berlin', // The theme, can be berlin|frankfurt|bielefeld|karl-marx-stadt|bordeaux
      // By default, macOS computers use the system accent color instead of the theme's one
      useSystemAccentColor: process.platform === 'darwin',
      hideToolbarInDistractionFree: false,
      markdownFileExtensions: false,
      imageWidth: 100, // Maximum preview image width
      imageHeight: 50, // Maximum preview image height
      renderCitations: true,
      renderIframes: true,
      renderImages: true,
      renderLinks: true,
      renderMath: true,
      renderTasks: true,
      renderHTags: false,
      renderEmphasis: false
    },
    // Language
    selectedDicts: [], // By default no spell checking is active to speed up first start.
    appLang: locale,
    debug: false,
    watchdog: {
      activatePolling: false, // Set to true to enable polling in chokidar
      stabilityThreshold: 1000 // Positive int in milliseconds
    },
    system: {
      deleteOnFail: false, // Whether to delete files if trashing them fails
      leaveAppRunning: false, // Whether to leave app running in the notification area (tray)
      avoidNewTabs: true, // Whether to avoid opening new tabs for documents if possible
      iframeWhitelist: [ 'www.youtube.com', 'player.vimeo.com' ], // Contains a list of whitelisted iFrame prerendering domains
      checkForUpdates: true,
      checkForTranslationUpdates: true,
      zoomBehavior: 'gui' // Used to determine what gets zoomed: The GUI or the editor
    },
    checkForBeta: false, // Should the user be notified of beta releases?
    displayToolbarButtons: {
      showOpenPreferencesButton: true,
      showNewFileButton: true,
      showPreviousFileButton: true,
      showNextFileButton: true,
      showToggleReadabilityButton: true,
      showMarkdownCommentButton: true,
      showMarkdownLinkButton: true,
      showMarkdownImageButton: true,
      showMarkdownMakeTaskListButton: true,
      showInsertTableButton: true,
      showInsertFootnoteButton: true,
      showDocumentInfoText: true,
      showPomodoroButton: true
    },
    uuid: uuid4() // The app's unique anonymous identifier
  }
}
