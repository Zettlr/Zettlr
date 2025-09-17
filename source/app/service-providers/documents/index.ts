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
import { constants as FSConstants } from 'fs'
import { FSALCodeFile, FSALFile } from '@providers/fsal'
import ProviderContract, { type IPCAPI } from '@providers/provider-contract'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import { type AppServiceContainer } from '../../app-service-container'
import { ipcMain, app, dialog, type BrowserWindow, type MessageBoxOptions } from 'electron'
import { DocumentTree, type DTLeaf } from './document-tree'
import PersistentDataContainer from '@common/modules/persistent-data-container'
import { type TabManager } from '@providers/documents/document-tree/tab-manager'
import { DP_EVENTS, type OpenDocument, DocumentType, type BranchNodeJSON, type LeafNodeJSON } from '@dts/common/documents'
import { v4 as uuid4 } from 'uuid'
import { type Update } from '@codemirror/collab'
import { ChangeSet, Text } from '@codemirror/state'
import type { CodeFileDescriptor, MDFileDescriptor } from '@dts/common/fsal'
import { countAll } from '@common/util/counter'
import { markdownToAST } from '@common/modules/markdown-utils'
import isFile from '@common/util/is-file'
import { trans } from '@common/i18n-main'
import type FSALWatchdog from '@providers/fsal/fsal-watchdog'

type DocumentWindows = Record<string, DocumentTree>
type DocumentWindowsJSON = Record<string, BranchNodeJSON|LeafNodeJSON>

// Keep no more than this many updates.
const MAX_VERSION_HISTORY = 100
// Delayed timeout means: Save after 5 seconds
const DELAYED_SAVE_TIMEOUT = 5000
// Even "immediate" should not save immediately to prevent race conditions on slower systems
const IMMEDIATE_SAVE_TIMEOUT = 500

export interface DocumentsUpdateContext {
  windowId?: string
  leafId?: string
  filePath?: string
  direction?: 'horizontal'|'vertical'
  insertion?: 'after'|'before'
  newLeaf?: string
  originLeaf?: string
  key?: string
  status?: 'modification'|'pinned'
}

/**
 * Holds all information associated with a document that is currently loaded
 */
interface Document {
  /**
   * The absolute path to the file
   */
  filePath: string
  /**
   * The descriptor for the file
   */
  descriptor: MDFileDescriptor|CodeFileDescriptor
  /**
   * The file type (e.g. Markdown, JSON, YAML)
   */
  type: DocumentType
  /**
   * The current version of the document in memory
   */
  currentVersion: number
  /**
   * The last version for which full updates are available. Editors with a
   * version less than minimumVersion will need to reload the document.
   */
  minimumVersion: number
  /**
   * The last version number that has been saved to disk. If lastSavedVersion
   * === currentVersion, the file is not modified. NOTE: DO NOT ASSUME THIS
   * VARIABLE TO ACCURATELY REFLECT THE PRECISE VERSION THAT HAS BEEN SAVED;
   * THIS VARIABLE MAY DIFFER, AND EVEN GET NEGATIVE! ONLY USE THIS TO COMPARE
   * AGAINST CURRENTVERSION!
   */
  lastSavedVersion: number
  /**
   * This is a duplicate of whatever has been last written to disk. It is used
   * to double check whether a change event actually changed the content of a
   * file or if the file remains the same on disk as in buffer.
   */
  lastSavedContent: string
  /**
   * Holds all updates between minimumVersion and currentVersion in a granular
   * form.
   */
  updates: Update[]
  /**
   * The actual document text in a CodeMirror format.
   */
  document: Text
  /**
   * Necessary for the word count statistics: The amount of words when the file
   * was last saved to disk.
   */
  lastSavedWordCount: number
  /**
   * Necessary for the word count statistics: The amount of characters when the
   * file was last saved to disk.
   */
  lastSavedCharCount: number
  /**
   * Holds an optional save timeout. This is for when users have indicated they
   * want autosaving.
   */
  saveTimeout: undefined|NodeJS.Timeout
}

export type DocumentAuthorityIPCAPI = IPCAPI<{
  'get-document': { filePath: string }
  'pull-updates': { filePath: string, version: number }
  'push-updates': { filePath: string, version: number, updates: Update[] }
}>

// Most document manager commands require a leaf location, described by the
// window and leaf IDs.
type LeafLoc = { windowId: string, leafId: string }
export type DocumentManagerIPCAPI = IPCAPI<{
  'set-pinned': LeafLoc & { path: string, pinned: boolean }
  'retrieve-tab-config': { windowId: string }
  'save-file': { path: string }
  'open-file': LeafLoc & { path: string, newTab: boolean }
  'close-file': LeafLoc & { path: string }
  'sort-open-files': LeafLoc & { newOrder: string[] }
  'get-file-modification-status': unknown
  'move-file': {
    originWindow: string,
    targetWindow: string,
    originLeaf: string,
    targetLeaf: string,
    path: string
  }
  'split-leaf': {
    originWindow: string,
    originLeaf: string,
    direction: 'horizontal'|'vertical',
    insertion: 'before'|'after',
    path?: string,
    fromWindow?: string,
    fromLeaf?: string
  }
  'close-leaf': LeafLoc
  'focus-leaf': LeafLoc
  'set-branch-sizes': { windowId: string, branchId: string, sizes: number[] },
  'navigate-forward': LeafLoc
  'navigate-back': LeafLoc
}>

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
   * @var {PersistentDataContainer<DocumentWindowsJSON>}
   */
  private readonly _config: PersistentDataContainer<DocumentWindowsJSON>
  /**
   * The process that watches currently opened files for remote changes
   *
   * @var {chokidar.FSWatcher}
   */
  private readonly _watcher: FSALWatchdog

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

  private readonly _lastEditor: {
    windowId: string|undefined
    leafId: string|undefined
  }

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
    this._lastEditor = {
      windowId: undefined,
      leafId: undefined
    }

    // Start up the chokidar process
    this._watcher = this._app.fsal.getWatchdog()

    this._watcher.on('change', (event, filePath) => {
      if (this._ignoreChanges.includes(filePath) && event === 'change') {
        this._app.log.info(`[DocumentManager] Ignoring change for ${filePath}`)
        this._ignoreChanges.splice(this._ignoreChanges.indexOf(filePath), 1)
        return
      } else {
        this._app.log.info(`[DocumentManager] Processing ${event} for ${filePath}`)
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
    ipcMain.handle('documents-authority', async (event, message: DocumentAuthorityIPCAPI) => {
      const { command, payload } = message
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
    ipcMain.handle('documents-provider', async (event, message: DocumentManagerIPCAPI) => {
      const { command, payload } = message
      switch (command) {
        // A given tab should be set as pinned
        case 'set-pinned': {
          const { windowId, leafId, path, pinned } = payload
          this.setPinnedStatus(windowId, leafId, path, pinned)
          return
        }
        // Some main window has requested its tab/split view state
        case 'retrieve-tab-config': {
          return this._windows[payload.windowId].toJSON()
        }
        case 'save-file': {
          return await this.saveFile(payload.path)
        }
        case 'open-file': {
          const { windowId, leafId, path, newTab } = payload
          return await this.openFile(windowId, leafId, path, newTab)
        }
        case 'close-file': {
          const { windowId, leafId, path } = payload
          return await this.closeFile(windowId, leafId, path)
        }
        case 'sort-open-files': {
          const { windowId, leafId, newOrder } = payload
          this.sortOpenFiles(windowId, leafId, newOrder)
          return
        }
        case 'get-file-modification-status': {
          return this.documents.filter(x => this.isModified(x.filePath)).map(x => x.filePath)
        }
        case 'move-file': {
          const {
            originWindow, originLeaf, targetWindow, targetLeaf, path
          } = payload
          return await this.moveFile(
            originWindow, targetWindow, originLeaf, targetLeaf, path
          )
        }
        case 'split-leaf': {
          const {
            originWindow, originLeaf,
            direction, insertion,
            path,
            fromWindow, fromLeaf
          } = payload

          return await this.splitLeaf(
            originWindow, originLeaf,
            direction, insertion,
            path,
            fromWindow, fromLeaf
          )
        }
        case 'close-leaf': {
          return this.closeLeaf(payload.windowId, payload.leafId)
        }
        case 'focus-leaf': {
          return this._updateFocusLeaf(payload.windowId, payload.leafId)
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

        // NOTE: We are re-implementing `askSaveChanges` here since we cannot
        // give the user the choice to cancel.
        // TODO: Once the window management logic is put here, we have better
        // control over the windows and can ask this question *before* the
        // window is being closed.
        const opt: MessageBoxOptions = {
          type: 'question',
          buttons: [
            trans('Save changes'),
            trans('Discard changes'),
            trans('Cancel')
          ],
          defaultId: 0,
          cancelId: 2,
          title: trans('Unsaved changes'),
          message: trans('There are unsaved changes. Do you want to save or discard them?')
        }

        dialog.showMessageBox(opt)
          .then(async ({ response }) => {
            // 0 = Save, 1 = Don't save, 2 = Cancel
            if (response === 2) {
              this._app.log.verbose('User cancelled save-dialog; not quitting.')
              return // Do nothing
            }

            // Apply the choice to all open documents
            for (const document of this.documents) {
              if (response === 0) {
                await this.saveFile(document.filePath)
              } else {
                document.lastSavedVersion = document.currentVersion
              }
            }

            app.quit()
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
    // 0 = Save, 1 = Don't save, 2 = Cancel
    if (result.response === 1) {
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
    } else if (result.response === 0) {
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

    const treedata = await this._config.get()
    for (const key in treedata) {
      try {
        // Make sure to fish out invalid paths before mounting the tree
        const tree = DocumentTree.fromJSON(treedata[key])
        for (const leaf of tree.getAllLeafs()) {
          for (const file of leaf.tabMan.openFiles.map(x => x.path)) {
            if (!await this._app.fsal.testAccess(file, FSConstants.F_OK|FSConstants.W_OK|FSConstants.R_OK)) {
              leaf.tabMan.closeFile(file)
            }
          }
          if (leaf.tabMan.openFiles.length === 0) {
            leaf.parent.removeNode(leaf)
          }
        }
        this._windows[key] = tree
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

    // Sync everything after boot
    this.syncWatchedFilePaths()
    await this.synchronizeDatabases()
    this.syncToConfig()

    this._app.log.info(`[Document Manager] Restored ${this.windowCount()} open windows.`)
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

    const isLastWindow = Object.values(this._windows).length === 1

    if (windowId in this._windows && !isLastWindow) {
      // NOTE: By doing this, we always retain the window state of the last and
      // only window that is open. This means that, while additional windows
      // will be forgotten after closing, the last and final one will always
      // retain its state.
      // TODO: If we ever implement workspaces, etc., this safeguard won't be
      // necessary anymore.
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
    // We MUST under all circumstances properly call the close() function on
    // every chokidar process we utilize. Otherwise, the fsevents dylib will
    // still hold on to some memory after the Electron process itself shuts down
    // which will result in a crash report appearing on macOS.
    await this._watcher.shutdown()
    this._config.shutdown()
  }

  private broadcastEvent (event: DP_EVENTS, context?: DocumentsUpdateContext): void {
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
      lastSavedContent: content,
      updates: [],
      document: Text.of(content.split('\n')),
      lastSavedCharCount: descriptor.type === 'file' ? descriptor.charCount : 0,
      lastSavedWordCount: descriptor.type === 'file' ? descriptor.wordCount : 0,
      saveTimeout: undefined
    }

    this.documents.push(doc)
    this.syncWatchedFilePaths()

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

    if (clientVersion < doc.minimumVersion || clientVersion > doc.currentVersion) {
      // The client is completely out of sync and has to reload the document.
      // If this happens because clientVersion < doc.minimumVersion, this means
      // that the lost connection somehow. If it happens because clientVersion
      // > doc.currentVersion, it means that we had to roll over the version in
      // pushUpdates below.
      return false
    } else if (clientVersion < doc.currentVersion) {
      return doc.updates.slice(clientVersion - doc.minimumVersion)
    } else {
      return [] // No updates available
    }
  }

  private async pushUpdates (filePath: string, clientVersion: number, clientUpdates: Update[]): Promise<boolean> { // clientUpdates must be produced via "toJSON"
    const doc = this.documents.find(doc => doc.filePath === filePath)
    if (doc === undefined) {
      throw new Error(`Could not receive updates for file ${filePath}: Not found.`)
    }

    if (clientVersion !== doc.currentVersion) {
      return false
    }

    // Before applying any updates, we have to clear any potential timeout so
    // that it does not interfere with us updating the document. Otherwise, this
    // can lead to a faulty state where the provider cannot save the file
    // anymore.
    clearTimeout(doc.saveTimeout)

    for (const update of clientUpdates) {
      const changes = ChangeSet.fromJSON(update.changes)
      doc.updates.push(update)
      try {
        doc.document = changes.apply(doc.document)
      } catch (err: any) {
        dialog.showErrorBox(
          'Document out of sync',
          `Your modifications could not be applied to the document in memory.
This means that saving might fail. Please report this bug to us, copy the
current contents from the editor somewhere else, and restart the application.`
        )
        throw err
      }
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
      doc.minimumVersion += 1
    }

    const autoSave = this._app.config.get().editor.autoSave

    // No autosave
    if (autoSave === 'off') {
      return true
    }

    doc.saveTimeout = setTimeout(() => {
      this.saveFile(doc.filePath)
        .catch(err => this._app.log.error(`[Document Provider] Could not save file ${doc.filePath}: ${err.message as string}`, err))
    }, autoSave === 'delayed' ? DELAYED_SAVE_TIMEOUT : IMMEDIATE_SAVE_TIMEOUT)

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
   * Opens a file in a specific leaf in a given window. If windowId or leafId is not specified
   * it will open the file in the last focused leaf, in the last focused window.
   *
   * @param  {string|undefined} windowId  The windowId to open the document in
   * @param  {string|undefined} leafId    The leafId of the window to open the document in
   * @param  {string}  filePath   The absolute file path
   * @param  {boolean} newTab Optional. If true, will always prevent exchanging the currently active file.
   *
   * @return {Promise<boolean>} True if it successfully opens the file
   */
  public async openFile (windowId: string|undefined, leafId: string|undefined, filePath: string, newTab?: boolean): Promise<boolean> {
    if (!isFile(filePath)) {
      throw new Error(`Could not open file ${filePath}: Not an existing file.`)
    }

    // If windowId is not provided, then use the last focused window
    if (windowId === undefined) {
      const mainWindow: BrowserWindow|undefined = this._app.windows.getFirstMainWindow()
      const key = (mainWindow !== undefined) ? this._app.windows.getMainWindowKey(mainWindow) : undefined
      if (key !== undefined) {
        windowId = key
      }
    }

    if (windowId === undefined) {
      this._app.log.warning(`Could not open file ${filePath}: windowId was undefined.`)
      return false
    }

    let leaf: DTLeaf|undefined
    if (leafId === undefined) {
      if (this._lastEditor.leafId !== undefined) {
        leaf = this._windows[windowId].findLeaf(this._lastEditor.leafId)
      }
      if (leaf === undefined) {
        leaf = this._windows[windowId].getAllLeafs()[0]
      }
    } else {
      leaf = this._windows[windowId].findLeaf(leafId)
    }

    if (leaf === undefined) {
      this._app.log.warning(`Could not open file ${filePath}: leaf was undefined.`)
      return false
    }

    // Now we definitely know the leaf ID if it was undefined
    if (leafId === undefined) {
      leafId = leaf.id
    }

    this._updateFocusLeaf(windowId, leafId)

    // After here, the document will in some way be opened.
    this._app.recentDocs.add(filePath)

    if (leaf.tabMan.openFiles.map(x => x.path).includes(filePath)) {
      // File is already open -> simply set it as active
      // leaf.tabMan.activeFile = filePath
      leaf.tabMan.openFile(filePath)
      this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId, filePath })
      this.syncToConfig()
      return true
    }

    // NOTE: Since openFile will set filePath as active, we have to retrieve the
    // (previously) active file *before* opening the new one. See bug #5065 for
    // context.
    const activeFile = leaf.tabMan.activeFile
    const ret = leaf.tabMan.openFile(filePath)
    if (ret) {
      this.broadcastEvent(DP_EVENTS.OPEN_FILE, { windowId, leafId, filePath })
    }

    // Close the (formerly active) file if we should avoid new tabs and have not
    // gotten a specific request to open it in a *new* tab
    const { avoidNewTabs } = this._app.config.get().system
    if (activeFile !== null && avoidNewTabs && newTab !== true && !this.isModified(activeFile.path)) {
      leaf.tabMan.closeFile(activeFile)
      this.syncWatchedFilePaths()
      this.broadcastEvent(DP_EVENTS.CLOSE_FILE, { windowId, leafId, filePath: activeFile.path })
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

    let numOpenInstances = 0
    await this.forEachLeaf(async tabMan => {
      const file = tabMan.openFiles.find(f => f.path === filePath)
      if (file !== undefined) {
        numOpenInstances++
      }
      return false
    })

    // If we were to completely remove the file from our buffer, we have to ask
    // first. If there's at least another instance open that means that we won't
    // lose the file. NOTE: openFile will be undefined if the file has not been
    // opened in this session of Zettlr, hence it will not be modified, hence we
    // don't have to do anything.
    const openFile = this.documents.find(doc => doc.filePath === filePath)
    if (openFile !== undefined && this.isModified(filePath) && numOpenInstances === 1) {
      const result = await this._app.windows.askSaveChanges()
      // 0 = Save, 1 = Don't save, 2 = Cancel
      if (result.response === 1) {
        // Clear the modification flag
        openFile.lastSavedVersion = openFile.currentVersion
        this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { filePath, status: 'modification' })
      } else if (result.response === 0) {
        await this.saveFile(filePath) // TODO: Check return status
      } else {
        // Don't close the file
        this._app.log.info('[Document Manager] Not closing file, as the user did not want that.')
        return false
      }

      // Remove the file
      this.documents.splice(this.documents.indexOf(openFile), 1)
    } else if (openFile !== undefined && numOpenInstances === 1) {
      // The file is not modified, but this is still the last instance, so we
      // can close it without having to ask.
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
  public closeFileEverywhere (filePath: string): void {
    for (const key in this._windows) {
      const allLeafs = this._windows[key].getAllLeafs()
      for (const leaf of allLeafs) {
        if (leaf.tabMan.openFiles.map(x => x.path).includes(filePath)) {
          leaf.tabMan.setPinnedStatus(filePath, false)
          const success = leaf.tabMan.closeFile(filePath)
          if (!success) {
            continue
          }

          this.broadcastEvent(DP_EVENTS.CLOSE_FILE, { windowId: key, leafId: leaf.id, filePath })

          if (leaf.tabMan.openFiles.length === 0) {
            this.closeLeaf(key, leaf.id)
          }
        }
      }
    }

    // We also must splice the document out of our provider
    const idx = this.documents.findIndex(doc => doc.filePath === filePath)
    if (idx > -1) {
      this.documents.splice(idx, 1)
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

    const metadata = await this._app.fsal.getFilesystemMetadata(filePath)
    const modtime = metadata.modtime
    const ourModtime = doc.descriptor.modtime

    // In response to issue #1621: We will not check for equal modtime but only
    // for newer modtime to prevent sluggish cloud synchronization services
    // (e.g. OneDrive and Box) from having text appear to "jump" from time to time.
    if (modtime <= ourModtime) {
      return // Nothing to do
    }

    // ... however, some cloud services may still emit additional change events
    // that merely change attributes, but not the content. We handle this case
    // next
    const diskContents = await this._app.fsal.loadAnySupportedFile(doc.descriptor.path)

    if (diskContents === doc.lastSavedContent) {
      return
    }

    const isModified = doc.lastSavedVersion !== doc.currentVersion
    const { alwaysReloadFiles } = this._app.config.get()
    if (isModified || !alwaysReloadFiles) {
      // The file is modified in buffer, or the user does not want to simply
      // reload changes, so we cannot just overwrite anything
      // Prevent multiple instances of the dialog, just ask once. The logic
      // always retrieves the most recent version either way
      if (this._remoteChangeDialogShownFor.includes(filePath)) {
        return
      }

      this._remoteChangeDialogShownFor.push(filePath)
      const filename = doc.descriptor.name

      // Ask the user if we should replace the file
      const response = await dialog.showMessageBox({
        title: trans('File changed on disk'),
        message: trans('%s changed on disk', filename),
        detail: isModified
          ? trans('%s has changed on disk, but the editor contains unsaved changes. Do you want to keep the current editor contents or load the file from disk?', filename)
          : trans('Do you want to keep the current editor contents or load the file from disk?'),
        type: 'question',
        buttons: [
          trans('Keep editor contents'),
          trans('Load changes from disk')
        ],
        defaultId: 0,
        checkboxLabel: trans('Always load changes from disk if there are no unsaved changes in the editor'),
        checkboxChecked: alwaysReloadFiles
      })

      this._remoteChangeDialogShownFor.splice(this._remoteChangeDialogShownFor.indexOf(filePath), 1)

      this._app.config.set('alwaysReloadFiles', response.checkboxChecked)

      if (response.response === 0) {
        // User does not want to load the disk contents. To ensure that the
        // proper status is indicated, set the "lastSavedVersion" to one minus.
        doc.lastSavedVersion--
        this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { filePath, status: 'modification' })
      } else {
        await this.notifyRemoteChange(filePath)
      }
    } else {
      // The user has activated the setting to alwaysReloadFiles.
      await this.notifyRemoteChange(filePath)
    }
  }

  /**
   * This function can be called from within the FSAL or programmatically, if a
   * file has been programmatically been moved (either by renaming or moving).
   * This makes it easier for the user to not even notice this inside the open
   * documents.
   *
   * @param  {string}  oldPath  The old path
   * @param  {string}  newPath  The path it'll be afterwards
   */
  public async hasMovedFile (oldPath: string, newPath: string): Promise<void> {
    // Basically we just have to close the oldPath, and "open" the new path.
    const openDoc = this.documents.find(doc => doc.filePath === oldPath)
    if (openDoc === undefined) {
      return // Nothing to do
    }

    openDoc.filePath = newPath
    openDoc.descriptor.path = newPath
    openDoc.descriptor.dir = path.dirname(newPath)
    openDoc.descriptor.name = path.basename(newPath)
    openDoc.descriptor.ext = path.extname(newPath)

    const leafsToNotify: Array<[string, string]> = []
    await this.forEachLeaf(async (tabMan, windowId, leafId) => {
      const res = tabMan.replaceFilePath(oldPath, newPath)
      if (res) {
        leafsToNotify.push([ windowId, leafId ])
      }
      return res
    })

    this.syncWatchedFilePaths()

    // Emit the necessary events to each window
    for (const [ windowId, leafId ] of leafsToNotify) {
      this.broadcastEvent(DP_EVENTS.CLOSE_FILE, { filePath: oldPath, windowId, leafId })
      this.broadcastEvent(DP_EVENTS.OPEN_FILE, { filePath: newPath, windowId, leafId })
      // Ensure the renderer picks up the correct (new) active file path, if
      // that has changed (noop in othe cases; see #5574).
      this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId })
    }
  }

  /**
   * Convenience function, can be called in case of moving a directory around.
   * Will internally call hasMovedFile for every affected file to ensure a
   * smooth user experience.
   *
   * @param  {string}  oldPath  The old path
   * @param  {string}  newPath  The new path
   */
  public async hasMovedDir (oldPath: string, newPath: string): Promise<void> {
    // Similar as hasMovedFile, but triggers the command for every affected file
    const docs = this.documents.filter(doc => doc.filePath.startsWith(oldPath))

    for (const doc of docs) {
      this._app.log.info('Replacing file path for doc ' + doc.filePath + ' with ' + doc.filePath.replace(oldPath, newPath))
      await this.hasMovedFile(doc.filePath, doc.filePath.replace(oldPath, newPath))
    }
  }

  /**
   * This function ensures that our watcher keeps watching the correct files
   */
  private syncWatchedFilePaths (): void {
    // First, get the files currently watched
    const watchedFiles: string[] = []
    const watched = this._watcher.getWatched()
    for (const dir in watched) {
      for (const filename of watched[dir]) {
        watchedFiles.push(path.join(dir, filename))
      }
    }

    // Second, get all open files. NOTE: This does not mean "open open", but
    // rather paths that are "open" somewhere in a leaf. Not actively viewed.
    let openFiles: string[] = []
    for (const windowId in this._windows) {
      for (const leaf of this._windows[windowId].getAllLeafs()) {
        openFiles.push(...leaf.tabMan.openFiles.map(f => f.path))
      }
    }

    openFiles = [...new Set(openFiles)] // Remove duplicates

    // Third, remove those watched files which are no longer open
    for (const watchedFile of watchedFiles) {
      if (!openFiles.includes(watchedFile)) {
        this._watcher.unwatchPath(watchedFile)
      }
    }

    // Fourth, add those open files not yet watched
    for (const openFile of openFiles) {
      if (!watchedFiles.includes(openFile)) {
        this._watcher.watchPath(openFile)
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
  public async forEachLeaf (callback: (tabMan: TabManager, windowId: string, leafId: string) => Promise<boolean>): Promise<void> {
    for (const windowId in this._windows) {
      for (const leaf of this._windows[windowId].getAllLeafs()) {
        const stateHasChanged = await callback(leaf.tabMan, windowId, leaf.id)
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
    // Here we basically only need to close the document and wait for the
    // renderers to reload themselves with getDocument, which will automatically
    // open the new document.
    const idx = this.documents.findIndex(file => file.filePath === filePath)
    this.documents.splice(idx, 1)
    // Indicate to all affected editors that they should reload the file
    this.broadcastEvent(DP_EVENTS.FILE_REMOTELY_CHANGED, { filePath })
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
    let success = target.tabMan.openFile(filePath)
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
      const win = fromWindow ?? originWindow
      const leaf = fromLeaf ?? originLeaf
      await this.moveFile(win, originWindow, leaf, target.id, filePath)
    }
  }

  public closeLeaf (windowId: string, leafId: string): void {
    const leaf = this._windows[windowId].findLeaf(leafId)

    if (leaf !== undefined) {
      leaf.parent.removeNode(leaf)
      this.broadcastEvent(DP_EVENTS.LEAF_CLOSED, { windowId, leafId })
      this._updateFocusLeaf(windowId, this._windows[windowId].getAllLeafs()[0].id)
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

    leaf.tabMan.forward()
    this.broadcastEvent(DP_EVENTS.OPEN_FILE, { windowId, leafId })
    this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId })
  }

  public async navigateBack (windowId: string, leafId: string): Promise<void> {
    const leaf = this._windows[windowId].findLeaf(leafId)
    if (leaf === undefined) {
      return
    }

    leaf.tabMan.back()
    this.broadcastEvent(DP_EVENTS.OPEN_FILE, { windowId, leafId })
    this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, { windowId, leafId })
  }

  public async saveFile (filePath: string): Promise<boolean> {
    const doc = this.documents.find(doc => doc.filePath === filePath)

    if (doc === undefined) {
      this._app.log.error(`[Document Provider] Could not save file ${filePath}: Not found in loaded documents!`)
      return false
    }

    // If saveFile was called from a timeout, clearTimeout does nothing but the
    // timeout is reset to undefined. However, implementing this check here
    // ensures that we can programmatically call saveFile anywhere else and
    // still have everything work as intended.
    if (doc.saveTimeout !== undefined) {
      clearTimeout(doc.saveTimeout)
      doc.saveTimeout = undefined
    }

    // NOTE: Remember that we MUST under any circumstances adapt the document
    // descriptor BEFORE attempting to save. The reason is that if we don't do
    // that, we can run into the following race condition:
    // 1. User changes the document
    // 2. The save commences
    // 3. The user adds more changes
    // 4. The save finishes and undos the modifications

    // NOTE: Zettlr internally always uses regular LF linefeeds. The FSAL load
    // and FSAL save methods will take care to actually use the proper linefeeds
    // and BOMs. So here we will always use newlines. This should fix and in the
    // future prevent bugs like #4959
    const docLines = [...doc.document.iterLines()]
    const content = docLines.join('\n')
    doc.lastSavedVersion = doc.currentVersion
    doc.lastSavedContent = content

    if (doc.descriptor.type === 'file') {
      // In case of an MD File increase the word or char count
      const locale: string = this._app.config.get().appLang
      const ast = markdownToAST(content)
      const counts = countAll(ast, locale)
      const newWordCount = counts.words
      const newCharCount = counts.chars

      this._app.stats.updateCounts(
        newWordCount - doc.lastSavedWordCount,
        newCharCount - doc.lastSavedCharCount
      )

      doc.lastSavedWordCount = newWordCount
      doc.lastSavedCharCount = newCharCount
    }

    this._ignoreChanges.push(filePath)

    try {
      if (doc.descriptor.type === 'file') {
        await FSALFile.save(
          doc.descriptor,
          content,
          this._app.fsal.getMarkdownFileParser(),
          null
        )
        await this.synchronizeDatabases() // The file may have gotten a library
      } else {
        await FSALCodeFile.save(doc.descriptor, content, null)
      }
    } catch (err: any) {
      dialog.showErrorBox(trans('Could not save file'), trans('Could not save file %s: %s', doc.descriptor.name, err.message))
      throw err
    }

    this._app.log.info(`[DocumentManager] File ${filePath} saved.`)
    this.broadcastEvent(DP_EVENTS.CHANGE_FILE_STATUS, { filePath, status: 'modification' })
    this.broadcastEvent(DP_EVENTS.FILE_SAVED, { filePath })

    return true
  }

  private _updateFocusLeaf (windowId: string, leafId: string): void {
    this._lastEditor.windowId = windowId
    this._lastEditor.leafId = leafId
    this.broadcastEvent(DP_EVENTS.ACTIVE_FILE, {
      windowId,
      leafId,
      filePath: this.getActiveFile(leafId) ?? undefined
    })
  }
}
