interface ConfigOptions {
  version: string
  openPaths: string[]
  openFiles: string[]
  activeFile: string|null
  openDirectory: string|null
  dialogPaths: {
    askFileDialog: string
    askDirDialog: string
    askLangFileDialog: string
  }
  window: {
    nativeAppearance: boolean
  }
  attachmentExtensions: string[]
  darkMode: boolean
  alwaysReloadFiles: boolean
  autoDarkMode: 'off'|'system'|'schedule'|'auto'
  autoDarkModeStart: string
  autoDarkModeEnd: string
  fileMeta: boolean
  fileMetaTime: 'modtime'|'creationtime'
  hideDirs: boolean
  sorting: 'natural'|'ascii'
  sortingTime: 'modtime'|'creationtime'
  muteLines: boolean
  fileManagerMode: 'thin'|'combined'|'expanded'
  newFileNamePattern: string
  newFileDontPrompt: boolean
  pandoc: string
  xelatex: string
  export: {
    dir: 'temp'|'cwd'
    stripIDs: boolean
    stripTags: boolean
    stripLinks: 'full'|'unlink'|'no'
    cslLibrary: string
    cslStyle: string
    useBundledPandoc: boolean
  }
  pdf: {
    author: string
    keywords: string
    papertype: string
    pagenumbering: string
    tmargin: number
    rmargin: number
    bmargin: number
    lmargin: number
    margin_unit: string
    lineheight: string
    mainfont: string
    sansfont: string
    fontsize: number
    textpl: string
  }
  zkn: {
    idRE: string
    idGen: string
    linkStart: string
    linkEnd: string
    linkWithFilename: 'always'|'never'|'withID'
    autoCreateLinkedFiles: boolean
    autoSearch: boolean
  }
  editor: {
    autocompleteAcceptSpace: boolean
    autoCloseBrackets: boolean
    defaultSaveImagePath: string
    homeEndBehaviour: boolean
    enableTableHelper: boolean
    indentUnit: number
    fontSize: number
    countChars: boolean
    inputMode: 'default'|'vim'|'emacs'
    boldFormatting: '**'|'__'
    italicFormatting: '_'|'*'
    readabilityAlgorithm: string
    direction: 'ltr'|'rtl'
    rtlMoveVisually: boolean
    autoCorrect: {
      active: boolean
      style: 'LibreOffice'|'Word'
      magicQuotes: {
        primary: string
        secondary: string
      }
      replacements: Array<{ key: string, value: string }>
    }
  }
  display: {
    theme: 'berlin'|'frankfurt'|'bielefeld'|'karl-marx-stadt'|'bordeaux'
    imageWidth: number
    imageHeight: number
    renderCitations: boolean
    renderIframes: boolean
    renderImages: boolean
    renderLinks: boolean
    renderMath: boolean
    renderTasks: boolean
    renderHTags: boolean
    useFirstHeadings: boolean
  }
  selectedDicts: string[]
  appLang: string
  debug: boolean
  watchdog: {
    activatePolling: boolean
    stabilityThreshold: number
  }
  system: {
    deleteOnFail: boolean
  }
  checkForBeta: boolean
  uuid: string
}
