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

import fs from 'fs'
import path from 'path'
import EventEmitter from 'events'
import ZettlrValidation from '../../common/zettlr-validation'
import { app, ipcMain } from 'electron'
import ignoreFile from '../../common/util/ignore-file'
import safeAssign from '../../common/util/safe-assign'
import isDir from '../../common/util/is-dir'
import broadcastIpcMessage from '../../common/util/broadcast-ipc-message'
import RULES from '../../common/validation.json'
import getConfigTemplate from './assets/get-config-template'
import enumDictFiles from '../../common/util/enum-dict-files'

const ZETTLR_VERSION = app.getVersion()

/**
 * This class represents the configuration of Zettlr, represented by the
 * config.json file in the user's data directory as well as some environment
 * variables. Basically, this class tells Zettlr what the user wants and what
 * the environment Zettlr is running in is capable of.
 */
export default class ConfigProvider extends EventEmitter {
  /**
   * The absolute path to the used configuration
   *
   * @var {string}
   */
  private readonly configFile: string
  /**
   * Contains a set of validation rules
   *
   * @var {any[]}
   */
  private readonly _rules: any[]
  /**
   * Contains the actual configuration
   *
   * @var {any}
   */
  private config: ConfigOptions
  /**
   * A flag indicating whether the provider thinks this is a first start
   *
   * @var {boolean}
   */
  private _firstStart: boolean
  /**
   * A flag indicating whether the provider thinks the user has just updated
   *
   * @var {boolean}
   */
  private _newVersion: boolean

  /**
    * Preset sane defaults, then load the config and perform a system check.
    * @param {Zettlr} parent Parent Zettlr object.
    */
  constructor () {
    super() // Initiate the emitter
    global.log.verbose('Config provider booting up ...')
    this.configFile = path.join(app.getPath('userData'), 'config.json')

    // The user may provide a temporary config to the process, which
    // leaves the "original" one untouched. This is very handy for
    // testing.
    const configFlag = process.argv.find(elem => elem.indexOf('--config=') === 0)
    if (configFlag !== undefined) {
      // A different configuration was, provided, so let's use that one instead!
      const match = /^--config="?([^"]+)"?$/.exec(configFlag)
      if (match !== null) {
        let temporaryConfig = match[1]

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
    }

    this.config = getConfigTemplate()
    this._rules = [] // This array holds all validation rules
    this._firstStart = false // Only true if a config file has been created
    this._newVersion = false // True if the last read config had a different version

    // Load the configuration
    this.load()

    // Run potential migrations if applicable.
    this.runMigrations()

    // Remove potential dead links to non-existent files and dirs
    this.checkPaths()

    // Boot up the validation rules
    for (const key in RULES) {
      // @ts-expect-error TODO: Somehow TSLint doesn't like this
      this._rules.push(new ZettlrValidation(key, RULES[key]))
    }

    // Put a global setter and getter for config keys into the globals.
    global.config = {
      // Clone the properties to prevent intrusion
      get: (key?: string) => {
        return JSON.parse(JSON.stringify(this.get(key)))
      },
      // The setter is a simply pass-through
      set: (key: string, val: any) => {
        return this.set(key, val)
      },
      // Enable global event listening to updates of the config
      on: (evt: string, callback: (...args: any[]) => void) => {
        this.on(evt, callback)
      },
      // Also do the same for the removal of listeners
      off: (evt: string, callback: (...args: any[]) => void) => {
        this.off(evt, callback)
      },
      /**
       * Adds a path to the startup path array
       * @param {String} p The path to add
       * @return {Boolean} Whether or not the call succeeded
       */
      addPath: (p: string) => {
        return this.addPath(p)
      },
      /**
       * Removes a path from the startup path array
       * @param  {String} p The path to remove
       * @return {Boolean}   Whether or not the call succeeded
       */
      removePath: (p: string) => {
        return this.removePath(p)
      },
      addFile: (f: string) => {
        return this.addFile(f)
      },
      removeFile: (f: string) => {
        return this.removeFile(f)
      },
      /**
       * If true, Zettlr assumes this is the first start of the app
       */
      isFirstStart: () => {
        return this._firstStart
      },
      /**
       * If true, Zettlr has detected a change in version in the config
       */
      newVersionDetected: () => {
        return this._newVersion
      }
    } // END globals for the configuration

    // Listen for renderer events TODO: Migrate to the handler
    ipcMain.on('config-provider', (event, message) => {
      const { command, payload } = message

      if (command === 'get-config') {
        event.returnValue = this.get(payload.key)
      } else if (command === 'set-config-single') {
        event.returnValue = this.set(payload.key, payload.val)
      }
    })

    // Handle config events
    ipcMain.handle('config-provider', (event, message) => {
      const { command } = message

      if (command === 'set-config') {
        // Sets the complete config object
        const { payload } = message
        let ret = true
        for (let opt in payload) {
          if (!this.set(opt, payload[opt])) {
            ret = false
          }
        }

        return ret
      }
    })
  }

  /**
   * Shutdown the service provider -- here save the config to disk
   * @return {Boolean} Returns true after successful shutdown.
   */
  async shutdown (): Promise<boolean> {
    global.log.verbose('Config provider shutting down ...')
    this.save()
    return true
  }

  /**
    * This function only (re-)reads the configuration file if present
    * @return {ZettlrConfig} This for chainability.
    */
  load (): this {
    let readConfig = null
    global.log.verbose(`[Config Provider] Loading configuration file from ${this.configFile} ...`)

    // Does the file already exist?
    try {
      fs.lstatSync(this.configFile)
      readConfig = JSON.parse(fs.readFileSync(this.configFile, { encoding: 'utf8' }))
      global.log.verbose('[Config Provider] Successfully loaded configuration')
    } catch (e) {
      global.log.info('[Config Provider] No configuration file found - using defaults.')
      fs.writeFileSync(this.configFile, JSON.stringify(this.config), { encoding: 'utf8' })
      this._firstStart = true // Assume first start
      this._newVersion = true // Obviously
      return this // No need to iterate over objects anymore
    }

    // Determine if this is a different version
    this._newVersion = readConfig.version !== this.config.version
    if (this._newVersion) {
      global.log.info(`Migrating from ${String(readConfig.version)} to ${String(this.config.version)}!`)
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
  save (): this {
    if (this.configFile == null || this.config == null) {
      this.load()
    }
    // (Over-)write the configuration
    global.log.verbose(`[Config Provider] Writing configuration file to ${this.configFile}...`)

    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config), { encoding: 'utf8' })
    } catch (e) {
      global.log.error(`[Config Provider] Error during file write: ${String(e.message)}`, e)
    }

    return this
  }

  /**
    * This function runs a general check and runs any potential migrations.
    * @return {ZettlrConfig} This for chainability.
    */
  runMigrations (): this {
    // In 1.8.7 the replacements were provided as key-val pairs, but we've since
    // moved to key-value since it's more verbose. So we need to make sure these
    // conform to the new rules.
    const replacements = this.config.editor.autoCorrect.replacements
    for (const entry of replacements) {
      if ('val' in entry && !('value' in entry)) {
        global.log.info(`[Config Provider] Migrating Autocorrect replacement ${(entry as any).key as string} from 'val' to 'value' ...`);
        (entry as any).value = (entry as any).val
        delete (entry as any).val
      }
    }
    return this
  }

  /**
    * Checks the validity of each path that should be opened and removes all
    * those that are invalid
    * @return {void} Nothing to return.
    */
  checkPaths (): void {
    // Remove duplicates
    this.config.openPaths = [...new Set(this.config.openPaths)]

    // Now sort the paths.
    this._sortPaths()

    const dicts = enumDictFiles().map(item => item.tag)

    // We have to run over the spellchecking dictionaries and see whether or
    // not they are still valid or if they have been deleted.
    for (let i = 0; i < this.config.selectedDicts.length; i++) {
      if (!dicts.includes(this.config.selectedDicts[i])) {
        this.config.selectedDicts.splice(i, 1)
        --i
      }
    }
  }

  /**
    * Adds a path to be opened on startup
    * @param {String} p The path to be added
    * @return {Boolean} True, if the path was succesfully added, else false.
    */
  addPath (p: string): boolean {
    // Only add valid and unique paths
    if ((!ignoreFile(p) || isDir(p)) && !this.config.openPaths.includes(p)) {
      this.config.openPaths.push(p)
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
  removePath (p: string): boolean {
    if (this.config.openPaths.includes(p)) {
      this.config.openPaths.splice(this.config.openPaths.indexOf(p), 1)
      return true
    }
    return false
  }

  /**
   * Adds a file to the array of open files.
   * @param {String} f The path of the file to add
   */
  addFile (f: string): boolean {
    // Only add valid and unique files
    if ((!ignoreFile(f) || isDir(f)) && !this.config.openFiles.includes(f)) {
      this.config.openFiles.push(f)
      return true
    }

    return false
  }

  /**
    * Removes a file from the open files
    * @param  {String} f The file to be removed
    * @return {Boolean} Whether or not the call succeeded.
    */
  removeFile (f: string): boolean {
    if (this.config.openFiles.includes(f)) {
      this.config.openFiles.splice(this.config.openFiles.indexOf(f), 1)
      return true
    }
    return false
  }

  /**
    * Returns a config property
    * @param  {String} attr The property to return
    * @return {Mixed}      Either the config property or null
    */
  get (attr?: string): any {
    if (attr === undefined) {
      // If no attribute is given, simply return the complete config object.
      return this.getConfig()
    }

    if (attr.indexOf('.') > 0) {
      // A nested argument was requested, so iterate until we find it
      let nested = attr.split('.')
      let cfg = this.config
      for (let arg of nested) {
        if (arg in cfg) {
          // arg will be a keyof ConfigOptions at this point
          cfg = cfg[arg as keyof ConfigOptions] as unknown as any
        } else {
          global.log.warning(`[Config Provider] Someone has requested a non-existent key: ${attr}`)
          return null // The config option must match exactly
        }
      }

      return cfg // Now not the requested config option.
    }

    // Plain attribute requested
    if (attr in this.config) {
      return this.config[attr as keyof ConfigOptions]
    } else {
      global.log.warning(`[Config Provider] Someone has requested a non-existent key: ${attr}`)
      return null
    }
  }

  /**
    * Simply returns the complete config object.
    * @return {Object} The configuration object.
    */
  getConfig (): any {
    return this.config
  }

  /**
    * Sets a configuration option
    * @param {String} option The option to be set
    * @param {Mixed} value  The value of the config variable.
    * @return {Boolean} Whether or not the option was successfully set.
    */
  set (option: string, value: any): boolean {
    // Don't add non-existent options
    if (option in this.config && this._validate(option, value)) {
      // Do not set the option if it already has the requested value
      if (this.config[option as keyof ConfigOptions] === value) {
        return true
      }

      // Set the new value and inform the listeners
      // @ts-expect-error Since we're dynamically assigning a value here.
      this.config[option as keyof ConfigOptions] = value
      this.emit('update', option) // Pass the option for info

      // Broadcast to all open windows
      broadcastIpcMessage('config-provider', {
        command: 'update',
        payload: option
      })
      return true
    }

    if (option.indexOf('.') > 0) {
      // A nested argument was requested, so iterate until we find it
      let nested = option.split('.')
      // Last one must be set manually, b/c simple attributes aren't pointers
      let prop = nested.pop() as string // We can be sure it's not undefined
      let cfg = this.config
      for (let arg of nested) {
        if (arg in cfg) {
          cfg = cfg[arg as keyof ConfigOptions] as unknown as any
        } else {
          return false // The config option must match exactly
        }
      }

      // Set the nested property
      if (prop in cfg && this._validate(option, value)) {
        // Do not set the option if it already has the requested value
        if (cfg[prop as keyof ConfigOptions] === value) {
          return true
        }

        // Set the new value and inform the listeners
        // @ts-expect-error Since we're dynamically assigning a value here
        cfg[prop as keyof ConfigOptions] = value
        this.emit('update', option) // Pass the option for info
        // Broadcast to all open windows
        broadcastIpcMessage('config-provider', {
          command: 'update',
          payload: option
        })
        return true
      }
    }

    return false
  }

  /**
    * Update the complete configuration object with new values
    * @param  {Object} newcfg               The new object containing new props
    * @return {void}                      Does not return anything.
    */
  update (newcfg: any): void {
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
  _sortPaths (): this {
    let f = []
    let d = []
    for (let p of this.config.openPaths) {
      if (isDir(p)) {
        d.push(p)
      } else {
        f.push(p)
      }
    }

    // We only want to sort the paths based on rudimentary, natural order.
    let coll = new Intl.Collator([ this.get('appLang'), 'en' ], { numeric: true })
    f.sort((a, b) => {
      return coll.compare(path.basename(a), path.basename(b))
    })
    d.sort((a, b) => {
      return coll.compare(path.basename(a), path.basename(b))
    })

    this.config.openPaths = f.concat(d)

    return this
  }

  /**
   * Validates a key's value based upon previously set up validation rules
   * @param  {string} key   The key (can be dotted) to be validated
   * @param  {mixed} value The value to be validated
   * @return {Boolean}       False, if a given validation failed, otherwise true.
   */
  _validate (key: string, value: any): boolean {
    let rule = this._rules.find(elem => elem.getKey() === key)
    // There is a rule for this key, so validate
    if (rule !== undefined) {
      return rule.validate(value)
    }
    // There are some options for which there is no validation.
    return true
  }
}
