/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DocumentManager
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This controller represents all open files that are displayed
 *                  in the app. It will stay in sync with the configuration's
 *                  open files setting and emit events as necessary. The
 *                  renderer's equivalent is the editor and the tabs.
 *
 * END HEADER
 */

import EventEmitter from 'events'
import path from 'path'
import { promises as fs } from 'fs'
import { FSALCodeFile, FSALFile } from '@providers/fsal'
import ProviderContract from '@providers/provider-contract'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import AppServiceContainer from 'source/app/app-service-container'
import { ipcMain, app } from 'electron'
import { DocumentTree, DTLeaf } from '@common/modules/document-tree'
import ConfigFileContainer from '@common/modules/config-file-container'
import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'
import { TabManager } from '@common/modules/document-tree/tab-manager'
import { DP_EVENTS, OpenDocument } from '@dts/common/documents'
import { v4 as uuid4 } from 'uuid'
import chokidar from 'chokidar'
import { CodeFileDescriptor, MDFileDescriptor } from '@dts/main/fsal'

interface DocumentWindows { [windowId: string]: DocumentTree }

export default class DocumentManager extends ProviderContract {
  /**
   * This array holds all open windows, here represented as document trees
   *
   * @var {DocumentTree[]}
   */
  private readonly _windows: DocumentWindows
  /**
   * The event emitter helps broadcast events across the main process
   *
   * @var {EventEmitter}
   */
  private readonly _emitter: EventEmitter
  /**
   * The config file container persists the document tree data to disk so that
   * open editor panes & windows can be restored
   *
   * @var {ConfigFileContainer}
   */
  private readonly _config: ConfigFileContainer
  /**
   * Modified files are application-global: Whenever a file is modified anywhere
   * in the application, this array is being updated so that changes can be
   * propagated across windows. They are being held in a Map. The keys are the
   * filepaths as well as the last modification time, the values the most recent
   * file contents.
   *
   * @var {Map<[string, number], string>}
   */
  private readonly _modifiedFiles: Map<[string, number], string>
  /**
   * The process that watches currently opened files for remote changes
   *
   * @var {chokidar.FSWatcher}
   */
  private readonly _watcher: chokidar.FSWatcher

  /**
   * Holds a list of strings for files that have recently been saved by the
   * user. For those files, we need to ignore remote changes since they
   * originate here.
   *
   * @var {string[]}
   */
  private readonly _ignoreChanges: string[]

  /**
   * This array allows us to prevent showing multiple "Reload changes?" dialogs
   * for a single file open in the app.
   *
   * @var {string[]}
   */
  private readonly _remoteChangeDialogShownFor: string[]

  constructor (private readonly _app: AppServiceContainer) {
    super()

    this._windows = {}
    this._emitter = new EventEmitter()
    this._config = new ConfigFileContainer(path.join(app.getPath('userData'), 'documents.yaml'), 'yaml')
    this._modifiedFiles = new Map()
    this._ignoreChanges = []
    this._remoteChangeDialogShownFor = []

    const options: chokidar.WatchOptions = {
      persistent: true,
      ignoreInitial: true, // Do not track the initial watch as changes
      followSymlinks: true, // Follow symlinks
      ignorePermissionErrors: true, // In the worst case one has to reboot the software, but so it looks nicer.
      // See the description for the next vars in the fsal-watchdog.ts
      interval: 5000,
      binaryInterval: 5000
    }

    if (this._app.config.get('watchdog.activatePolling') as boolean) {
      let threshold: number = this._app.config.get('watchdog.stabilityThreshold')
      if (typeof threshold !== 'number' || threshold < 0) {
        threshold = 1000
      }

      // From chokidar docs: "[...] in some cases some change events will be
      // emitted while the file is being written." --> hence activate this.
      options.awaitWriteFinish = {
        stabilityThreshold: threshold,
        pollInterval: 100
      }

      this._app.log.info(`[DocumentManager] Activating file polling with a threshold of ${threshold}ms.`)
    }

    // Start up the chokidar process
    this._watcher = new chokidar.FSWatcher(options)

    this._watcher.on('all', (event: string, filePath: string) => {
      if (this._ignoreChanges.includes(filePath)) {
        this._ignoreChanges.splice(this._ignoreChanges.indexOf(filePath), 1)
        return
      }

      if (event === 'unlink') {
        // Close the file everywhere
        this.closeFileEverywhere(filePath)
      } else if (event === 'change') {
        this.handleRemoteChange(filePath).catch(err => console.error(err))
      } else {
        this._app.log.warning(`[DocumentManager] Received unexpected event ${event} for ${filePath}.`)
      }
    })

    // Finally, listen to events from the renderer
    ipcMain.handle('documents-provider', async (event, { command, payload }) => {
      switch (command) {
        // A given tab should be set as pinned
        case 'set-pinned': {
          const windowId = payload.windowId as string
          const leafID = payload.leafId as string
          const filePath = payload.path as string
          const shouldBePinned = payload.pinned as boolean
          this.setPinnedStatus(windowId, leafID, filePath, shouldBePinned)
          return
        }
        // Some main window has requested its tab/split view state
        case 'retrieve-tab-config': {
          return this._windows[payload.windowId].toJSON()
        }
        case 'save-file': {
          const windowId = payload.windowId as string
          const leafId = payload.leafId as string
          const filePath = payload.path as string
          const contents = payload.contents as string
          const result = await this.saveFile(windowId, leafId, filePath, contents)
          if (result) {
            this._app.stats.updateWordCount(payload.offsetWordCount as number)
          }
          return result
        }
        case 'open-file': {
          return await this.openFile(payload.windowId, payload.leafId, payload.path, payload.newTab)
        }
        case 'close-file': {
          const leafId = payload.leafId as string
          const windowId = payload.windowId as string
          const filePath = payload.path as string
          return await this.closeFile(windowId, leafId, filePath)
        }
        case 'sort-open-files': {
          const leafId = payload.leafId as string
          const windowId = payload.windowId as string
          const newOrder = payload.newOrder as string[]
          this.sortOpenFiles(windowId, leafId, newOrder)
          return
        }
        case 'update-file-modification-status': {
          const filePath = payload.path as string
          const timestamp = payload.timestamp as number
          const contents = payload.contents as string
          const isClean = payload.isClean as boolean

          if (isClean) {
            this.markClean(filePath)
          } else {
            this.markDirty(filePath, timestamp, contents)
          }
          return
        }
        case 'get-file-modification-status': {
          return this._modifiedFiles
        }
        case 'move-file': {
          const oWin = payload.originWindow
          const tWin = payload.targetWindow
          const oLeaf = payload.originLeaf
          const tLeaf = payload.targetLeaf
          const filePath = payload.path
          return await this.moveFile(oWin, tWin, oLeaf, tLeaf, filePath)
        }
        case 'split-leaf': {
          const oWin = payload.originWindow
          const oLeaf = payload.originLeaf
          const direction = payload.direction
          const insertion = payload.insertion
          const filePath = payload.path // Optional, may be undefined
          const fromWindow = payload.fromWindow // Optional, may be undefined
          const fromLeaf = payload.fromLeaf // Otional, may be undefined
          return await this.splitLeaf(oWin, oLeaf, direction, insertion, filePath, fromWindow, fromLeaf)
        }
        case 'close-leaf': {
          return this.closeLeaf(payload.windowId, payload.leafId)
        }
        case 'set-branch-sizes': {
          // NOTE that in this particular instance we do not emit an event. The
          // reason is that we need to prevent frequent reloads during resizing.
          // For as long as the window is open, the window will have the correct
          // sizes, and will only update those sizes here in the main process.
          // As soon as the window is closed, however, it will automatically
          // grab the correct sizes again.
          const branch = this._windows[payload.windowId].findBranch(payload.branchId)
          if (branch !== undefined) {
            branch.sizes = payload.sizes
            this.syncToConfig()
          }
          return
        }
        case 'navigate-forward': {
          return await this.navigateForward(payload.windowId, payload.leafId)
        }
        case 'navigate-back': {
          return await this.navigateBack(payload.windowId, payload.leafId)
        }
      }
    })
  } // END constructor

  async boot (): Promise<void> {
    // Loads in all openFiles
    this._app.log.verbose('Document Manager starting up ...')

    // Check if the data store is initialized
    if (!await this._config.isInitialized()) {
      this._app.log.info('[Document Manager] Initializing document storage ...')
      const tree = new DocumentTree()
      const key = uuid4()
      await this._config.init({ [key]: tree.toJSON() })
    }

    const treedata: DocumentWindows = await this._config.get()
    for (const key in treedata) {
      try {
        this._windows[key] = await DocumentTree.fromJSON(treedata[key])
        this.broadcastEvent(DP_EVENTS.NEW_WINDOW, { key })
      } catch (err: any) {
        this._app.log.error(`[Document Provider] Could not instantiate window ${key}: ${err.message as string}`, err)
      }
    }

    if (Object.keys(treedata).length === 0) {
      this._app.log.warning('[Document Manager] Creating new window since all are closed.')
      const key = uuid4()
      this._windows[key] = new DocumentTree()
      this.broadcastEvent(DP_EVENTS.NEW_WINDOW, { key })
    }

    this.syncWatchedFilePaths()
    await this.synchronizeDatabases()

    this._app.log.info(`[Document Manager] Restored ${this.windowCount()} open windows.`)
    this.syncToConfig()
  }

  public windowCount (): number {
    return Object.keys(this._windows).length
  }

  public windowKeys (): string[] {
    return Object.keys(this._windows)
  }

  public newWindow (): void {
    const newTree = new DocumentTree()
    const existingKeys = Object.keys(this._windows)
    let key = uuid4()
    while (existingKeys.includes(key)) {
      key = uuid4()
    }

    this._windows[key] = newTree
    this.broadcastEvent(DP_EVENTS.NEW_WINDOW, { key })
    this.syncToConfig()
  }

  public closeWindow (windowId: string): void {
    if (windowId in this._windows) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this._windows[windowId]
      this.syncToConfig()
    }
  }

  // Enable global event listening to updates of the config
  on (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.on(evt, callback)
  }

  once (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.once(evt, callback)
  }

  // Also do the same for the removal of listeners
  off (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.off(evt, callback)
  }

  async shutdown (): Promise<void> {
    this._config.shutdown()
  }

  private broadcastEvent (event: DP_EVENTS, context?: any): void {
    // Here we blast an event notification across every line of code of the app
    broadcastIpcMessage('documents-update', { event, context: context })
    this._emitter.emit(event, context)
  }

  /**
   * This function searches all currently opened documents for files that have
   * databases attached to them, and announces to the citeproc provider that it
   * should keep those available. Resolves once the citeproc provider finished
   * synchronizing.
   */
  private async synchronizeDatabases (): Promise<void> {
    // First get a list of all open files
    const allLeafs: DTLeaf[] = []
    for (const window of Object.values(this._windows)) {
      allLeafs.push(...window.getAllLeafs())
    }

    const openFiles: string[] = allLeafs.map(leaf => {
      return leaf.tabMan.openFiles.map(doc => doc.path)
    }).flat() // Flatten the 2d-array

    const libraries: string[] = []

    for (const filePath of openFiles) {
      let descriptor = this._app.fsal.find(filePath)
      if (descriptor === undefined) {
        // This is why we require every open document to be also loaded in the
        // FSAL: There, we can simply grab it from the tree, instead of having
        // to parse the file again (which is more computationally expensive).
        this._app.log.error(`[Documents Provider] Error during database sync: Did not find ${filePath} in FSAL, even though it's loaded here. This indicates a logical bug. Please report this.`)
        descriptor = await this.loadFile(filePath)
      }

      if (descriptor.type !== 'file') {
        continue
      }

      if (descriptor.frontmatter !== null && 'bibliography' in descriptor.frontmatter) {
        const bib = descriptor.frontmatter.bibliography
        if (typeof bib === 'string' && path.isAbsolute(bib)) {
          libraries.push(bib)
        }
      }
    }

    await this._app.citeproc.synchronizeDatabases(libraries)
  }

  /**
   * Returns a file's metadata including the contents.
   *
   * @param  {string}  file   The absolute file path
   * @param  {boolean} newTab Optional. If true, will always prevent exchanging the currently active file.
   *
   * @return {Promise<MDFileDescriptor|CodeFileDescriptor>} The file's descriptor
   */
  public async openFile (windowId: string, leafId: string|undefined, filePath: string, newTab?: boolean, modifyHistory?: boolean): Promise<boolean> {
    const avoidNewTabs = Boolean(this._app.config.get('system.avoidNewTabs'))
    let leaf: DTLeaf|undefined
    if (leafId === undefined) {
      // Take the first leaf of the given window
      leaf = this._windows[windowId].getAllLeafs()[0]
    } else {
      leaf = this._windows[windowId].findLeaf(leafId)
    }

    if (leaf === undefined) {
      return false
    }

    // Now we definitely know the leaf ID if it was undefined
    if (leafId === undefined) {
      leafId = leaf.id
    }

    if (leaf.tabMan.openFiles.map(x => x.path).includes(filePath)) {
      // File is already open -> simply set it as active
      // leaf.tabMan.activeFile = filePath
      await leaf.tabMan.openFile(filePath)
      this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId, filePath })
      return true
    }

    // TODO: Make sure the active file is not modified!
    // Close the (formerly active) file if we should avoid new tabs and have not
    // gotten a specific request to open it in a *new* tab
    const activeFile = leaf.tabMan.activeFile
    const ret = await leaf.tabMan.openFile(filePath)

    if (activeFile !== null && avoidNewTabs && newTab !== true && !this.isModified(activeFile.path)) {
      leaf.tabMan.closeFile(activeFile)
      this.syncWatchedFilePaths()
      this.broadcastEvent(DP_EVENTS.CLOSE_FILE, { windowId, leafId, filePath })
      this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId, filePath: leaf.tabMan.activeFile?.path })
    }
    if (ret) {
      this.broadcastEvent(DP_EVENTS.OPEN_FILE, { windowId, leafId, filePath })
    }

    this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId, filePath: leaf.tabMan.activeFile?.path })
    await this.synchronizeDatabases()
    this.syncToConfig()
    return ret
  }

  /**
   * Closes the given file if it's in fact open. This function deals with every
   * potential problem such as retrieving user consent to closing the file if it
   * is modified.
   *
   * @param   {MDFileDescriptor|CodeFileDescriptor}  file  The file to be closed
   *
   * @return  {boolean}                                    Whether or not the file was closed
   */
  public async closeFile (windowId: string, leafId: string, filePath: string): Promise<boolean> {
    const leaf = this._windows[windowId].findLeaf(leafId)
    if (leaf === undefined) {
      this._app.log.error(`[Document Manager] Could not close file ${filePath}: Editor pane not found.`)
      return false
    }

    const openFile = leaf.tabMan.openFiles.find(f => f.path === filePath)

    if (openFile === undefined) {
      return false
    }

    if (this.isModified(filePath)) {
      const result = await this._app.windows.askSaveChanges()
      // 0 = 'Close without saving changes',
      // 1 = 'Save changes'
      if (result.response === 0) {
        // Clear the modification flag
        this.markClean(filePath)
        // Mark the whole application as clean if applicable
        // TODO: Implement event based in the window provider
        // this._app.windows.setModified(!this._app.documents.isClean())
      } else if (result.response === 1) {
        // The following code looks horrible, but it solves the problem quite
        // elegantly: Since we are in an asynchronous function, we can actually
        // pause execution of this function until the file has been saved. To
        // do this, we create a new promise and, inside that, listen to the
        // document-modified-changed event of the document manager, which is
        // being emitted everytime something in the modification status has
        // changed. This happens if a file is being saved. To prevent *other*
        // files from resolving the promise, we will explicitly check if the
        // event has been emitted specifically in response to a successful
        // save of our file here.
        await new Promise<void>((resolve, reject) => {
          const callback = (): void => {
            // The document manager has access to the same object, so just wait
            // until the document manager sets the file.modified flag to false.
            if (!this.isModified(filePath)) {
              // Always remember to clean up 🧹
              this.off(DP_EVENTS.CHANGE_FILE_STATUS, callback)
              resolve()
            }
          }
          this.on(DP_EVENTS.CHANGE_FILE_STATUS, callback)

          // Tell the renderer to actually save our file.
          broadcastIpcMessage('save-documents', [filePath])

          // Failsafe: Reject if the file in question hasn't been saved after
          // 5 seconds. Even the slowest of computers should be able to save a
          // plain text file in that amount of time.
          setTimeout(() => { reject(new Error(`[Document Manager] Could not automatically save file ${filePath}`)) }, 5000)
        })
      } else {
        // Don't close the file
        this._app.log.info('[Document Manager] Not closing file, as the user did not want that.')
        return false
      }
    }

    if (leaf !== undefined) {
      const ret = leaf.tabMan.closeFile(filePath)
      if (ret) {
        this.syncToConfig()
        this.syncWatchedFilePaths()
        this.broadcastEvent(DP_EVENTS.CLOSE_FILE, { windowId, leafId, filePath })
        this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId, filePath: leaf.tabMan.activeFile?.path })
        if (leaf.tabMan.openFiles.length === 0) {
          // Remove this leaf
          leaf.parent.removeNode(leaf)
          this.broadcastEvent(DP_EVENTS.LEAF_CLOSED, { windowId, leafId })
          this.syncToConfig()
        }

        await this.synchronizeDatabases()
      }
      return ret
    }

    return false
  }

  /**
   * Directs every open leaf to close a given file. This function even
   * overwrites potential stati such as modification or pinned to ensure files
   * are definitely closed. This will be called from within the watcher callback
   * on an `unlink` event.
   *
   * @param   {string}  filePath  The file path in question
   */
  private closeFileEverywhere (filePath: string): void {
    for (const key in this._windows) {
      const allLeafs = this._windows[key].getAllLeafs()
      for (const leaf of allLeafs) {
        if (leaf.tabMan.openFiles.map(x => x.path).includes(filePath)) {
          leaf.tabMan.setPinnedStatus(filePath, false)
          const success = leaf.tabMan.closeFile(filePath)
          if (success) {
            // TODO: EMIT EVENTS
          }
        }
      }
    }

    this.syncWatchedFilePaths()
  }

  /**
   * This function handles a remote change, i.e. where the watcher has reported
   * that the file has been changed remotely.
   *
   * @param   {string}  filePath  The file in question
   */
  private async handleRemoteChange (filePath: string): Promise<void> {
    // First thing we have to look up is: Did the file really change? Then, we
    // have to update the file descriptors across all leafs and broadcast an event.
    const openFiles: OpenDocument[] = []
    for (const key in this._windows) {
      const allLeafs = this._windows[key].getAllLeafs()
      for (const leaf of allLeafs) {
        openFiles.push(...leaf.tabMan.openFiles.filter(x => x.path === filePath))
      }
    }

    // Sanity check: Check all modtimes
    const allModtimes: number[] = openFiles.map(x => x.modtime)
    if (!allModtimes.every(val => val === allModtimes[0])) {
      this._app.log.error('[Document Manager] The same file has different modtimes across all leafs. This is a logical bug.')
    }

    const ourModtime = Math.max(...allModtimes) // Get the most recent modtime

    const stat = await fs.lstat(filePath)
    const modtime = stat.mtime.getTime()
    // In response to issue #1621: We will not check for equal modtime but only
    // for newer modtime to prevent sluggish cloud synchronization services
    // (e.g. OneDrive and Box) from having text appear to "jump" from time to time.
    if (modtime > ourModtime) {
      // Now what we have to do is (a) update the modtimes of every OpenDocument.
      // Since these are all pointers we can literally do a forEach. (b) react
      // to that change.
      openFiles.forEach(doc => { doc.modtime = modtime })
      // Notify the caller, that the file has actually changed on disk.
      // The contents of one of the open files have changed.
      // What follows looks a bit ugly, welcome to callback hell.
      if (this._app.config.get('alwaysReloadFiles') === true) {
        await this.notifyRemoteChange(filePath)
      } else {
        // Prevent multiple instances of the dialog, just ask once. The logic
        // always retrieves the most recent version either way
        if (this._remoteChangeDialogShownFor.includes(filePath)) {
          return
        }
        this._remoteChangeDialogShownFor.push(filePath)

        // Ask the user if we should replace the file
        const shouldReplace = await this._app.windows.shouldReplaceFile(filePath)
        // In any case remove the isShownFor for this file.
        this._remoteChangeDialogShownFor.splice(this._remoteChangeDialogShownFor.indexOf(filePath), 1)
        if (!shouldReplace) {
          return
        }

        await this.notifyRemoteChange(filePath)
      }
    }
  }

  /**
   * This function ensures that our watcher keeps watching the correct files
   */
  private syncWatchedFilePaths (): void {
    // First, get the files currently watched
    const watchedFiles = Object.values(this._watcher.getWatched()).flat()

    // Second, get all open files
    const openFiles: string[] = []
    for (const key in this._windows) {
      const allLeafs = this._windows[key].getAllLeafs()
      for (const leaf of allLeafs) {
        openFiles.push(...leaf.tabMan.openFiles.map(x => x.path))
      }
    }

    // Third, remove those watched files which are no longer open
    for (const watchedFile of watchedFiles) {
      if (!openFiles.includes(watchedFile)) {
        this._watcher.unwatch(watchedFile)
      }
    }

    // Fourth, add those open files not yet watched
    for (const openFile of openFiles) {
      if (!watchedFiles.includes(openFile)) {
        this._watcher.add(openFile)
      }
    }
  }

  /**
   * This is a convenience function meant for operations that affect every
   * editor pane across the whole application, such as renaming files, removing
   * directories, and other things. It will iterate over every open editor pane
   * and call the provided callback function, providing the tab manager for the
   * pane in question. Since some operations require async, the whole function
   * works asynchronously.
   *
   * The callback function MUST return a boolean indicating whether the state of
   * any pane has changed. If it has, the function will make sure to emit
   * appropriate events. If you do not honor this, any changes to the internal
   * state will not be picked up by the appropriate places.
   *
   * @param   {(tabMan: TabManager) => Promise<boolean>}  callback  The callback
   */
  public async forEachLeaf (callback: (tabMan: TabManager) => Promise<boolean>): Promise<void> {
    for (const windowId in this._windows) {
      for (const leaf of this._windows[windowId].getAllLeafs()) {
        const stateHasChanged = await callback(leaf.tabMan)
        if (stateHasChanged) {
          this.syncToConfig()
        }
      }
    }
  }

  /**
   * This method synchronizes the state of the loadedDocuments array into the
   * configuration. It also makes sure to announce changes to whomever it may
   * concern.
   */
  private syncToConfig (): void {
    const toSave: any = {}
    for (const key in this._windows) {
      toSave[key] = this._windows[key].toJSON()
    }
    this._config.set(toSave)
  }

  /**
   * Sets the pinned status for the given file.
   *
   * @param   {string}   filePath        The absolute path to the file
   * @param   {boolean}  shouldBePinned  Whether the file should be pinned.
   */
  private setPinnedStatus (windowId: string, leafId: string, filePath: string, shouldBePinned: boolean): void {
    const leaf = this._windows[windowId].findLeaf(leafId)
    if (leaf === undefined) {
      return
    }

    leaf.tabMan.setPinnedStatus(filePath, shouldBePinned)
    this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { windowId, leafId, filePath, status: 'pinned' })
    this.syncToConfig()
  }

  /**
   * Broadcasts a remote changed event across the app to notify everyone that a
   * file has been remotely changed.
   *
   * @param {string} filePath The file in question
   */
  public async notifyRemoteChange (filePath: string): Promise<void> {
    if (hasMarkdownExt(filePath)) {
      const descriptor = await FSALFile.parse(
        filePath,
        null,
        this._app.fsal.getMarkdownFileParser(),
        this._app.targets,
        this._app.tags
      )
      const returnFile = FSALFile.metadata(descriptor)
      returnFile.content = await FSALFile.load(descriptor)
      this.broadcastEvent(DP_EVENTS.FILE_REMOTELY_CHANGED, { filePath, descriptor: returnFile })
    } else {
      const descriptor = await FSALCodeFile.parse(filePath, null)
      const returnFile = FSALCodeFile.metadata(descriptor)
      returnFile.content = await FSALCodeFile.load(descriptor)
      this.broadcastEvent(DP_EVENTS.FILE_REMOTELY_CHANGED, { filePath, descriptor: returnFile })
    }
  }

  /**
   * Sets the given descriptor as active file.
   *
   * @param {MDFileDescriptor|CodeFileDescriptor|null} descriptorPath The descriptor to make active file
   */
  public setActiveFile (windowId: string, leafId: string, filePath: string|null): void {
    const leaf = this._windows[windowId].findLeaf(leafId)
    if (leaf === undefined) {
      return
    }

    leaf.tabMan.activeFile = filePath
    this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId, filePath })
    this.syncToConfig()
  }

  public sortOpenFiles (windowId: string, leafId: string, newOrder: string[]): void {
    const leaf = this._windows[windowId].findLeaf(leafId)
    if (leaf === undefined) {
      return
    }

    const res = leaf.tabMan.sortOpenFiles(newOrder)
    if (res) {
      this.broadcastEvent(DP_EVENTS.FILES_SORTED, { windowId, leafId })
      this.syncToConfig()
    }
  }

  /**
   * Using this function, one can move a given file from one editor pane to
   * another -- even across windows.
   *
   * @param {number} originWindow The originating window
   * @param {number} targetWindow The target window
   * @param {string} originLeaf   The origin pane in the origin window
   * @param {string} targetLeaf   The target pane in the target window
   * @param {string} filePath     The file to be moved
   */
  public async moveFile (
    originWindow: string,
    targetWindow: string,
    originLeaf: string,
    targetLeaf: string,
    filePath: string
  ): Promise<void> {
    // The user has requested to move a file. This basically just means closing
    // the file in the origin, and opening it in the target
    const origin = this._windows[originWindow].findLeaf(originLeaf)
    const target = this._windows[targetWindow].findLeaf(targetLeaf)

    if (origin === undefined || target === undefined) {
      this._app.log.error(`[Document Manager] Received a move request from ${originLeaf} to ${targetLeaf} but one of those was undefined.`)
      return
    }

    // First open the file in the target
    let success = await target.tabMan.openFile(filePath)
    if (success) {
      this.broadcastEvent(DP_EVENTS.OPEN_FILE, { windowId: targetWindow, leafId: targetLeaf, filePath })
      this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId: targetWindow, leafId: targetLeaf })
      this.syncToConfig()
    }

    // Then decide if we should close the leaf ...
    if (origin.tabMan.openFiles.length === 1) {
      // Close the leaf instead
      this.closeLeaf(originWindow, originLeaf)
      this.syncToConfig()
    } else {
      // ... or rather just close the file
      success = origin.tabMan.closeFile(filePath)
      if (!success) {
        this._app.log.error(`[Document Manager] Could not fulfill move request for file ${filePath}: Could not close it.`)
        return
      }

      this.broadcastEvent(DP_EVENTS.CLOSE_FILE, { windowId: originWindow, leafId: originLeaf, filePath })
      this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId: originWindow, leafId: originLeaf })
      this.syncToConfig()
    }
  }

  /**
   * Splits the given origin leaf along the direction. Optionally, you can also
   * direct the document manager to immediately move a file from the origin to
   * the to-be-created leaf to fill it with content.
   *
   * @param {number} originWindow   The originating window
   * @param {string} originLeaf     The origin pane in the origin window
   * @param {string} splitDirection The direction of the split (horizontal or vertical)
   * @param {string} insertion      Where to insert the new leaf (defaults to after)
   * @param {string} filePath       Optional: the file to be moved
   * @param {number} fromWindow     Optional: If the file doesn't come from origin
   * @param {string} fromLeaf       Optional: If the file doesn't come from origin
   */
  public async splitLeaf (
    originWindow: string,
    originLeaf: string,
    splitDirection: 'horizontal'|'vertical',
    insertion: 'before'|'after' = 'after',
    filePath?: string,
    fromWindow?: string,
    fromLeaf?: string
  ): Promise<void> {
    // The user has requested a split and following move of a file
    const origin = this._windows[originWindow].findLeaf(originLeaf)

    if (origin === undefined) {
      this._app.log.error(`[Document Manager] Received a split request from ${originLeaf} but could not find it.`)
      return
    }

    const target = origin.split(splitDirection, insertion)
    this.broadcastEvent(DP_EVENTS.NEW_LEAF, {
      windowId: originWindow,
      originLeaf: originLeaf,
      newLeaf: target.id,
      direction: splitDirection,
      insertion
    })

    this.syncToConfig()

    if (filePath !== undefined) {
      const win = (fromWindow !== undefined) ? fromWindow : originWindow
      const leaf = (fromLeaf !== undefined) ? fromLeaf : originLeaf
      await this.moveFile(win, originWindow, leaf, target.id, filePath)
    }
  }

  public closeLeaf (windowId: string, leafId: string): void {
    const leaf = this._windows[windowId].findLeaf(leafId)

    if (leaf !== undefined) {
      leaf.parent.removeNode(leaf)
      this.broadcastEvent(DP_EVENTS.LEAF_CLOSED, { windowId, leafId })
    }
  }

  /**
   * Returns the hash of the currently active file.
   * @returns {number|null} The hash of the active file.
   */
  public getActiveFile (leafId: string): string|null {
    for (const windowId in this._windows) {
      const leaf = this._windows[windowId].findLeaf(leafId)
      if (leaf !== undefined) {
        return leaf.tabMan.activeFile?.path ?? null
      }
    }
    return null
  }

  /**
   * Sets the modification flag on an open file
   */
  public markDirty (filePath: string, timestamp: number, contents: string): void {
    for (const key of this._modifiedFiles.keys()) {
      if (key[0] === filePath && timestamp > key[1]) {
        // The file is already marked dirty, but this one is a newer state
        this._modifiedFiles.delete(key)
        this._modifiedFiles.set([ filePath, timestamp ], contents)
        this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { filePath, status: 'modification' })
        return
      }
    }

    // If we're here, the file has not yet been marked dirty
    this._modifiedFiles.set([ filePath, timestamp ], contents)
    this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { filePath, status: 'modification' })
  }

  /**
   * Removes the modification flag on an open file
   */
  public markClean (filePath: string): void {
    for (const key of this._modifiedFiles.keys()) {
      if (key[0] === filePath) {
        this._modifiedFiles.delete(key)
        this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { filePath, status: 'modification' })
      }
    }
  }

  public markEverythingClean (): void {
    this._modifiedFiles.clear()
    this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { status: 'modification' })
  }

  public isModified (filePath: string): boolean {
    for (const [fPath] of this._modifiedFiles.keys()) {
      if (fPath === filePath) {
        return true
      }
    }

    return false
  }

  /**
   * Returns true if none of the open files have their modified flag set.
   *
   * @param  {string|number}  leafId  Can either contain a leafId or a window
   *                                  index, and returns the clean state only
   *                                  for that. If undefined, returns the total
   *                                  clean state.
   */
  public isClean (id?: string, which?: 'window'|'leaf'): boolean {
    const modPaths = Array.from(this._modifiedFiles.keys()).map(x => x[0])
    if (id === undefined) {
      // Total clean state
      for (const key in this._windows) {
        const allLeafs = this._windows[key].getAllLeafs()
        for (const leaf of allLeafs) {
          for (const file of leaf.tabMan.openFiles) {
            if (modPaths.includes(file.path)) {
              return false
            }
          }
        }
      }
    } else if (which === 'window') {
      // window-specific clean state
      const allLeafs = this._windows[id].getAllLeafs()
      for (const leaf of allLeafs) {
        for (const file of leaf.tabMan.openFiles) {
          if (modPaths.includes(file.path)) {
            return false
          }
        }
      }
    } else {
      // leaf-specific clean state
      for (const key in this._windows) {
        const leaf = this._windows[key].findLeaf(id)
        if (leaf !== undefined) {
          for (const file of leaf.tabMan.openFiles) {
            if (modPaths.includes(file.path)) {
              return false
            }
          }
        }
      }
    }

    return true
  }

  /**
   * This function will return a more recent, cached version of the given file
   * if the given file has been recently modified but not yet saved. In that
   * case, the document provider will have the most recently edited content in
   * its cache.
   *
   * @param   {string}  filePath  The file in question
   *
   * @return  {string}            A string with the file contents, or undefined
   *                              if the file has not been modified inside the
   *                              program.
   */
  public getCachedVersion (filePath: string): string|undefined {
    let candidate: string|undefined
    let timestamp: number = -Infinity

    for (const key of this._modifiedFiles.keys()) {
      if (key[0] === filePath && key[1] > timestamp) {
        candidate = this._modifiedFiles.get(key)
        timestamp = key[1]
      }
    }

    return candidate
  }

  public async navigateForward (windowId: string, leafId: string): Promise<void> {
    const leaf = this._windows[windowId].findLeaf(leafId)
    if (leaf === undefined) {
      return
    }

    await leaf.tabMan.forward()
    this.broadcastEvent(DP_EVENTS.OPEN_FILE, { windowId, leafId })
    this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId })
  }

  public async navigateBack (windowId: string, leafId: string): Promise<void> {
    const leaf = this._windows[windowId].findLeaf(leafId)
    if (leaf === undefined) {
      return
    }

    await leaf.tabMan.back()
    this.broadcastEvent(DP_EVENTS.OPEN_FILE, { windowId, leafId })
    this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId })
  }

  public async saveFile (windowId: string, leafId: string, filePath: string, contents: string): Promise<boolean> {
    const basename = path.basename(filePath)
    const leaf = this._windows[windowId].findLeaf(leafId)

    if (leaf === undefined) {
      this._app.log.error(`[Document Manager] Could not save file ${basename} since no editor pane was found.`)
      return false
    }

    this._ignoreChanges.push(filePath)

    let descriptor = await this.loadFile(filePath)
    if (descriptor.type === 'file') {
      await FSALFile.save(
        descriptor,
        contents,
        this._app.fsal.getMarkdownFileParser(),
        this._app.tags,
        null
      )
      await this.synchronizeDatabases() // The file may have gotten a library
    } else {
      await FSALCodeFile.save(descriptor, contents, null)
    }

    // At this point, notify the leaf that the file's no longer modified
    this.markClean(filePath)
    this.broadcastEvent(DP_EVENTS.FILE_SAVED, { filePath })

    return true
  }

  /**
   * Loads a file into a FSAL descriptor
   *
   * @param   {string}                    filePath  The file to load
   *
   * @return  {Promise<MDFileDescriptor>}           The descriptor
   */
  private async loadFile (filePath: string): Promise<MDFileDescriptor|CodeFileDescriptor> {
    if (hasMarkdownExt(filePath)) {
      return await FSALFile.parse(
        filePath,
        null,
        this._app.fsal.getMarkdownFileParser(),
        this._app.targets,
        this._app.tags
      )
    } else {
      return await FSALCodeFile.parse(filePath, null)
    }
  }
}
