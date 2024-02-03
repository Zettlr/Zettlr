/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ConfigProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class provides getters and setters for the configuration
 *                  of the whole application.
 *
 * END HEADER
 */

import path from 'path'
import EventEmitter from 'events'
import { ValidationRule, VALIDATE_RULES, VALIDATE_PROPERTIES } from './config-validation'
import PersistentDataContainer from '@common/modules/persistent-data-container'
import { app, dialog, ipcMain } from 'electron'
import ignoreFile from '@common/util/ignore-file'
import safeAssign from '@common/util/safe-assign'
import isDir from '@common/util/is-dir'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import { getConfigTemplate, type ConfigOptions } from './get-config-template'
import enumDictFiles from '@common/util/enum-dict-files'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import { loadData, trans } from '@common/i18n-main'

const ZETTLR_VERSION = app.getVersion()

/**
 * The following options require a relaunch after being changed. NOTE: These are
 * implemented as a Map that we can access and save the state whether a dialog
 * has already been shown for this option so that we don't pesker users.
 */
const guardOptions = {
  relaunch: new Map<string, boolean>([
    [ 'appLang', false ],
    [ 'window.nativeAppearance', false ],
    [ 'window.vibrancy', false ],
    [ 'watchdog.activatePolling', false ],
    [ 'export.useBundledPandoc', false ],
    [ 'zkn.idRE', false ]
  ]),
  // The following options additionally require a clearing of the cache
  clearCache: new Map<string, boolean>([
    [ 'zkn.idRE', false ]
  ])
}

/**
 * This class represents the configuration of Zettlr, represented by the
 * config.json file in the user's data directory as well as some environment
 * variables. Basically, this class tells Zettlr what the user wants and what
 * the environment Zettlr is running in is capable of.
 */
export default class ConfigProvider extends ProviderContract {
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
   * Holds the data container responsible for writing the data to disk
   *
   * @var {PersistentDataContainer}
   */
  private readonly _container: PersistentDataContainer

  private readonly _emitter: EventEmitter

  /**
    * Preset sane defaults, then load the config and perform a system check.
    * @param {Zettlr} parent Parent Zettlr object.
    */
  constructor (private readonly _logger: LogProvider) {
    super()
    this.configFile = path.join(app.getPath('userData'), 'config.json')

    this._emitter = new EventEmitter() // Initiate the emitter

    this.config = getConfigTemplate()
    this._rules = [] // This array holds all validation rules
    this._firstStart = false // Only true if a config file has been created
    this._newVersion = false // True if the last read config had a different version

    this._container = new PersistentDataContainer(this.configFile, 'json')

    // Listen for renderer events. These must be synchronous.
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
        for (const opt in payload) {
          this.set(opt, payload[opt])
        }
        return true
      }
    })
  }

  isFirstStart (): boolean {
    return this._firstStart
  }

  newVersionDetected (): boolean {
    return this._newVersion
  }

  /**
   * Shutdown the service provider -- here save the config to disk
   * @return {Boolean} Returns true after successful shutdown.
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Config provider shutting down ...')
    this._container.shutdown()
  }

  /**
   * Boots the provider
   */
  async boot (): Promise<void> {
    this._logger.verbose('Config provider booting up ...')

    if (!await this._container.isInitialized()) {
      this._logger.info('No configuration detected: Assuming first start and new version!')
      // The config is not yet initialized, so we know this is a firstStart.
      this._firstStart = true
      this._newVersion = true
      await this._container.init(this.config)
    } else {
      this._logger.verbose('Loading configuration ...')
      // The container has already been initialized, so it's not a first start.
      // Pull in the config and do our thing.
      const readConfig = await this._container.get()

      // Determine if this is a different version
      this._newVersion = readConfig.version !== this.config.version
      // NOTE: We cannot use "update" here because we cannot yet broadcast any
      // events, so we have to use safeAssign directly.
      this.config = safeAssign(readConfig, this.config)

      // Don't forget to update the version
      if (this._newVersion) {
        this._logger.info(`Migrating from ${String(readConfig.version)} to ${String(this.config.version)}!`)
        this.config.version = ZETTLR_VERSION // We should not emit events here, so manually set the value
      }
    }

    // Run potential migrations if applicable.
    this.runMigrations()

    // Remove potential dead links to non-existent files and dirs
    this.checkPaths()

    // Immediately begin loading the translation strings. These have to be
    // available directly after the config has been loaded.
    const file = await loadData(this.config.appLang)
    // It may be that only a fallback has been provided or else. In this case we
    // must update the config to reflect this.
    if (file.tag !== this.config.appLang) {
      this.config.appLang = file.tag
    }

    // Boot up the validation rules
    for (let i = 0; i < VALIDATE_RULES.length; i++) {
      this._rules.push(new ValidationRule(VALIDATE_RULES[i], VALIDATE_PROPERTIES[i]))
    }
  }

  // Enable global event listening to updates of the config
  on (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.on(evt, callback)
  }

  // Also do the same for the removal of listeners
  off (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.off(evt, callback)
  }

  /**
    * This function runs a general check and runs any potential migrations.
    * @return {ZettlrConfig} This for chainability.
    */
  runMigrations (): this {
    const replacements = this.config.editor.autoCorrect.replacements as any
    if (isIterable(replacements) && replacements != null) {
      // In 1.8.7 the replacements were provided as key-val pairs, but we've since
      // moved to key-value since it's more verbose. So we need to make sure these
      // conform to the new rules.
      for (const entry of replacements) {
        if ('val' in entry && !('value' in entry)) {
          this._logger.info(`[Config Provider] Migrating Autocorrect replacement ${entry.key as string} from 'val' to 'value' ...`)
          entry.value = entry.val
          delete entry.val
        }
      }
      this._container.set(this.config)
    } else if (replacements != null) {
      // Previous versions stored the replacements as objects of the form
      // { "-->": "→", ... }
      const newReplacements: Array<{ key: string, value: string }> = []
      for (const [ key, value ] of Object.entries(replacements)) {
        if (typeof value === 'string') {
          newReplacements.push({ key, value })
        }
      }
      this.config.editor.autoCorrect.replacements = newReplacements
      this._container.set(this.config)
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
    this.sortPaths()

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
   * This function ensures that all root paths are consolidated, i.e., have no
   * overlaps. In other words, this function will remove any root paths that are
   * contained by any of the other roots. This will help prevent any
   * inconsistencies when a root file is part of a loaded workspace, or some
   * workspace is loaded as part of another workspace.
   */
  private consolidateRootPaths (): void {
    // First, retrieve all root files
    for (const thisRoot of this.config.openPaths) {
      for (const otherRoot of this.config.openPaths) {
        if (otherRoot.startsWith(thisRoot) && otherRoot !== thisRoot) {
          this.config.openPaths.splice(this.config.openPaths.indexOf(thisRoot), 1)
          break
        }
      }
    }
  }

  /**
    * Sorts the paths prior to using them alphabetically and by type.
    * @return {ZettlrConfig} Chainability.
    */
  private sortPaths (): void {
    const f = []
    const d = []
    for (const p of this.config.openPaths) {
      if (isDir(p)) {
        d.push(p)
      } else {
        f.push(p)
      }
    }

    // We only want to sort the paths based on rudimentary, natural order.
    const coll = new Intl.Collator([ this.get('appLang'), 'en' ], { numeric: true })
    f.sort((a, b) => {
      return coll.compare(path.basename(a), path.basename(b))
    })
    d.sort((a, b) => {
      return coll.compare(path.basename(a), path.basename(b))
    })

    this.config.openPaths = f.concat(d)
    this._container.set(this.config)
  }

  /**
    * Adds a path to be opened on startup
    * @param {String} p The path to be added
    * @return {Boolean} True, if the path was successfully added, else false.
    */
  addPath (p: string): boolean {
    // Only add valid and unique paths
    if ((!ignoreFile(p) || isDir(p)) && !this.config.openPaths.includes(p)) {
      this.config.openPaths.push(p)
      this.consolidateRootPaths()
      this.sortPaths()
      this._container.set(this.config)
      this._emitter.emit('update', 'openPaths')
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
      this._container.set(this.config)
      this._emitter.emit('update', 'openPaths')
      return true
    }
    return false
  }

  /**
    * Returns a config property
    *
    * @param  {string}             attr  The property to return
    * @return {any|ConfigOptions}        Either the config property or null
    */
  get (): ConfigOptions
  get (attr: string): any
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
          this._logger.warning(`[Config Provider] Someone has requested a non-existent key: ${attr}`)
          return null // The config option must match exactly
        }
      }

      return cfg // Now not the requested config option.
    }

    // Plain attribute requested
    if (attr in this.config) {
      return this.config[attr as keyof ConfigOptions]
    } else {
      this._logger.warning(`[Config Provider] Someone has requested a non-existent key: ${attr}`)
      return null
    }
  }

  /**
    * Simply returns the complete config object.
    *
    * @return {ConfigOptions} The configuration object.
    */
  getConfig (): ConfigOptions {
    return this.config
  }

  /**
    * Sets a configuration option
    * @param  {string}  option  The option to be set
    * @param  {any}     value   The value of the config variable.
    */
  set (option: string, value: any): void {
    // Don't add non-existent options
    if (option in this.config && this._validate(option, value)) {
      // Do not set the option if it already has the requested value
      if (this.config[option as keyof ConfigOptions] === value) {
        return
      }

      // Set the new value and inform the listeners
      // @ts-expect-error Since we're dynamically assigning a value here.
      this.config[option as keyof ConfigOptions] = value
      this._container.set(this.config)
      this._emitter.emit('update', option)
      broadcastIpcMessage('config-provider', { command: 'update', payload: option })
      this.checkOptionForGuard(option)
    } else if (option.indexOf('.') > 0) {
      // A nested argument was requested, so iterate until we find it
      let nested = option.split('.')
      // Last one must be set manually, b/c simple attributes aren't pointers
      let prop = nested.pop() as string // We can be sure it's not undefined
      let cfg = this.config
      for (let arg of nested) {
        if (arg in cfg) {
          cfg = cfg[arg as keyof ConfigOptions] as unknown as any
        } else {
          return // The config option must match exactly
        }
      }

      // Set the nested property
      if (prop in cfg && this._validate(option, value)) {
        // Do not set the option if it already has the requested value
        if (cfg[prop as keyof ConfigOptions] === value) {
          return
        }

        // Set the new value and inform the listeners
        // @ts-expect-error Since we're dynamically assigning a value here
        cfg[prop as keyof ConfigOptions] = value
        this._container.set(this.config)
        this._emitter.emit('update', option)
        broadcastIpcMessage('config-provider', { command: 'update', payload: option })
        this.checkOptionForGuard(option)
      }
    }
  }

  /**
   * After setting an option, this function can check if the option is guarded.
   * In that case, the app will automatically ask the user if they want to
   * restart now.
   *
   * @param   {string}  option  The option to check
   */
  private checkOptionForGuard (option: string): void {
    // If the option is not guarded or the dialog has already been asked,
    // quietly return.
    const opt = guardOptions.relaunch.get(option)
    if (opt === undefined || opt) {
      return
    }

    guardOptions.relaunch.set(option, true)

    dialog.showMessageBox({
      message: trans('Changing this option requires a restart to take effect.'),
      type: 'warning',
      buttons: [
        trans('Restart now'),
        trans('Restart later')
      ],
      defaultId: 0,
      cancelId: 1,
      title: trans('Confirm')
    })
      .then(({ response }) => {
        if (response === 0) {
          // The user wants to restart now
          if (guardOptions.clearCache.has(option)) {
            // Ensure the cache is cleared on relaunch
            app.relaunch({ args: process.argv.slice(1).concat(['--clear-cache']) })
          } else {
            app.relaunch()
          }
          app.quit()
        }
      })
      .catch(err => console.error(err))
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
    this._emitter.emit('update') // Emit an event to all listeners
    // Broadcast to all open windows
    broadcastIpcMessage('config-provider', { command: 'update', payload: undefined })
    this._container.set(this.config)
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

function isIterable (value: any): boolean {
  return Symbol.iterator in Object(value)
}
