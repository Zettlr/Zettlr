/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrConfig class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class fulfills two basic tasks: (1) Manage the app's
 *                  configuration, stored in the config.json inside the user
 *                  data directory. (2) Check the environment whether or not
 *                  specific conditions exist (such as the pandoc or xelatex
 *                  binaries)
 *
 * END HEADER
 */

const fs = require('fs')
const path = require('path')
const uuid4 = require('uuid').v4
const EventEmitter = require('events')
const bcp47 = require('bcp-47')
const ZettlrValidation = require('../../common/zettlr-validation')
const { app, ipcMain } = require('electron')
const ignoreFile = require('../../common/util/ignore-file')
const safeAssign = require('../../common/util/safe-assign')
const isDir = require('../../common/util/is-dir')
const isFile = require('../../common/util/is-file')
const isDictAvailable = require('../../common/util/is-dict-available')
const { getLanguageFile } = require('../../common/i18n')
const COMMON_DATA = require('../../common/data.json')
const ZETTLR_VERSION = app.getVersion()

const broadcastIpcMessage = require('../../common/util/broadcast-ipc-message')

/**
 * This class represents the configuration of Zettlr, represented by the
 * config.json file in the user's data directory as well as some environment
 * variables. Basically, this class tells Zettlr what the user wants and what
 * the environment Zettlr is running in is capable of.
 */
module.exports = class ConfigProvider extends EventEmitter {
  /**
    * Preset sane defaults, then load the config and perform a system check.
    * @param {Zettlr} parent Parent Zettlr object.
    */
  constructor () {
    super() // Initiate the emitter
    global.log.verbose('Config provider booting up ...')
    this.configPath = app.getPath('userData')
    this.configFile = path.join(this.configPath, 'config.json')

    // The user may provide a temporary config to the process, which
    // leaves the "original" one untouched. This is very handy for
    // testing.
    const configFlag = process.argv.find(elem => elem.indexOf('--config=') === 0)
    if (configFlag !== undefined) {
      // A different configuration was, provided, so let's use that one instead!
      let temporaryConfig = /^--config="?([^"]+)"?$/.exec(configFlag)[1]

      if (!path.isAbsolute(temporaryConfig)) {
        if (app.isPackaged) {
          // Attempt to use the executable file's path
          temporaryConfig = path.join(path.dirname(app.getPath('exe')), temporaryConfig)
        } else {
          // Attempt to use the repository's root directory
          temporaryConfig = path.join(__dirname, '../../../', temporaryConfig)
        }
      }
      global.log.info('Using temporary configuration file at ' + temporaryConfig)
      this.configFile = temporaryConfig
    }

    this.config = null
    this._rules = [] // This array holds all validation rules
    this._firstStart = false // Only true if a config file has been created
    this._newVersion = false // True if the last read config had a different version

    this._bulkSetInProgress = false // As long as this is true, a bulk set happens

    // Config Template providing all necessary arguments
    this.cfgtpl = {
      'version': ZETTLR_VERSION, // Useful for migrating
      'openPaths': [], // Array to include all opened root paths
      'openFiles': [], // Array to include all currently opened files
      'lastFile': null, // Save last opened file hash here
      'lastDir': null, // Save last opened dir hash here
      'dialogPaths': {
        'askFileDialog': '',
        'askDirDialog': '',
        'askLangFileDialog': ''
      },
      'window': {
        // Only use native window appearance by default on macOS. If this value
        // is false, this means that Zettlr will display the menu bar and window
        // controls as defined in the HTML.
        'nativeAppearance': process.platform === 'darwin'
      },
      // Visible attachment filetypes
      'attachmentExtensions': COMMON_DATA.attachmentExtensions,
      // UI related options
      'darkMode': false,
      'alwaysReloadFiles': false, // Should Zettlr automatically load remote changes?
      'autoDarkMode': 'off', // Possible values: 'off', 'system', 'schedule', 'auto'
      'autoDarkModeStart': '22:00', // Switch into dark mode at this time
      'autoDarkModeEnd': '06:00', // Switch to light mode at this time
      'fileMeta': true,
      'fileMetaTime': 'modtime', // The time to be displayed in file meta
      'hideDirs': true, // Should the app hide directories during global search?
      'sorting': 'natural', // Can be natural or based on ASCII values
      'sortingTime': 'modtime', // can be modtime or creationtime
      'muteLines': true, // Should the editor mute lines in distraction free mode?
      'fileManagerMode': 'thin', // thin = Preview or directories visible --- expanded = both visible --- combined = tree view displays also files
      'newFileNamePattern': '%id.md',
      'newFileDontPrompt': false, // If true immediately creates files
      // Export options
      'pandoc': '',
      'xelatex': '',
      // The pandoc command to be run on export
      'pandocCommand': 'pandoc "$infile$" -f markdown $outflag$ $tpl$ $toc$ $tocdepth$ $bibliography$ $cslstyle$ $standalone$ --pdf-engine=xelatex --mathjax -o "$outfile$"',
      'export': {
        'dir': 'temp', // Can either be "temp" or "cwd" (current working directory)
        'stripIDs': false, // Strip ZKN IDs such as @ID:<id>
        'stripTags': false, // Strip tags a.k.a. #tag
        'stripLinks': 'full', // Strip internal links: "full" - remove completely, "unlink" - only remove brackets, "no" - don't alter
        'cslLibrary': '', // Path to a CSL JSON library file
        'cslStyle': '', // Path to a CSL Style file
        'useBundledPandoc': true // Whether to use the bundled Pandoc
      },
      // PDF options (for all documents; projects will copy this object over)
      'pdf': {
        'author': 'Generated by Zettlr', // Default user name
        'keywords': '', // PDF keywords
        'papertype': 'a4paper', // Paper to use, e.g. A4 or Letter
        'pagenumbering': 'gobble', // By default omit page numbers
        'tmargin': 3, // Margins to paper (top, right, bottom, left)
        'rmargin': 3,
        'bmargin': 3,
        'lmargin': 3,
        'margin_unit': 'cm',
        'lineheight': '1.5', // Default: 150% line height
        'mainfont': 'Times New Roman', // Main font
        'sansfont': 'Arial', // Sans font, used, e.g. for headings
        'fontsize': 12, // Will be translated to pt
        'textpl': '' // Can be used to store a custom TeX template
      },
      // Zettelkasten stuff (IDs, as well as link matchers)
      'zkn': {
        'idRE': '(\\d{14})',
        'idGen': '%Y%M%D%h%m%s',
        'linkStart': '[[',
        'linkEnd': ']]',
        'linkWithFilename': 'always', // can be always|never|withID
        // If true, create files that are not found, if forceOpen is called
        'autoCreateLinkedFiles': false,
        'autoSearch': true // Automatically start a search upon following a link?
      },
      // Editor related stuff
      'editor': {
        'autocompleteAcceptSpace': false, // Whether you can type spaces in autocorrect
        'autoCloseBrackets': true,
        'defaultSaveImagePath': '',
        'homeEndBehaviour': true, // If checked (true), CodeMirror goes to start/end of a paragraph, not a line.
        'enableTableHelper': true, // Enable the table helper plugin
        'indentUnit': 4, // The number of spaces to be added
        'fontSize': 16, // The editor's font size in pixels
        'countChars': false, // Set to true to enable counting characters instead of words
        'inputMode': 'default', // Can be default, vim, emacs
        'boldFormatting': '**', // Can be ** or __
        'italicFormatting': '_', // Can be * or _
        'readabilityAlgorithm': 'dale-chall', // The algorithm to use with readability mode.
        'direction': 'ltr', // Can be set to rtl for right-to-left scripts such as Persian
        'rtlMoveVisually': true, // Whether the cursor should move visually with arrows in RTL mode
        'autoCorrect': {
          'active': true, // AutoCorrect is on by default
          'style': 'LibreOffice', // Default to LibreOffice style
          'quotes': false,
          'replacements': [
            // Arrows
            { key: '-->', val: '→' },
            { key: '–>', val: '→' }, // For Word mode arrows
            { key: '<--', val: '←' },
            { key: '<->', val: '↔' },
            { key: '<-->', val: '↔' },
            { key: '==>', val: '⇒' },
            { key: '<==', val: '⇐' },
            { key: '<=>', val: '⇔' },
            { key: '<==>', val: '⇔' },
            // Mathematical symbols
            { key: '!=', val: '≠' },
            { key: '<>', val: '≠' },
            { key: '+-', val: '±' },
            { key: ':times:', val: '×' },
            { key: ':division:', val: '÷' },
            { key: '<=', val: '≤' },
            { key: '>=', val: '≥' },
            { key: '1/2', val: '½' },
            { key: '1/3', val: '⅓' },
            { key: '2/3', val: '⅔' },
            { key: '1/4', val: '¼' },
            { key: '3/4', val: '¾' },
            { key: '1/8', val: '⅛' },
            { key: '3/8', val: '⅜' },
            { key: '5/8', val: '⅝' },
            { key: '7/8', val: '⅞' },
            // Units
            { key: 'mm2', val: 'mm²' },
            { key: 'cm2', val: 'cm²' },
            { key: 'm2', val: 'm²' },
            { key: 'km2', val: 'km²' },
            { key: 'mm3', val: 'mm³' },
            { key: 'cm3', val: 'cm³' },
            { key: 'ccm', val: 'cm³' },
            { key: 'm3', val: 'm³' },
            { key: 'km3', val: 'km³' },
            { key: ':sup2:', val: '²' },
            { key: ':sup3:', val: '³' },
            { key: ':deg:', val: '°' },
            // Currencies
            { key: ':eur:', val: '€' },
            { key: ':gbp:', val: '£' },
            { key: ':yen:', val: '¥' },
            { key: ':cent:', val: '¢' },
            { key: ':inr:', val: '₹' },
            // Special symbols
            { key: '(c)', val: '©' },
            { key: '(tm)', val: '™' },
            { key: '(r)', val: '®' },
            // Interpunctation
            { key: '...', val: '…' },
            { key: '--', val: '–' },
            { key: '---', val: '—' }
          ]
        } // END autoCorrect options
      },
      'display': {
        'theme': 'berlin', // The theme, can be berlin|frankfurt|bielefeld|karl-marx-stadt|bordeaux
        'imageWidth': 100, // Maximum preview image width
        'imageHeight': 50, // Maximum preview image height
        'renderCitations': true,
        'renderIframes': true,
        'renderImages': true,
        'renderLinks': true,
        'renderMath': true,
        'renderTasks': true,
        'renderHTags': false,
        'useFirstHeadings': false // Should first headings be displayed instead of filenames?
      },
      // Language
      'selectedDicts': [ ], // By default no spell checking is active to speed up first start.
      'appLang': this.getLocale(),
      'debug': false,
      'watchdog': {
        'activatePolling': false, // Set to true to enable polling in chokidar
        'stabilityThreshold': 1000 // Positive int in milliseconds
      },
      'system': {
        'deleteOnFail': false, // Whether to delete files if trashing them fails
        'iframeWhitelist': [ 'www.youtube.com', 'player.vimeo.com' ]
      },
      'checkForBeta': false, // Should the user be notified of beta releases?
      'uuid': null // The app's unique anonymous identifier
    }

    // Load the configuration
    this.load()

    // Run system check
    this.checkSystem()

    // Remove potential dead links to non-existent files and dirs
    this.checkPaths()

    // Boot up the validation rules
    let rules = require('../../common/validation.json')
    for (let key in rules) {
      this._rules.push(new ZettlrValidation(key, rules[key]))
    }

    // Put a global setter and getter for config keys into the globals.
    global.config = {
      // Clone the properties to prevent intrusion
      get: (key) => { return JSON.parse(JSON.stringify(this.get(key))) },
      // The setter is a simply pass-through
      set: (key, val) => { return this.set(key, val) },
      /**
       * Set multiple config keys at once.
       * @param  {Object} obj An object containing key/value-pairs to set.
       * @return {Boolean}     Whether or not the call succeeded.
       */
      bulkSet: (obj) => { return this.bulkSet(obj) },
      // Enable global event listening to updates of the config
      on: (evt, callback) => { this.on(evt, callback) },
      // Also do the same for the removal of listeners
      off: (evt, callback) => { this.off(evt, callback) },
      /**
       * Persists the current configuration to disk
       * @return {void} Does not return
       */
      save: () => { this.save() },
      /**
       * Adds a path to the startup path array
       * @param {String} p The path to add
       * @return {Boolean} Whether or not the call succeeded
       */
      addPath: (p) => { return this.addPath(p) },
      /**
       * Removes a path from the startup path array
       * @param  {String} p The path to remove
       * @return {Boolean}   Whether or not the call succeeded
       */
      removePath: (p) => { return this.removePath(p) },
      addFile: (f) => { return this.addFile(f) },
      removeFile: (f) => { return this.removeFile(f) },
      /**
       * If true, Zettlr assumes this is the first start of the app
       */
      isFirstStart: () => { return this._firstStart },
      /**
       * If true, Zettlr has detected a change in version in the config
       */
      newVersionDetected: () => { return this._newVersion }
    } // END globals for the configuration

    // Listen for renderer events
    ipcMain.on('config-provider', (event, message) => {
      const { command, payload } = message

      if (command === 'get-config') {
        event.returnValue = this.get(payload.key)
      } else if (command === 'set-config') {
        event.returnValue = this.set(payload.key, payload.val)
      }
    })
  }

  /**
   * Shutdown the service provider -- here save the config to disk
   * @return {Boolean} Returns true after successful shutdown.
   */
  shutdown () {
    global.log.verbose('Config provider shutting down ...')
    this.save()
    return true
  }

  /**
    * This function only (re-)reads the configuration file if present
    * @return {ZettlrConfig} This for chainability.
    */
  load () {
    this.config = this.cfgtpl
    let readConfig = {}
    global.log.verbose(`[Config Provider] Loading configuration file from ${this.configFile} ...`)

    // Does the file already exist?
    try {
      fs.lstatSync(this.configFile)
      readConfig = JSON.parse(fs.readFileSync(this.configFile, { encoding: 'utf8' }))
      global.log.verbose('[Config Provider] Successfully loaded configuration')
    } catch (e) {
      global.log.info('[Config Provider] No configuration file found - using defaults.')
      fs.writeFileSync(this.configFile, JSON.stringify(this.cfgtpl), { encoding: 'utf8' })
      this._firstStart = true // Assume first start
      this._newVersion = true // Obviously
      return this // No need to iterate over objects anymore
    }

    // Determine if this is a different version
    this._newVersion = readConfig.version !== this.config.version
    if (this._newVersion) {
      global.log.info(`Migrating from ${readConfig.version} to ${this.config.version}!`)
    }

    this.update(readConfig)

    // Don't forget to update the version
    if (this._newVersion) {
      this.set('version', ZETTLR_VERSION)
    }

    return this
  }

  /**
    * Write the config file (e.g. on app exit)
    * @return {ZettlrConfig} This for chainability.
    */
  save () {
    if (this.configFile == null || this.config == null) {
      this.load()
    }
    // (Over-)write the configuration
    global.log.verbose(`[Config Provider] Writing configuration file to ${this.configFile}...`)

    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config), { encoding: 'utf8' })
    } catch (e) {
      global.log.error(`[Config Provider] Error during file write: ${e.message}`, e)
    }

    return this
  }

  /**
    * This function runs a general environment check and tries to determine
    * some environment variables (such as the existence of pandoc or xelatex)
    * @return {ZettlrConfig} This for chainability.
    */
  checkSystem () {
    let delim = (process.platform === 'win32') ? ';' : ':'

    // Also add to PATH xelatex and pandoc-directories
    // if these variables contain actual dirs.
    if (this.get('xelatex').length > 0) {
      let xelatex = this.get('xelatex').substr(0, this.get('xelatex').length - 1)
      if (isFile(xelatex)) {
        // The user provided the path including the executable name
        xelatex = path.dirname(xelatex)
      }

      if (process.env.PATH.indexOf(xelatex) === -1) {
        process.env.PATH += delim + xelatex
      }
    }

    if (this.get('pandoc').length > 0) {
      let pandoc = this.get('pandoc')
      if (isFile(pandoc)) {
        // The user provided the path including the executable name
        pandoc = path.dirname(pandoc)
      }

      if (process.env.PATH.indexOf(pandoc) === -1) {
        process.envPATH += delim + pandoc
      }
    }

    // Finally, check whether or not a UUID exists, and, if not, generate one.
    if (this.config.uuid === null) {
      this.config.uuid = uuid4()
    }

    return this
  }

  /**
    * Checks the validity of each path that should be opened and removes all
    * those that are invalid
    * @return {void} Nothing to return.
    */
  checkPaths () {
    // Remove duplicates
    this.config['openPaths'] = [...new Set(this.config['openPaths'])]

    // Now sort the paths.
    this._sortPaths()

    // We have to run over the spellchecking dictionaries and see whether or
    // not they are still valid or if they have been deleted.
    for (let i = 0; i < this.config['selectedDicts'].length; i++) {
      if (!isDictAvailable(this.config['selectedDicts'][i])) {
        this.config['selectedDicts'].splice(i, 1)
        --i
      }
    }
  }

  /**
    * Adds a path to be opened on startup
    * @param {String} p The path to be added
    * @return {Boolean} True, if the path was succesfully added, else false.
    */
  addPath (p) {
    // Only add valid and unique paths
    if ((!ignoreFile(p) || isDir(p)) && !this.config['openPaths'].includes(p)) {
      this.config['openPaths'].push(p)
      this._sortPaths()
      return true
    }

    return false
  }

  /**
    * Removes a path from the startup paths
    * @param  {String} p The path to be removed
    * @return {Boolean} Whether or not the call succeeded.
    */
  removePath (p) {
    if (this.config['openPaths'].includes(p)) {
      this.config['openPaths'].splice(this.config['openPaths'].indexOf(p), 1)
      return true
    }
    return false
  }

  /**
   * Adds a file to the array of open files.
   * @param {String} f The path of the file to add
   */
  addFile (f) {
    // Only add valid and unique files
    if ((!ignoreFile(f) || isDir(f)) && !this.config['openFiles'].includes(f)) {
      this.config['openFiles'].push(f)
      return true
    }

    return false
  }

  /**
    * Removes a file from the open files
    * @param  {String} f The file to be removed
    * @return {Boolean} Whether or not the call succeeded.
    */
  removeFile (f) {
    if (this.config['openFiles'].includes(f)) {
      this.config['openFiles'].splice(this.config['openFiles'].indexOf(f), 1)
      return true
    }
    return false
  }

  /**
    * Returns a config property
    * @param  {String} attr The property to return
    * @return {Mixed}      Either the config property or null
    */
  get (attr) {
    if (!attr) {
      // If no attribute is given, simply return the complete config object.
      return this.getConfig()
    }

    if (attr.indexOf('.') > 0) {
      // A nested argument was requested, so iterate until we find it
      let nested = attr.split('.')
      let cfg = this.config
      for (let arg of nested) {
        if (cfg.hasOwnProperty(arg)) {
          cfg = cfg[arg]
        } else {
          global.log.warning(`[Config Provider] Someone has requested a non-existent key: ${attr}`)
          return null // The config option must match exactly
        }
      }

      return cfg // Now not the requested config option.
    }

    // Plain attribute requested
    if (this.config.hasOwnProperty(attr)) {
      return this.config[attr]
    } else {
      global.log.warning(`[Config Provider] Someone has requested a non-existent key: ${attr}`)
      return null
    }
  }

  /**
    * Simply returns the complete config object.
    * @return {Object} The configuration object.
    */
  getConfig () {
    return this.config
  }

  /**
    * Returns the language of the application but makes sure it's a language
    * installed on the system.
    * @return {String} The user's locale
    */
  getLocale () {
    let locale = app.getLocale()
    let locSchema = bcp47.parse(locale)
    // Fail if the string was malformed
    if (!locSchema.language) return 'en-US'

    // Return the best match that the app can find (only the tag).
    return getLanguageFile(locale).tag
  }

  /**
    * Sets a configuration option
    * @param {String} option The option to be set
    * @param {Mixed} value  The value of the config variable.
    * @return {Boolean} Whether or not the option was successfully set.
    */
  set (option, value) {
    // Don't add non-existent options
    if (this.config.hasOwnProperty(option) && this._validate(option, value)) {
      // Do not set the option if it already has the requested value
      if (this.config[option] === value) {
        return true
      }

      // Set the new value and inform the listeners
      this.config[option] = value
      this.emit('update', option) // Pass the option for info

      // Broadcast to all open windows
      broadcastIpcMessage('config-provider', { command: 'update', payload: option })
      if (!this._bulkSetInProgress && global.hasOwnProperty('ipc')) {
        global.ipc.send('config-update') // Notify renderer process
      }
      return true
    }

    if (option.indexOf('.') > 0) {
      // A nested argument was requested, so iterate until we find it
      let nested = option.split('.')
      let prop = nested.pop() // Last one must be set manually, b/c simple attributes aren't pointers
      let cfg = this.config
      for (let arg of nested) {
        if (cfg.hasOwnProperty(arg)) {
          cfg = cfg[arg]
        } else {
          return false // The config option must match exactly
        }
      }

      // Set the nested property
      if (cfg.hasOwnProperty(prop) && this._validate(option, value)) {
        // Do not set the option if it already has the requested value
        if (cfg[prop] === value) return true

        // Set the new value and inform the listeners
        cfg[prop] = value
        this.emit('update', option) // Pass the option for info
        // Broadcast to all open windows
        broadcastIpcMessage('config-provider', { command: 'update', payload: option })
        if (!this._bulkSetInProgress) global.ipc.send('config-update') // Notify renderer process
        return true
      }
    }

    return false
  }

  /**
   * This function allows multiple options to be set at once. It needs to be an
   * associative array in the form key:value.
   * @param  {Object} cfgObj An object containing the keys and new values.
   * @return {Boolean}        True, if all went well, or false, if an error occurred.
   */
  bulkSet (cfgObj) {
    // Iterate and return whether there was a mistake.
    let ret = true
    this._bulkSetInProgress = true
    for (let opt in cfgObj) {
      if (!this.set(opt, cfgObj[opt])) ret = false
    }

    // Notify renderer afterwards
    this._bulkSetInProgress = false
    if (global.hasOwnProperty('ipc')) global.ipc.send('config-update')
    this.emit('update', this.getConfig()) // Notify everyone else
    // Broadcast to all open windows
    broadcastIpcMessage('config-provider', { command: 'update', payload: undefined })

    return ret
  }

  /**
    * Update the complete configuration object with new values
    * @param  {Object} newcfg               The new object containing new props
    * @return {void}                      Does not return anything.
    */
  update (newcfg) {
    // Use safeAssign to make sure only properties from the config
    // are retained, and no rogue values (which can also simply be
    // old deprecated values).
    this.config = safeAssign(newcfg, this.config)
    this.emit('update') // Emit an event to all listeners
    // Broadcast to all open windows
    broadcastIpcMessage('config-provider', { command: 'update', payload: undefined })
  }

  /**
    * Sorts the paths prior to using them alphabetically and by type.
    * @return {ZettlrConfig} Chainability.
    */
  _sortPaths () {
    let f = []
    let d = []
    for (let p of this.config['openPaths']) {
      if (isDir(p)) {
        d.push(p)
      } else {
        f.push(p)
      }
    }
    f.sort()
    d.sort()
    this.config['openPaths'] = f.concat(d)

    return this
  }

  /**
   * Validates a key's value based upon previously set up validation rules
   * @param  {string} key   The key (can be dotted) to be validated
   * @param  {mixed} value The value to be validated
   * @return {Boolean}       False, if a given validation failed, otherwise true.
   */
  _validate (key, value) {
    let rule = this._rules.find(elem => elem.getKey() === key)
    // There is a rule for this key, so validate
    if (rule) return rule.validate(value)
    // There are some options for which there is no validation.
    return true
  }
}
