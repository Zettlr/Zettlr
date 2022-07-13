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
import chokidar from 'chokidar'
import { CodeFileDescriptor, MDFileDescriptor } from '@dts/main/fsal'
import { CodeFileMeta, MDFileMeta } from '@dts/common/fsal'
import { FSALCodeFile, FSALFile } from '@providers/fsal'
import generateFilename from '@common/util/generate-filename'
import ProviderContract from '@providers/provider-contract'
import { hasCodeExt, hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import AppServiceContainer from 'source/app/app-service-container'
import { OpenDocument } from '@dts/common/documents'
import { ipcMain } from 'electron'

export default class DocumentManager extends ProviderContract {
  private _loadedDocuments: Array<MDFileDescriptor|CodeFileDescriptor>
  private _activeFile: MDFileDescriptor|CodeFileDescriptor|null
  private readonly _watcher: chokidar.FSWatcher
  private readonly _sessionHistory: string[]
  private readonly _emitter: EventEmitter
  private _sessionPointer: number

  constructor (private readonly _app: AppServiceContainer) {
    super()

    this._loadedDocuments = []
    this._sessionHistory = []
    this._sessionPointer = -1
    this._activeFile = null
    this._emitter = new EventEmitter()

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

    this._watcher.on('all', (event: string, p: string) => {
      const descriptor = this._loadedDocuments.find(file => file.path === p)

      if (descriptor === undefined) {
        // Should not happen, but just in case
        this._app.log.warning(`[DocumentManager] Received a ${event}-event for ${p} but couldn't handle it.`)
        return
      }

      if (event === 'unlink') {
        // Just close the file (also handles activeFile and config changes)
        this.closeFile(descriptor)
      } else if (event === 'change') {
        this._loadFile(p)
          .then(newDescriptor => {
            // In response to issue #1621: We will not check for equal modtime
            // but only for newer modtime to prevent sluggish cloud synchronization
            // services (OneDrive and Box do that) from having text appear to "jump"
            // from time to time.
            if (newDescriptor.modtime > descriptor.modtime) {
              this._app.log.info(`[Document Manager] Emitting remote change event for file ${newDescriptor.path}`)
              // Replace the old descriptor with the newly loaded one
              this._loadedDocuments.splice(this._loadedDocuments.indexOf(descriptor), 1, newDescriptor)
              // Notify the caller, that the file has actually changed on disk.
              this._emitter.emit('update', 'openFileRemotelyChanged', newDescriptor)
            }
          })
          .catch(err => this._app.log.error(`[Document Manager] Could not reload remotely changed file ${p}!`, err))
      } else {
        this._app.log.warning(`[DocumentManager] Received unexpected event ${event} for ${p}.`)
      }
    })

    // Finally, listen to events from the renderer
    ipcMain.handle('documents-provider', (event, { command, payload }) => {
      if (command === 'set-pinned') {
        const filePath = payload.path as string
        const shouldBePinned = payload.pinned as boolean
        this.setPinnedStatus(filePath, shouldBePinned)
      }
    })
  } // END constructor

  async boot (): Promise<void> {
    // Loads in all openFiles
    this._app.log.verbose('Document Manager starting up ...')
    const openFiles: OpenDocument[] = this._app.config.get('openFiles')
    for (const doc of openFiles) {
      try {
        const descriptor = await this._loadFile(doc.path)
        this._loadedDocuments.push(descriptor)
      } catch (err: any) {
        this._app.log.error(`[Document Manager] Boot: Could not load file ${doc.path}: ${String(err.message)}`, err)
      }
    }

    this._app.log.info(`[Document Manager] Restored ${this._loadedDocuments.length} open documents.`)
    this._watcher.add(this._loadedDocuments.map(file => file.path))
    this.syncToConfig()

    // And make the correct file active
    const activeFile: string = this._app.config.get('activeFile')
    const activeDescriptor = this._loadedDocuments.find(elem => elem.path === activeFile)

    if (activeDescriptor !== undefined) {
      this._activeFile = activeDescriptor
      this._emitter.emit('update', 'activeFile')
      broadcastIpcMessage('fsal-state-changed', 'activeFile')
    } else if (this._loadedDocuments.length > 0) {
      // Make another file active
      this._activeFile = this._loadedDocuments[0]
      this._emitter.emit('update', 'activeFile')
      broadcastIpcMessage('fsal-state-changed', 'activeFile')
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
    // Nothing to do
  }

  /**
   * Allows to set the open files.
   *
   * @param {Array<MDFileDescriptor|CodeFileDescriptor>} fileArray  An array with paths to open
   */
  public set openFiles (files: Array<MDFileDescriptor|CodeFileDescriptor>) {
    this._watcher.unwatch(this._loadedDocuments.map(file => file.path))
    this._loadedDocuments = files
    this._watcher.add(files.map(file => file.path))
    this.syncToConfig()
  }

  /**
   * Returns all open files
   *
   * @returns {Array<MDFileDescriptor|CodeFileDescriptor>} A list of open file descriptors
   */
  public get openFiles (): Array<MDFileDescriptor|CodeFileDescriptor> {
    return this._loadedDocuments
  }

  /**
   * Sorts the openFiles according to hashArray, and returns the new sorting.
   *
   * @param {Array} pathArray An array with absolute paths to sort with
   *
   * @return {Array} The new sorting
   */
  public sortOpenFiles (pathArray: string[]): Array<MDFileDescriptor|CodeFileDescriptor> {
    if (Array.isArray(pathArray)) {
      // Simply re-sort based on the new paths
      this._loadedDocuments.sort((a, b) => {
        return pathArray.indexOf(a.path) - pathArray.indexOf(b.path)
      })

      // Also make sure that pinned tabs are all grouped to the left before sync
      const openFiles: OpenDocument[] = this._app.config.get('openFiles')
      this._loadedDocuments.sort((a, b) => {
        const _a = openFiles.find(elem => elem.path === a.path)?.pinned ?? false
        const _b = openFiles.find(elem => elem.path === b.path)?.pinned ?? false

        if (_a && !_b) return -1
        if (!_a && _b) return 1
        return 0
      })

      this.syncToConfig()
    }

    return this._loadedDocuments
  }

  /**
   * Returns a file's metadata including the contents.
   *
   * @param  {string}  file   The absolute file path
   * @param  {boolean} newTab Optional. If true, will always prevent exchanging the currently active file.
   *
   * @return {Promise<MDFileDescriptor|CodeFileDescriptor>} The file's descriptor
   */
  public async openFile (filePath: string, newTab?: boolean, modifyHistory?: boolean): Promise<MDFileDescriptor|CodeFileDescriptor> {
    const openFile = this._loadedDocuments.find(file => file.path === filePath)

    // Remove the file from the session history if applicable
    if (modifyHistory !== false) {
      const sessionIndex = this._sessionHistory.indexOf(filePath)
      if (sessionIndex > -1) {
        this._sessionHistory.splice(sessionIndex, 1)
      }
    }

    // If the file is already open, we just set it as the active one and be done
    // with it, no further action needed
    if (openFile !== undefined) {
      if (modifyHistory !== false) {
        this._sessionHistory.push(filePath)
        this._sessionPointer = this._sessionHistory.length - 1
      }
      this.activeFile = openFile
      return openFile
    }

    // The file is not open, so let's first load it into our state ...
    const file = await this._loadFile(filePath)

    if (this._activeFile !== null) {
      // ... behind our active file
      const idx = this._loadedDocuments.indexOf(this._activeFile)
      this._loadedDocuments.splice(idx + 1, 0, file)
    } else {
      // ... or at the end
      this._loadedDocuments.push(file)
    }

    // Update all required states. Especially make sure to re-sort this to
    // ensure the new file (unpinned) doesn't end up in between several pinned
    // files.
    this._watcher.add(file.path)
    this.sortOpenFiles(this._loadedDocuments.map(d => d.path))

    const avoidNewTabs = Boolean(this._app.config.get('system.avoidNewTabs'))

    // Close the (formerly active) file if we should avoid new tabs and have not
    // gotten a specific request to open it in a *new* tab
    if (this.activeFile !== null && avoidNewTabs && newTab !== true && !this.activeFile.modified) {
      this.closeFile(this.activeFile)
    }

    // Set the file as active, which will trigger a second wave of state updates
    this.activeFile = file

    if (modifyHistory !== false) {
      this._sessionHistory.push(filePath)
      this._sessionPointer = this._sessionHistory.length - 1
    }

    return file
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
  public closeFile (file: MDFileDescriptor|CodeFileDescriptor): void {
    if (!this._loadedDocuments.includes(file)) {
      return // All good, we didn't even have to close the file.
    }

    if (this.isPinned(file.path)) {
      this._app.log.warning(`[Document Provider] Refusing to close pinned file ${file.path}`)
      return
    }

    // Retrieve the index of the active file and whether it's an active file
    const activeFileIdx = this._loadedDocuments.findIndex(elem => elem === this._activeFile)
    const isActive = this._activeFile === file

    // Then remove the file from the list of open files
    this._loadedDocuments.splice(this._loadedDocuments.indexOf(file), 1)
    this._watcher.unwatch(file.path)
    this.syncToConfig()

    // Now, if we just closed the active file, we need to make another file
    // active, or none, if there are no more open files active.
    if (isActive) {
      if (this._loadedDocuments.length > 0 && activeFileIdx > 0) {
        this.activeFile = this._loadedDocuments[activeFileIdx - 1]
      } else if (this._loadedDocuments.length > 0 && activeFileIdx === 0) {
        this.activeFile = this._loadedDocuments[0]
      } else {
        this.activeFile = null
      }
    }
  }

  /**
   * Closes all open files.
   */
  public closeAllFiles (): void {
    for (const file of this._loadedDocuments) {
      if (this.isPinned(file.path)) {
        continue // Cannot close this file
      }

      this._watcher.unwatch(file.path)
      this._loadedDocuments.splice(this._loadedDocuments.indexOf(file), 1)
    }
    this.syncToConfig()
  }

  /**
   * Goes back in the session history and opens the previous file
   */
  public async back (): Promise<void> {
    await this._moveThroughHistory(-1)
  }

  /**
   * Goes forward in the session history and opens the next file
   */
  public async forward (): Promise<void> {
    await this._moveThroughHistory(1)
  }

  /**
   * Moves through history using the specified direction
   *
   * @param   {number}  direction  The direction to take. Negative = back, positive = forward
   */
  private async _moveThroughHistory (direction: number): Promise<void> {
    // Always make sure the session pointer is valid
    if (this._sessionPointer < 0 || this._sessionPointer > this._sessionHistory.length - 1) {
      this._sessionPointer = this._sessionHistory.length - 1
    }

    const targetIndex = this._sessionPointer + direction

    if (targetIndex > this._sessionHistory.length - 1 || targetIndex < 0) {
      return // Cannot move: Out of bounds
    }

    // Move the pointer
    this._sessionPointer = targetIndex
    const pathToOpen = this._sessionHistory[this._sessionPointer]

    // Open that file, but tell the opener explicitly not to modify the state
    await this.openFile(pathToOpen, undefined, false)
  }

  /**
   * Opens, reads, and parses a file to be loaded.
   *
   * @param {String} filePath The file to be loaded
   *
   * @return {Promise<MDFileDescriptor|CodeFileDescriptor>} The file's descriptor
   */
  private async _loadFile (filePath: string): Promise<MDFileDescriptor|CodeFileDescriptor> {
    if (hasCodeExt(filePath)) {
      const file = await FSALCodeFile.parse(filePath, null)
      // Withthe next code, we ensure the FSAL's state is up to date if the user
      // opened a standalone root file
      const loadedInFSAL = this._app.fsal.find(filePath)
      if (loadedInFSAL === undefined) {
        await this._app.fsal.loadPath(filePath)
        this._app.config.addPath(filePath)
      }
      return file
    } else if (hasMarkdownExt(filePath)) {
      const file = await FSALFile.parse(filePath, null, this._app.fsal.getMarkdownFileParser(), this._app.targets, this._app.tags)
      // Withthe next code, we ensure the FSAL's state is up to date if the user
      // opened a standalone root file
      const loadedInFSAL = this._app.fsal.find(filePath)
      if (loadedInFSAL === undefined) {
        await this._app.fsal.loadPath(filePath)
        this._app.config.addPath(filePath)
      }
      return file
    } else {
      const error: any = new Error(`Could not load file ${filePath}: Invalid path provided`)
      error.path = filePath
      error.code = 'EINVALIDPATH'
      throw error
    }
  }

  /**
   * This method synchronizes the state of the loadedDocuments array into the
   * configuration.
   */
  private syncToConfig (): void {
    // Retrieve the files from config so that we can retain the non-default
    // properties for the files (i.e. if the document is pinned). NOTE we have
    // to clone the objects because otherwise the config provider's built-in
    // shortcut in case of unchanged objects will kick in.
    const openFiles: OpenDocument[] = JSON.parse(JSON.stringify(this._app.config.get('openFiles')))

    const openDocs: OpenDocument[] = this._loadedDocuments
      .filter(file => file.dir !== ':memory:') // Exclude in memory files
      .map(file => {
        const doc = openFiles.find(e => e.path === file.path)
        return {
          path: file.path,
          pinned: doc?.pinned ?? false // Retain the pinned status (default false)
        }
      })

    // Now set
    this._app.config.set('openFiles', openDocs)

    // Emit appropriate events
    this._emitter.emit('update', 'openFiles')
    broadcastIpcMessage('fsal-state-changed', 'openFiles')
  }

  /**
   * Sets the pinned status for the given file.
   *
   * @param   {string}   filePath        The absolute path to the file
   * @param   {boolean}  shouldBePinned  Whether the file should be pinned.
   */
  private setPinnedStatus (filePath: string, shouldBePinned: boolean): void {
    const openFiles: OpenDocument[] = JSON.parse(JSON.stringify(this._app.config.get('openFiles')))

    const idx = openFiles.findIndex(doc => doc.path === filePath)

    if (idx > -1) {
      openFiles[idx].pinned = shouldBePinned
      // In this case, also trigger a sorting command, providing the same set
      // of paths because the sorter will make sure that, in case the tab is
      // now pinned, it will move to the left of the tab list.
      this._app.config.set('openFiles', openFiles)
      this.sortOpenFiles(this._loadedDocuments.map(f => f.path))
    }
  }

  /**
   * Returns true if the document identified by filePath is pinned. Returns false
   * both if the document is not pinned or if it is not in the openFiles array.
   *
   * @param   {string}   filePath  The file path
   *
   * @return  {boolean}            Whether the file is pinned
   */
  private isPinned (filePath: string): boolean {
    const openFiles: OpenDocument[] = this._app.config.get('openFiles')

    const doc = openFiles.find(d => d.path === filePath)

    if (doc === undefined) {
      this._app.log.error(`[Document Provider] Requested pin status for file ${filePath}, but the file was not in the openFiles array!`, openFiles)
      return false
    } else {
      return doc.pinned
    }
  }

  /**
   * Returns a file metadata object including the file contents.
   * @param {Object} file The file descriptor
   */
  public async getFileContents (file: MDFileDescriptor|CodeFileDescriptor): Promise<MDFileMeta|CodeFileMeta> {
    if (file.type === 'file') {
      const returnFile = FSALFile.metadata(file)
      if (file.dir !== ':memory:') {
        returnFile.content = await FSALFile.load(file)
      }
      return returnFile
    } else if (file.type === 'code') {
      const returnFile = FSALCodeFile.metadata(file)
      if (file.dir !== ':memory:') {
        returnFile.content = await FSALCodeFile.load(file)
      }
      return returnFile
    }

    throw new Error('[FSAL] Could not retrieve file contents: Invalid type or invalid descriptor.')
  }

  /**
   * Sets the given descriptor as active file.
   *
   * @param {MDFileDescriptor|CodeFileDescriptor|null} descriptorPath The descriptor to make active file
   */
  public set activeFile (descriptor: MDFileDescriptor|CodeFileDescriptor|null) {
    if (descriptor === null && this._activeFile !== null) {
      this._activeFile = null
      this._app.citeproc.loadMainDatabase()
      this._app.config.set('activeFile', null)
      this._emitter.emit('update', 'activeFile')
      broadcastIpcMessage('fsal-state-changed', 'activeFile')
    } else if (descriptor !== null && descriptor.path !== this.activeFile?.path) {
      const file = this.openFiles.find(file => file.path === descriptor.path)

      if (file !== undefined && this._loadedDocuments.includes(file)) {
        // Make sure the main database is set before, and only load an optional
        // bibliography file afterwards.
        this._app.citeproc.loadMainDatabase()
        // Make sure before selecting the file to load a potential file-specific
        // database. This can be defined (as for Pandoc) either directly in the
        // frontmatter OR in the metadata.
        if (file.type === 'file' && file.frontmatter !== null && 'bibliography' in file.frontmatter) {
          let dbFile: string = file.frontmatter.bibliography
          if (!path.isAbsolute(dbFile)) {
            // Convert to absolute path if necessary
            dbFile = path.resolve(file.dir, dbFile)
          }
          // We have a bibliography
          this._app.citeproc.loadAndSelect(dbFile)
            .finally(() => {
              // No matter what, we need to make the file active
              this._activeFile = file
              this._app.recentDocs.add(file.path)
              this._app.config.set('activeFile', this._activeFile.path)
              this._emitter.emit('update', 'activeFile')
              broadcastIpcMessage('fsal-state-changed', 'activeFile')
            })
            .catch(err => this._app.log.error(`[DocumentManager] Could not load file-specific database ${dbFile}`, err))
        } else {
          this._activeFile = file
          this._app.recentDocs.add(file.path)
          this._app.config.set('activeFile', this._activeFile.path)
          this._emitter.emit('update', 'activeFile')
          broadcastIpcMessage('fsal-state-changed', 'activeFile')
        }
      } else {
        console.error('Could not set active file. Either file was null or not in openFiles', descriptor, this.activeFile)
      }
    } // Else: No update necessary
  }

  /**
   * Returns the hash of the currently active file.
   * @returns {number|null} The hash of the active file.
   */
  public get activeFile (): MDFileDescriptor|CodeFileDescriptor|null {
    return this._activeFile
  }

  /**
   * Sets the modification flag on an open file
   */
  public markDirty (file: MDFileDescriptor|CodeFileDescriptor): void {
    if (!this._loadedDocuments.includes(file)) {
      this._app.log.error('[DocumentManager] Cannot mark dirty a non-open file!', file.path)
      return
    }

    if (file.type === 'file') {
      FSALFile.markDirty(file)
    } else if (file.type === 'code') {
      FSALCodeFile.markDirty(file)
    }

    // Notify whomever it concerns that the modification status has changed
    this._emitter.emit('document-modified-changed')
    if (this.isClean()) {
      this._emitter.emit('documents-all-clean')
    }
  }

  /**
   * Removes the modification flag on an open file
   */
  public markClean (file: MDFileDescriptor|CodeFileDescriptor): void {
    if (!this._loadedDocuments.includes(file)) {
      this._app.log.error('[DocumentManager] Cannot mark clean a non-open file!', file.path)
      return
    }

    if (file.type === 'file') {
      FSALFile.markClean(file)
    } else if (file.type === 'code') {
      FSALCodeFile.markClean(file)
    }

    // Notify whomever it concerns that the modification status has changed
    this._emitter.emit('document-modified-changed')
    if (this.isClean()) {
      this._emitter.emit('documents-all-clean')
    }
  }

  /**
   * Updates the modification flag of all open files based on their paths's
   * presence in the path list.
   *
   * @param   {string[]}  dirtyPaths  The paths to mark dirty. All other open
   *                                  files will be marked clean.
   */
  public updateModifiedFlags (dirtyPaths: string[]): void {
    for (const openFile of this._loadedDocuments) {
      if (dirtyPaths.includes(openFile.path)) {
        this.markDirty(openFile)
      } else {
        this.markClean(openFile)
      }
    }
  }

  /**
   * Returns true if none of the open files have their modified flag set.
   */
  public isClean (): boolean {
    for (const openFile of this._loadedDocuments) {
      if (openFile.modified) {
        return false
      }
    }
    return true
  }

  /**
   * Create a new file in memory (= unsaved and with no path assigned).
   */
  public async newUnsavedFile (type?: 'md'|'yaml'|'json'|'tex'): Promise<MDFileDescriptor|CodeFileDescriptor> {
    // First, find out where we should create the file -- either behind the
    // activeFile, or at the end of the list of open files.
    let activeIdx = this.openFiles.findIndex(file => file === this.activeFile)
    if (activeIdx < 0) {
      activeIdx = this.openFiles.length - 2
    }

    // The appendix of the filename will be a number related to the amount of
    // duplicate files in the open files array
    const filenamePattern = this._app.config.get('newFileNamePattern')
    const idGenPattern = this._app.config.get('zkn.idGen')
    let fname = generateFilename(filenamePattern, idGenPattern)
    const ext = path.extname(fname).toLowerCase()
    if (type !== 'md' && !hasCodeExt(fname)) {
      // The user has explicitly requested a code file so we must respect
      // the decision.
      if (type === 'tex' && ext !== '.tex') {
        fname += '.tex'
      } else if (type === 'json' && ext !== '.json') {
        fname += '.json'
      } else if (type === 'yaml' && ![ '.yaml', '.yml' ].includes(ext)) {
        fname += '.yaml'
      }
    } else if (!hasMarkdownExt(fname)) {
      fname += '.md'
    }

    const post = (this.openFiles.filter(f => f.name === fname).length > 0) ? '-1' : ''
    // Splice the "post" into the filename
    const finalFname = path.basename(fname, path.extname(fname)) + post + path.extname(fname)

    // Now create the file object. It's basically treated like a root file, but
    // with no real location on the file system associated.
    let file: MDFileDescriptor|CodeFileDescriptor

    if (type === 'md') {
      file = {
        parent: null,
        name: finalFname,
        dir: ':memory:', // Special location
        path: ':memory:/' + finalFname,
        // NOTE: Many properties are strictly speaking invalid
        hash: 0,
        size: 0,
        modtime: 0, // I'm waiting for that 01.01.1970 bug to appear ( ͡° ͜ʖ ͡°)
        creationtime: 0,
        ext: '.md',
        id: '',
        type: 'file',
        tags: [],
        links: [],
        bom: '',
        wordCount: 0,
        charCount: 0,
        target: undefined,
        firstHeading: null,
        frontmatter: null,
        linefeed: '\n',
        modified: false
      }
    } else {
      file = {
        parent: null,
        name: finalFname,
        dir: ':memory:', // Special location
        path: ':memory:/' + finalFname,
        // NOTE: Many properties are strictly speaking invalid
        hash: 0,
        size: 0,
        modtime: 0, // I'm waiting for that 01.01.1970 bug to appear ( ͡° ͜ʖ ͡°)
        creationtime: 0,
        ext: path.extname(finalFname),
        id: '',
        type: 'code',
        tags: [],
        bom: '',
        linefeed: '\n',
        modified: false
      }
    }

    // Now splice it at the correct position
    const openFiles = this.openFiles
    openFiles.splice(activeIdx + 1, 0, file)
    this.openFiles = openFiles // Will take care of all other things

    return file
  }

  public async saveFile (src: MDFileDescriptor|CodeFileDescriptor, content: string): Promise<void> {
    if (src.type === 'file') {
      await FSALFile.save(
        src,
        content,
        this._app.fsal.getMarkdownFileParser(),
        this._app.tags,
        null
      )
    } else {
      await FSALCodeFile.save(src, content, null)
    }

    // Notify that a file has saved, which strictly speaking does not
    // modify the openFiles array, but does change the modification flag.
    this._emitter.emit('update', 'fileSaved', src)
    broadcastIpcMessage('fsal-state-changed', 'openFiles')

    // Also, make sure to (re)load the file's bibliography file, if applicable.
    if (src.type === 'file' && src.frontmatter !== null && 'bibliography' in src.frontmatter) {
      let dbFile: string = src.frontmatter.bibliography
      if (!path.isAbsolute(dbFile)) {
        // Convert to absolute path if necessary
        dbFile = path.resolve(src.dir, dbFile)
      }
      // We have a bibliography
      this._app.citeproc.loadAndSelect(dbFile)
        .catch(err => this._app.log.error(`[FSAL] Could not load file-specific database ${dbFile}`, err))
    }
  }
}
