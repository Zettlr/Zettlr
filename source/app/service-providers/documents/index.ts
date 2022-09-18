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
import { DocumentTree, DTLeaf } from './document-tree'
import PersistentDataContainer from '@common/modules/persistent-data-container'
import { TabManager } from '@providers/documents/document-tree/tab-manager'
import { DP_EVENTS, OpenDocument, DocumentType } from '@dts/common/documents'
import { v4 as uuid4 } from 'uuid'
import chokidar from 'chokidar'
import { Update } from '@codemirror/collab'
import { ChangeSet, Text } from '@codemirror/state'
import { CodeFileDescriptor, MDFileDescriptor } from '@dts/common/fsal'
import countWords from '@common/util/count-words'

interface DocumentWindows {
  [windowId: string]: DocumentTree
}

const MAX_VERSION_HISTORY = 100 // Keep no more than this many updates.

interface Document {
  // The absolute file path
  filePath: string
  // The descriptor for the file
  descriptor: MDFileDescriptor|CodeFileDescriptor
  // The type
  type: DocumentType
  // Versioning
  currentVersion: number
  minimumVersion: number
  lastSavedVersion: number // Allows to quickly check if the doc has been modified: currentVersion > lastSavedVersion
  // The updates since the file was opened
  updates: Update[]
  // The actual document content
  document: Text
  lastSavedWordCount: number // Holds the word count since the last save (for writing stats)
  lastSavedCharCount: number
}

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
   * @var {PersistentDataContainer}
   */
  private readonly _config: PersistentDataContainer
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

  /**
   * This holds all currently opened documents somewhere across the app.
   *
   * @var {Document[]}
   */
  private readonly documents: Document[]

  private _shuttingDown: boolean

  constructor (private readonly _app: AppServiceContainer) {
    super()

    const containerPath = path.join(app.getPath('userData'), 'documents.yaml')

    this._windows = {}
    this._emitter = new EventEmitter()
    this._config = new PersistentDataContainer(containerPath, 'yaml')
    this._ignoreChanges = []
    this._remoteChangeDialogShownFor = []
    this.documents = []
    this._shuttingDown = false

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

    /**
     * Hook the event listener that directly communicates with the editors
     */
    ipcMain.handle('documents-authority', async (event, { command, payload }) => {
      switch (command) {
        case 'pull-updates':
          return await this.pullUpdates(payload.filePath, payload.version)
        case 'push-updates':
          return await this.pushUpdates(payload.filePath, payload.version, payload.updates)
        case 'get-document':
          return await this.getDocument(payload.filePath)
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
          const filePath = payload.path as string
          const result = await this.saveFile(filePath)
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
        case 'get-file-modification-status': {
          return this.documents.filter(x => this.isModified(x.filePath)).map(x => x.filePath)
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

    // Listen to the before-quit event by which we make sure to only quit the
    // application if the status of possibly modified files has been cleared.
    // We listen to this event, because it will fire *before* the process
    // attempts to close the open windows, including the main window, which
    // would result in a loss of data. NOTE: The exception is the auto-updater
    // which will close the windows before this event. But because we also
    // listen to close-events on the main window, we should be able to handle
    // this, if we ever switched to the auto updater.
    app.on('before-quit', (event) => {
      if (!this.isClean()) {
        event.preventDefault()

        this._app.windows.askSaveChanges()
          .then(async result => {
            if (result.response < 2) {
              for (const document of this.documents) {
                if (result.response === 0) {
                  document.lastSavedVersion = document.currentVersion
                } else {
                  await this.saveFile(document.filePath)
                }
              }

              // TODO: Emit events that the documents are now clean, same below

              app.quit()
            } // Else: Don't quit
          })
          .catch(err => {
            this._app.log.error('[DocumentManager] Cannot ask user to save or omit changes!', err)
          })
      } else {
        this._shuttingDown = true
      }
    })
  } // END constructor

  /**
   * Use this method to ask the user whether or not the window identified with
   * the windowId may be closed. If this function returns true, the user agreed
   * to drop all changes, or there were no changes contained in the window.
   *
   * @param   {string}            windowId  The window in question
   *
   * @return  {Promise<boolean>}            Returns false if the window may not be closed
   */
  public async askUserToCloseWindow (windowId: string): Promise<boolean> {
    if (this.isClean(windowId)) {
      return true
    }

    // TODO: Check if the same (modified) files are also open in other windows.
    // If so, we can treat this window as if it contains no changes, since the
    // document is still open somewhere else.

    const result = await this._app.windows.askSaveChanges()
    if (result.response === 0) {
      // Mark everything as clean TODO: As of now this would mean that if the
      // documents are open in other windows, they would still reflect the
      // "wrong" (b/c omitted, unsaved) state!
      for (const document of this.documents) {
        document.lastSavedVersion = document.currentVersion
      }

      // If we're not shutting down, this function will only be called for when
      // the user wants to actively close a window for good
      if (!this._shuttingDown) {
        this.closeWindow(windowId)
      }

      return true
    } else if (result.response === 1) {
      // Save all docs
      for (const document of this.documents) {
        await this.saveFile(document.filePath)
      }

      // If we're not shutting down, this function will only be called for when
      // the user wants to actively close a window for good
      if (!this._shuttingDown) {
        this.closeWindow(windowId)
      }

      return true
    } else {
      return false
    }
  }

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
        this._windows[key] = DocumentTree.fromJSON(treedata[key])
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

  public leafIds (windowId: string): string[] {
    if (!(windowId in this._windows)) {
      return []
    }

    return this._windows[windowId].getAllLeafs().map(leaf => leaf.id)
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
    if (this._shuttingDown) {
      return // During shutdown only the WindowManager should close windows
    }

    if (windowId in this._windows) {
      this._app.log.info(`[Documents Manager] Closing window ${windowId}!`)
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
    broadcastIpcMessage('documents-update', { event, context })
    this._emitter.emit(event, context)
  }

  // DOCUMENT AUTHORITY FUNCTIONS
  public async getDocument (filePath: string): Promise<{ content: string, type: DocumentType, startVersion: number }> {
    const existingDocument = this.documents.find(doc => doc.filePath === filePath)
    if (existingDocument !== undefined) {
      return {
        content: existingDocument.document.toString(),
        type: existingDocument.type,
        startVersion: existingDocument.currentVersion
      }
    }

    let type = DocumentType.Markdown

    // TODO: We also need to be able to load files not present in the file tree!
    const descriptor = await this._app.fsal.getDescriptorForAnySupportedFile(filePath)
    if (descriptor === undefined || descriptor.type === 'other') {
      throw new Error(`Cannot load file ${filePath}`) // TODO: Proper error handling & state recovery!
    }

    const content = await this._app.fsal.loadAnySupportedFile(filePath)

    if (descriptor.type === 'code') {
      switch (descriptor.ext) {
        case '.yaml':
        case '.yml':
          type = DocumentType.YAML
          break
        case '.json':
          type = DocumentType.JSON
          break
        case '.tex':
        case '.latex':
          type = DocumentType.LaTeX
      }
    }

    const doc: Document = {
      filePath,
      type,
      descriptor,
      currentVersion: 0,
      minimumVersion: 0,
      lastSavedVersion: 0,
      updates: [],
      document: Text.of(content.split(descriptor.linefeed)),
      lastSavedWordCount: countWords(content, false),
      lastSavedCharCount: countWords(content, true)
    }

    this.documents.push(doc)

    // TODO: Sync the watchdog!

    return { content, type, startVersion: 0 }
  }

  private async pullUpdates (filePath: string, clientVersion: number): Promise<Update[]|false> {
    const doc = this.documents.find(doc => doc.filePath === filePath)
    if (doc === undefined) {
      // Indicate to the editor that they should get the document (again). This
      // handles the case where the document has been remotely modified and thus
      // removed from the document array.
      return false
    }

    console.log('CLIENT REQUESTED UPDATES!', clientVersion, doc.currentVersion)

    if (clientVersion < doc.minimumVersion) {
      // TODO: This means that the client is completely out of sync and needs to
      // re-fetch the whole document.
      return false
    } else if (clientVersion < doc.currentVersion) {
      return doc.updates.slice(clientVersion - doc.minimumVersion)
    } else {
      return [] // No updates available
    }
  }

  private async pushUpdates (filePath: string, clientVersion: number, clientUpdates: any[]): Promise<boolean> { // clientUpdates must be produced via "toJSON"
    const doc = this.documents.find(doc => doc.filePath === filePath)
    if (doc === undefined) {
      throw new Error(`Could not receive updates for file ${filePath}: Not found.`)
    }

    if (clientVersion !== doc.currentVersion) {
      console.log('CLIENT VERSION OUT OF SYNC', clientVersion, doc.currentVersion)
      return false
    }

    for (const update of clientUpdates) {
      const changes = ChangeSet.fromJSON(update.changes)
      doc.updates.push(update)
      doc.document = changes.apply(doc.document)
      doc.currentVersion = doc.minimumVersion + doc.updates.length
      // People are lazy, and hence there is a non-zero chance that in a few
      // instances the currentVersion will get dangerously close to
      // Number.MAX_SAFE_INTEGER. In that case, we need to perform a rollback to
      // version 0 and notify all editors that have the document in question
      // open to simply re-load it. That will cause a screen-flicker, but
      // honestly better like this than otherwise.
      if (doc.currentVersion === Number.MAX_SAFE_INTEGER - 1) {
        console.warn(`Document ${filePath} has reached MAX_SAFE_INTEGER. Performing rollback ...`)
        doc.minimumVersion = 0
        doc.currentVersion = doc.updates.length
        // TODO: Broadcast a message so that all editor instances can reload the
        // document.
      }
    }

    // Notify all clients, they will then request the update
    this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { filePath, status: 'modification' })

    // Drop all updates that exceed the amount of updates we allow.
    while (doc.updates.length > MAX_VERSION_HISTORY) {
      doc.updates.shift()
      doc.minimumVersion++
    }

    return true
  }

  // END DOCUMENT AUTHORITY FUNCTIONS

  /**
   * This function searches all currently opened documents for files that have
   * databases attached to them, and announces to the citeproc provider that it
   * should keep those available. Resolves once the citeproc provider finishes
   * synchronizing.
   */
  private async synchronizeDatabases (): Promise<void> {
    const libraries: string[] = []

    for (const doc of this.documents) {
      if (doc.descriptor.type !== 'file') {
        continue
      }

      if (doc.descriptor.frontmatter !== null && 'bibliography' in doc.descriptor.frontmatter) {
        const bib = doc.descriptor.frontmatter.bibliography
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
      leaf.tabMan.openFile(filePath)
      this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId, filePath })
      return true
    }

    // TODO: Make sure the active file is not modified!
    // Close the (formerly active) file if we should avoid new tabs and have not
    // gotten a specific request to open it in a *new* tab
    const activeFile = leaf.tabMan.activeFile
    const ret = leaf.tabMan.openFile(filePath)

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

    const openFile = this.documents.find(doc => doc.filePath === filePath)

    let numOpenInstances = 0
    await this.forEachLeaf(async tabMan => {
      const file = tabMan.openFiles.find(f => f.path === filePath)
      if (file !== undefined) {
        numOpenInstances++
      }
      return false
    })

    if (openFile === undefined) {
      return false
    }

    // If we were to completely remove the file from our buffer, we have to ask
    // first. If there's at least another instance open that means that we won't
    // lose the file.
    if (this.isModified(filePath) && numOpenInstances === 1) {
      const result = await this._app.windows.askSaveChanges()
      // 0 = 'Close without saving changes',
      // 1 = 'Save changes'
      if (result.response === 0) {
        // Clear the modification flag
        openFile.lastSavedVersion = openFile.currentVersion
      } else if (result.response === 1) {
        await this.saveFile(filePath) // TODO: Check return status
      } else {
        // Don't close the file
        this._app.log.info('[Document Manager] Not closing file, as the user did not want that.')
        return false
      }

      // Remove the file
      this.documents.splice(this.documents.indexOf(openFile), 1)
    }

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

    const doc = this.documents.find(doc => doc.filePath === filePath)

    if (doc === undefined) {
      throw new Error(`Could not handle remote change for file ${filePath}: Could not find corresponding file!`)
    }

    const stat = await fs.lstat(filePath)
    const modtime = stat.mtime.getTime()
    const ourModtime = doc.descriptor.modtime
    // In response to issue #1621: We will not check for equal modtime but only
    // for newer modtime to prevent sluggish cloud synchronization services
    // (e.g. OneDrive and Box) from having text appear to "jump" from time to time.
    if (modtime > ourModtime) {
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
    const openFiles: string[] = this.documents.map(doc => doc.filePath)

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
    // TODO: Here we basically only need to close the document and wait for the
    // renderers to reload themselves with getDocument, which will automatically
    // open the new document.
    const idx = this.documents.findIndex(file => file.filePath === filePath)
    this.documents.splice(idx, 1)
    // TODO: Emit an update that basically means "please pull this file in again"
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
      originLeaf,
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

  public isModified (filePath: string): boolean {
    const doc = this.documents.find(doc => doc.filePath === filePath)
    if (doc !== undefined) {
      return doc.currentVersion !== doc.lastSavedVersion
    } else {
      return false // None existing files aren't modified
    }
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
    const modPaths = this.documents.filter(x => this.isModified(x.filePath)).map(x => x.filePath)

    if (id === undefined) {
      // Total clean state
      return modPaths.length === 0
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

  public async saveFile (filePath: string): Promise<boolean> {
    const doc = this.documents.find(doc => doc.filePath === filePath)

    if (doc === undefined) {
      return false // TODO: Error logging
    }

    this._ignoreChanges.push(filePath)

    if (doc.descriptor.type === 'file') {
      await FSALFile.save(
        doc.descriptor,
        doc.document.toString(),
        this._app.fsal.getMarkdownFileParser(),
        this._app.tags,
        null
      )
      await this.synchronizeDatabases() // The file may have gotten a library

      // In case of an MD File increase the word or char count
      const content = doc.document.toString()
      const newWordCount = countWords(content, false)
      const newCharCount = countWords(content, true)

      const countChars = this._app.config.get().editor.countChars
      if (countChars) {
        this._app.stats.updateWordCount(newCharCount - doc.lastSavedCharCount)
      } else {
        this._app.stats.updateWordCount(newWordCount - doc.lastSavedWordCount)
      }

      doc.lastSavedWordCount = newWordCount
      doc.lastSavedCharCount = newCharCount
    } else {
      await FSALCodeFile.save(doc.descriptor, doc.document.toString(), null)
    }

    doc.lastSavedVersion = doc.currentVersion
    this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { filePath, status: 'modification' })

    return true
  }
}
