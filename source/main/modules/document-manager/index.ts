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
import { CodeFileDescriptor, CodeFileMeta, MDFileDescriptor, MDFileMeta } from '../fsal/types'
import { FSALCodeFile, FSALFile } from '../fsal'
import { codeFileExtensions, mdFileExtensions } from '../../../common/get-file-extensions'
import generateFilename from '../../../common/util/generate-filename'

const ALLOWED_CODE_FILES = codeFileExtensions(true)
const MARKDOWN_FILES = mdFileExtensions(true)

export default class DocumentManager extends EventEmitter {
  private _loadedDocuments: Array<MDFileDescriptor|CodeFileDescriptor>
  private _activeFile: MDFileDescriptor|CodeFileDescriptor|null
  private readonly _watcher: chokidar.FSWatcher

  constructor () {
    super()

    this._loadedDocuments = []
    this._activeFile = null

    let options: chokidar.WatchOptions = {
      persistent: true,
      ignoreInitial: true, // Do not track the initial watch as changes
      followSymlinks: true, // Follow symlinks
      ignorePermissionErrors: true, // In the worst case one has to reboot the software, but so it looks nicer.
      // See the description for the next vars in the fsal-watchdog.ts
      interval: 5000,
      binaryInterval: 5000
    }

    if (global.config.get('watchdog.activatePolling') as boolean) {
      let threshold: number = global.config.get('watchdog.stabilityThreshold')
      if (typeof threshold !== 'number' || threshold < 0) {
        threshold = 1000
      }

      // From chokidar docs: "[...] in some cases some change events will be
      // emitted while the file is being written." --> hence activate this.
      options.awaitWriteFinish = {
        'stabilityThreshold': threshold,
        'pollInterval': 100
      }

      global.log.info(`[DocumentManager] Activating file polling with a threshold of ${threshold}ms.`)
    }

    // Start up the chokidar process
    this._watcher = new chokidar.FSWatcher(options)

    this._watcher.on('all', (event: string, p: string) => {
      const descriptor = this._loadedDocuments.find(file => file.path === p)

      if (descriptor === undefined) {
        // Should not happen, but just in case
        global.log.warning(`[DocumentManager] Received a ${event}-event for ${p} but couldn't handle it.`)
        return
      }

      if (event === 'unlink') {
        // Just close the file (also handles activeFile and config changes)
        this.closeFile(descriptor)
      } else if (event === 'change') {
        this._loadFile(p)
          .then(newDescriptor => {
            if (newDescriptor.modtime !== descriptor.modtime) {
              // Replace the old descriptor with the newly loaded one
              this._loadedDocuments.splice(this._loadedDocuments.indexOf(descriptor), 1, newDescriptor)
              // Notify the caller, that the file has actually changed on disk.
              this.emit('update', 'openFileRemotelyChanged', newDescriptor)
            }
          })
          .catch(err => global.log.error(`[Document Manager] Could not reload remotely changed file ${p}!`, err))
      } else {
        global.log.warning(`[DocumentManager] Received unexpected event ${event} for ${p}.`)
      }
    })
  } // END constructor

  async init (): Promise<void> {
    // Loads in all openFiles
    const openFiles: string[] = global.config.get('openFiles')
    for (const filePath of openFiles) {
      try {
        const descriptor = await this._loadFile(filePath)
        this._loadedDocuments.push(descriptor)
      } catch (err) {
        global.log.error(`[Document Manager] Boot: Could not load file ${filePath}: ${String(err.message)}`, err)
      }
    }

    const actuallyLoadedPaths = this._loadedDocuments.map(file => file.path)

    this._watcher.add(actuallyLoadedPaths)

    this.emit('update', 'openFiles')
    // In case some of the files couldn't be loaded, make sure to re-set the config option accordingly.
    global.config.set('openFiles', actuallyLoadedPaths)

    // And make the correct file active
    const activeFile: string = global.config.get('activeFile')
    const activeDescriptor = this._loadedDocuments.find(elem => elem.path === activeFile)

    if (activeDescriptor !== undefined) {
      this._activeFile = activeDescriptor
      this.emit('update', 'activeFile')
    } else if (this._loadedDocuments.length > 0) {
      // Make another file active
      this._activeFile = this._loadedDocuments[0]
      this.emit('update', 'activeFile')
    }
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
    global.config.set('openFiles', this._loadedDocuments.filter(file => file.dir !== ':memory:').map(file => file.path))
    this.emit('update', 'openFiles')
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
   * @param {Array} hashArray An array with hashes to sort with
   * @return {Array} The new sorting
   */
  public sortOpenFiles (pathArray: string[]): Array<MDFileDescriptor|CodeFileDescriptor> {
    if (Array.isArray(pathArray)) {
      // Simply re-sort based on the new paths
      this._loadedDocuments.sort((a, b) => {
        return pathArray.indexOf(a.path) - pathArray.indexOf(b.path)
      })

      this.emit('update', 'openFiles')
      global.config.set('openFiles', this._loadedDocuments.filter(file => file.dir !== ':memory:').map(file => file.path))
    }

    return this._loadedDocuments
  }

  /**
   * Returns a file's metadata including the contents.
   * @param {Object} file The file descriptor
   */
  public async openFile (filePath: string): Promise<MDFileDescriptor|CodeFileDescriptor> {
    const openFile = this._loadedDocuments.find(file => file.path === filePath)
    if (openFile !== undefined) {
      return openFile
    }

    // Make sure to open the file adjacent of the activeFile, if possible.
    let idx = -1
    if (this._activeFile !== null) {
      idx = this._loadedDocuments.indexOf(this._activeFile)
    }

    const file = await this._loadFile(filePath)

    if (idx > -1) {
      this._loadedDocuments.splice(idx + 1, 0, file)
    } else {
      this._loadedDocuments.push(file)
    }

    this._watcher.add(file.path)
    this.emit('update', 'openFiles')
    global.config.set('openFiles', this._loadedDocuments.filter(file => file.dir !== ':memory:').map(file => file.path))
    return file
  }

  /**
   * Opens, reads, and parses a file to be loaded.
   * @param {String} filePath The file to be loaded
   */
  private async _loadFile (filePath: string): Promise<MDFileDescriptor|CodeFileDescriptor> {
    // Loads a standalone file
    const isCode = ALLOWED_CODE_FILES.includes(path.extname(filePath).toLowerCase())
    const isMD = MARKDOWN_FILES.includes(path.extname(filePath).toLowerCase())

    if (isCode) {
      const file = await FSALCodeFile.parse(filePath, null)
      // app.addRecentDocument(file.path)
      global.recentDocs.add(file.path)
      return file
    } else if (isMD) {
      const file = await FSALFile.parse(filePath, null)
      // app.addRecentDocument(file.path)
      global.recentDocs.add(file.path)
      return file
    } else {
      throw new Error(`Could not load file ${filePath}: Invalid path provided`)
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
   * Closes the given file if it's in fact open. This function also makes sure
   * to re-set the current active file if the file to be closed was the active
   * one.
   *
   * @param   {MDFileDescriptor|CodeFileDescriptor}  file  The file to be closed
   *
   * @return  {boolean}                                    Whether or not the file was closed
   */
  public closeFile (file: MDFileDescriptor|CodeFileDescriptor): boolean {
    if (!this._loadedDocuments.includes(file)) {
      return false
    }

    // Retrieve the index of the active file and whether it's an active file
    const activeFileIdx = this._loadedDocuments.findIndex(elem => elem === this._activeFile)
    const isActive = this._activeFile === file

    // Then remove the file from the list of open files
    this._loadedDocuments.splice(this._loadedDocuments.indexOf(file), 1)
    this._watcher.unwatch(file.path)
    this.emit('update', 'openFiles')
    global.config.set('openFiles', this._loadedDocuments.filter(file => file.dir !== ':memory:').map(file => file.path))

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
    return true
  }

  /**
   * Closes all open files.
   */
  public closeAllFiles (): void {
    this._watcher.unwatch(this._loadedDocuments.map(file => file.path))
    this._loadedDocuments = []
    this.emit('update', 'openFiles')
    global.config.set('openFiles', [])
  }

  /**
   * Sets the active file to the given hash or null.
   * @param {string|null} descriptorPath The path of the file to set as active
   */
  public set activeFile (descriptor: MDFileDescriptor|CodeFileDescriptor|null) {
    if (descriptor === null && this._activeFile !== null) {
      this._activeFile = null
      global.citeproc.loadMainDatabase()
      global.config.set('activeFile', null)
      this.emit('update', 'activeFile')
    } else if (descriptor !== null && descriptor.path !== this.activeFile?.path) {
      const file = this.openFiles.find(file => file.path === descriptor.path)

      if (file !== undefined && this._loadedDocuments.includes(file)) {
        // Add the file to the recent docs provider (or move it around)
        // global.recentDocs.add(this.getMetadataFor(file)) TODO
        // Make sure the main database is set before, and only load an optional
        // bibliography file afterwards.
        global.citeproc.loadMainDatabase()
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
          global.citeproc.loadAndSelect(dbFile)
            .finally(() => {
              // No matter what, we need to make the file active
              this._activeFile = file
              global.config.set('activeFile', this._activeFile.path)
              this.emit('update', 'activeFile')
            })
            .catch(err => global.log.error(`[DocumentManager] Could not load file-specific database ${dbFile}`, err))
        } else {
          this._activeFile = file
          global.config.set('activeFile', this._activeFile.path)
          this.emit('update', 'activeFile')
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
      global.log.error('[DocumentManager] Cannot mark dirty a non-open file!', file.path)
      return
    }

    if (file.type === 'file') {
      FSALFile.markDirty(file)
    } else if (file.type === 'code') {
      FSALCodeFile.markDirty(file)
    }
  }

  /**
   * Removes the modification flag on an open file
   */
  public markClean (file: MDFileDescriptor|CodeFileDescriptor): void {
    if (!this._loadedDocuments.includes(file)) {
      global.log.error('[DocumentManager] Cannot mark clean a non-open file!', file.path)
      return
    }

    if (file.type === 'file') {
      FSALFile.markClean(file)
    } else if (file.type === 'code') {
      FSALCodeFile.markClean(file)
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
        if (openFile.type === 'file') {
          FSALFile.markDirty(openFile)
        } else if (openFile.type === 'code') {
          FSALCodeFile.markDirty(openFile)
        }
      } else {
        if (openFile.type === 'file') {
          FSALFile.markClean(openFile)
        } else if (openFile.type === 'code') {
          FSALCodeFile.markClean(openFile)
        }
      }
    }

    // Notify whomever it concerns that the modification status has changed
    this.emit('document-modified-changed')

    if (this.isClean()) {
      // Indicate that now there are no modified documents anymore
      this.emit('documents-all-clean')
    }
  }

  /**
   * Returns true if none of the open files have their modified flag set.
   */
  public isClean (): boolean {
    for (let openFile of this._loadedDocuments) {
      if (openFile.modified) {
        return false
      }
    }
    return true
  }

  /**
   * Create a new file in memory (= unsaved and with no path assigned).
   */
  public async newUnsavedFile (): Promise<MDFileDescriptor> {
    // First, find out where we should create the file -- either behind the
    // activeFile, or at the end of the list of open files.
    let activeIdx = this.openFiles.findIndex(file => file === this.activeFile)
    if (activeIdx < 0) {
      activeIdx = this.openFiles.length - 2
    }

    // The appendix of the filename will be a number related to the amount of
    // duplicate files in the open files array
    const fname = generateFilename()
    const post = (this.openFiles.filter(f => f.name === fname).length > 0) ? '-1' : ''
    // Splice the "post" into the filename
    const finalFname = path.basename(fname, path.extname(fname)) + post + path.extname(fname)

    // Now create the file object. It's basically treated like a root file, but
    // with no real location on the file system associated.
    const file: MDFileDescriptor = {
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
      bom: '',
      wordCount: 0,
      charCount: 0,
      target: undefined,
      firstHeading: null,
      frontmatter: null,
      linefeed: '\n',
      modified: false
    }

    // Now splice it at the correct position
    const openFiles = this.openFiles
    openFiles.splice(activeIdx + 1, 0, file)
    this.openFiles = openFiles // Will take care of all other things

    return file
  }

  public async saveFile (src: MDFileDescriptor|CodeFileDescriptor, content: string): Promise<void> {
    if (src.type === 'file') {
      await FSALFile.save(src, content, null)
    } else {
      await FSALCodeFile.save(src, content, null)
    }

    // Notify that a file has saved, which strictly speaking does not
    // modify the openFiles array, but does change the modification flag.
    this.emit('update', 'fileSaved', src)

    // Also, make sure to (re)load the file's bibliography file, if applicable.
    if (src.type === 'file' && src.frontmatter !== null && 'bibliography' in src.frontmatter) {
      let dbFile: string = src.frontmatter.bibliography
      if (!path.isAbsolute(dbFile)) {
        // Convert to absolute path if necessary
        dbFile = path.resolve(src.dir, dbFile)
      }
      // We have a bibliography
      global.citeproc.loadAndSelect(dbFile)
        .catch(err => global.log.error(`[FSAL] Could not load file-specific database ${dbFile}`, err))
    }
  }
}
