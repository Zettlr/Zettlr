/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GettlrConfig class
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
const GettlrValidation = require('../../common/gettlr-validation')
const { app } = require('electron')
const ignoreFile = require('../../common/util/ignore-file')
const isDir = require('../../common/util/is-dir')
const isDictAvailable = require('../../common/util/is-dict-available')
const { getLanguageFile } = require('../../common/lang/i18n')
const COMMON_DATA = require('../../common/data.json')

// Suppress notifications on modification of the following settings
const SUPPRESS_NOTIFICATION = [
  'window.x', 'window.y', 'window.width', 'window.height', 'window.max'
]

/**
 * This class represents the configuration of Gettlr, represented by the
 * config.json file in the user's data directory as well as some environment
 * variables. Basically, this class tells Gettlr what the user wants and what
 * the environment Gettlr is running in is capable of.
 */
class ConfigProvider extends EventEmitter {
  /**
    * Preset sane defaults, then load the config and perform a system check.
    * @param {Gettlr} parent Parent Gettlr object.
    */
  constructor () {
    super() // Initiate the emitter
    global.log.verbose('Config provider booting up ...')
    this.configPath = app.getPath('userData')
    this.configFile = path.join(this.configPath, 'config.json')

    this.config = null
    this._rules = [] // This array holds all validation rules

    this._bulkSetInProgress = false // As long as this is true, a bulk set happens

    // Additional environmental paths (for locating LaTeX and Pandoc)
    switch (process.platform) {
      case 'win32':
        this._additional_paths = COMMON_DATA.additional_paths.win32
        break
      case 'linux':
        this._additional_paths = COMMON_DATA.additional_paths.linux
        break
      case 'darwin':
        this._additional_paths = COMMON_DATA.additional_paths.macos
        break
      default:
        this._additional_paths = [] // Fallback: No additional paths
        break
    }

    // This function makes sure necessary files and folders exist for the app to
    // start up smoothly. These paths should exist before any deeper logic is
    // executed.
    this._assertPaths()

    // Config Template providing all necessary arguments
    this.cfgtpl = {
      // Root directories
      'openPaths': [],
      'dialogPaths': {
        'askFileDialog': '',
        'askDirDialog': '',
        'askLangFileDialog': ''
      },
      'window': {
        'x': 0,
        'y': 0,
        'width': require('electron').screen.getPrimaryDisplay().workAreaSize.width,
        'height': require('electron').screen.getPrimaryDisplay().workAreaSize.width,
        'max': true
      },
      'lastFile': null, // Save last opened file hash here
      'lastDir': null, // Save last opened dir hash here
      // Visible attachment filetypes
      'attachmentExtensions': COMMON_DATA.attachmentExtensions,
      // UI related options
      'darkTheme': false, // TODO DEPRECATED to be renamed to darkMode
      'alwaysReloadFiles': false, // Should Gettlr automatically load remote changes?
      'autoDarkMode': 'off', // Possible values: 'off', 'system', 'schedule', 'auto'
      'autoDarkModeStart': '22:00', // Switch into dark mode at this time
      'autoDarkModeEnd': '06:00', // Switch to light mode at this time
      'fileMeta': true,
      'fileMetaTime': 'modtime', // The time to be displayed in file meta
      'hideDirs': true, // Should the app hide directories during global search?
      'sorting': 'natural', // Can be natural or based on ASCII values
      'sortingTime': 'modtime', // can be modtime or creationtime
      'muteLines': true, // Should the editor mute lines in distraction free mode?
      'sidebarMode': 'thin', // thin = Preview or directories visible --- expanded = both visible --- combined = tree view displays also files
      'enableRMarkdown': false, // Whether or not RMarkdown files should be recognised
      'newFileNamePattern': '%id.md',
      'newFileDontPrompt': false, // If true immediately creates files
      // Export options
      'pandoc': 'pandoc',
      'xelatex': 'xelatex',
      // The pandoc command to be run on export
      'pandocCommand': 'pandoc "$infile$" -f markdown $outflag$ $tpl$ $toc$ $tocdepth$ $citeproc$ $standalone$ --pdf-engine=xelatex --mathjax -o "$outfile$"',
      'export': {
        'dir': 'temp', // Can either be "temp" or "cwd" (current working directory)
        'stripIDs': false, // Strip ZKN IDs such as @ID:<id>
        'stripTags': false, // Strip tags a.k.a. #tag
        'stripLinks': 'full', // Strip internal links: "full" - remove completely, "unlink" - only remove brackets, "no" - don't alter
        'cslLibrary': '', // Path to a CSL JSON library file
        'cslStyle': '' // Path to a CSL Style file
      },
      // PDF options (for all documents; projects will copy this object over)
      'pdf': {
        'author': 'Generated by Gettlr', // Default user name
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
        'linkWithFilename': 'always' // can be always|never|withID
      },
      // Editor related stuff
      'editor': {
        'autoCloseBrackets': true,
        'defaultSaveImagePath': '',
        'homeEndBehaviour': true, // If checked (true), CodeMirror goes to start/end of a paragraph, not a line.
        'enableTableHelper': true, // Enable the table helper plugin
        'indentUnit': 4, // The number of spaces to be added
        'countChars': false, // Set to true to enable counting characters instead of words
        'boldFormatting': '**', // Can be ** or __
        'italicFormatting': '_', // Can be * or _
        'readabilityAlgorithm': 'dale-chall', // The algorithm to use with readability mode.
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
            { key: '1/4', val: '¼' },
            { key: '1/8', val: '⅛' },
            { key: '2/3', val: '⅔' },
            { key: '3/4', val: '¾' },
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
        'theme': 'berlin', // The theme used by the app, can be berlin, frankfurt, bielefeld, karl-marx-stadt
        'imageWidth': 100, // Maximum preview image width
        'imageHeight': 50, // Maximum preview image height
        'renderCitations': true,
        'renderIframes': true,
        'renderImages': true,
        'renderLinks': true,
        'renderMath': true,
        'renderTasks': true,
        'renderHTags': false
      },
      // Language
      'selectedDicts': [ ], // By default no spell checking is active to speed up first start.
      'appLang': this.getLocale(),
      'debug': false,
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
      this._rules.push(new GettlrValidation(key, rules[key]))
    }

    // Put a global setter and getter for config keys into the globals.
    global.config = {
      get: (key) => {
        // Clone the properties to prevent intrusion
        return JSON.parse(JSON.stringify(this.get(key)))
      },
      // The setter is a simply pass-through
      set: (key, val) => {
        return this.set(key, val)
      },
      /**
       * Set multiple config keys at once.
       * @param  {Object} obj An object containing key/value-pairs to set.
       * @return {Boolean}     Whether or not the call succeeded.
       */
      bulkSet: (obj) => {
        return this.bulkSet(obj)
      },
      // Enable global event listening to updates of the config
      on: (evt, callback) => {
        this.on(evt, callback)
      },
      // Also do the same for the removal of listeners
      off: (evt, callback) => {
        this.off(evt, callback)
      },
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
      removePath: (p) => { return this.removePath(p) }
    }
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
   * Makes sure absolutely essential paths of the app exist.
   */
  _assertPaths () {
    let pathToCheck = [
      this.configPath, // Main config directory
      path.join(this.configPath, 'dict'), // Custom dictionary path
      path.join(this.configPath, 'lang'), // Custom translation path
      path.join(this.configPath, 'logs') // Log path
    ]

    // Make sure each path exists
    for (let p of pathToCheck) {
      try {
        fs.lstatSync(p)
      } catch (e) {
        fs.mkdirSync(p)
      }
    }
  }

  /**
    * This function only (re-)reads the configuration file if present
    * @return {GettlrConfig} This for chainability.
    */
  load () {
    this.config = this.cfgtpl
    let readConfig = {}

    // Does the file already exist?
    try {
      fs.lstatSync(this.configFile)
      readConfig = JSON.parse(fs.readFileSync(this.configFile, { encoding: 'utf8' }))
    } catch (e) {
      fs.writeFileSync(this.configFile, JSON.stringify(this.cfgtpl), { encoding: 'utf8' })
      return this // No need to iterate over objects anymore
    }

    this.update(readConfig)

    return this
  }

  /**
    * Write the config file (e.g. on app exit)
    * @return {GettlrConfig} This for chainability.
    */
  save () {
    if (this.configFile == null || this.config == null) {
      this.load()
    }
    // (Over-)write the configuration
    fs.writeFileSync(this.configFile, JSON.stringify(this.config), { encoding: 'utf8' })

    return this
  }

  /**
    * This function runs a general environment check and tries to determine
    * some environment variables (such as the existence of pandoc or xelatex)
    * @return {GettlrConfig} This for chainability.
    */
  checkSystem () {
    let delim = (process.platform === 'win32') ? ';' : ':'

    if (this._additional_paths.length > 0) {
      // First integrate the additional paths that we need.
      let nPATH = process.env.PATH.split(delim)

      for (let x of this._additional_paths) {
        // Check for both trailing and non-trailing slashes (to not add any
        // directory more than once)
        let y = (x[x.length - 1] === '/') ? x.substr(0, x.length - 1) : x + '/'
        if (!nPATH.includes(x) && !nPATH.includes(y)) {
          nPATH.push(x)
        }
      }

      process.env.PATH = nPATH.join(delim)
    }

    // Also add to PATH xelatex and pandoc-directories if these variables
    // contain actual dirs.
    if (path.dirname(this.get('xelatex')).length > 0) {
      if (process.env.PATH.indexOf(path.dirname(this.get('xelatex'))) === -1) {
        process.env.PATH += delim + path.dirname(this.get('xelatex'))
      }
    }

    if (path.dirname(this.get('pandoc')).length > 0) {
      if (process.env.PATH.indexOf(path.dirname(this.get('pandoc'))) === -1) {
        process.env.PATH += delim + path.dirname(this.get('pandoc'))
      }
    }

    // Finally, check whether or not a UUID exists, and, if not, generate one.
    if (!this.config.uuid) {
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
          return null // The config option must match exactly
        }
      }

      return cfg // Now not the requested config option.
    }

    // Plain attribute requested
    if (this.config.hasOwnProperty(attr)) {
      return this.config[attr]
    } else {
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
      if (this.config[option] === value) return true

      // Set the new value and inform the listeners
      this.config[option] = value
      if (!SUPPRESS_NOTIFICATION.includes(option)) {
        this.emit('update', option) // Pass the option for info
        if (!this._bulkSetInProgress && global.hasOwnProperty('ipc')) global.ipc.send('config-update') // Notify renderer process
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
        if (!SUPPRESS_NOTIFICATION.includes(option)) {
          this.emit('update', option) // Pass the option for info
          if (!this._bulkSetInProgress) global.ipc.send('config-update') // Notify renderer process
        }
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

    return ret
  }

  /**
    * Update the complete configuration object with new values
    * @param  {Object} newcfg               The new object containing new props
    * @param  {Object} [oldcfg=this.config] Necessary for recursion
    * @return {void}                      Does not return anything.
    */
  update (newcfg, oldcfg = this.config) {
    // Overwrite all given attributes (and leave the not given in place)
    // This will ensure sane defaults.
    for (var prop in oldcfg) {
      if (newcfg.hasOwnProperty(prop)) {
        // We have some variable-length arrays that only contain
        // strings, e.g. we cannot update them using update()
        if ((typeof oldcfg[prop] === 'object') && !Array.isArray(oldcfg[prop]) && oldcfg[prop] !== null) {
          // Update sub-object
          this.update(newcfg[prop], oldcfg[prop])
        } else {
          oldcfg[prop] = newcfg[prop]
        }
      }
    }

    this.emit('update') // Emit an event to all listeners
  }

  /**
    * Sorts the paths prior to using them alphabetically and by type.
    * @return {GettlrConfig} Chainability.
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

module.exports = new ConfigProvider()
