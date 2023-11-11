import type LogProvider from '@providers/log'
import type FSAL from '@providers/fsal'
import type { DirDescriptor, MDFileDescriptor, CodeFileDescriptor, OtherFileDescriptor } from '@dts/common/fsal'
import { FSWatcher, type WatchOptions } from 'chokidar'
import locateByPath from '@providers/fsal/util/locate-by-path'
import path from 'path'
import _ from 'lodash'

/**
 * This function takes a series of change events for the file trees and merges
 * those one after another into the provided tree, modifying it in place. NOTE:
 * This requires that the events are actually accumulated for this tree;
 * providing another tree will lead to errors and inconsistencies.
 *
 * @param   {ChangeDescriptor[]}  events  The list of changes
 * @param   {AnyDescriptor}       tree    The tree to merge the changes into
 */
function mergeEventsIntoTree (events: ChangeDescriptor[], tree: AnyDescriptor): void {
  for (const event of events) {
    if (event.type === 'add') {
      // Find the parent, and add the given descriptor to its children
      const parent = locateByPath(tree, event.descriptor.dir)
      if (parent === undefined || parent.type !== 'directory') {
        throw new Error('Received an add event, but the tree descriptor did not contain its parent!')
      }

      // TODO: Sort the parent properly!!!
      parent.children.push(event.descriptor)
    } else if (event.type === 'change') {
      const parent = locateByPath(tree, event.descriptor.dir)

      if (parent === undefined || parent.type !== 'directory') {
        throw new Error('Received a change event, but the tree descriptor did not contain its parent!')
      }

      const idx = parent.children.findIndex(desc => desc.path === event.path)

      if (idx < 0) {
        throw new Error('Received a change event but could not find the old descriptor in the parent!')
      }

      if (event.descriptor.type === 'directory') {
        // Ensure to carry over the recursive children array
        event.descriptor.children = (parent.children[idx] as DirDescriptor).children
      }

      parent.children.splice(idx, 1, event.descriptor)
    } else {
      // Unlink event
      const parent = locateByPath(tree, path.dirname(event.path))
      if (parent === undefined || parent.type !== 'directory') {
        throw new Error('Received an unlink event but could not find its parent!')
      }

      const idx = parent.children.findIndex(desc => desc.path === event.path)

      if (idx < 0) {
        throw new Error('Could not remove descriptor from tree!')
      }

      parent.children.splice(idx, 1)
    }
  }
}

// How many events do we keep in the change queue before merging them into the
// file tree?
const MAX_CHANGE_QUEUE = 10 // DEBUG

// chokidar's ignored-setting is compatible to anymatch, so we can
// pass an array containing the standard dotted directory-indicators,
// directories that should be ignored and a function that returns true
// for all files that are _not_ in the filetypes list (whitelisting)
// Further reading: https://github.com/micromatch/anymatch
const ignoreDirs = [
  // Ignore dot-dirs/files, except .git (to detect changes to possible
  // git-repos) and .ztr-files (which contain, e.g., directory settings)
  // /(?:^|[/\\])\.(?!git|ztr-.+).+/ // /(^|[/\\])\../
  /(?:^|[/\\])\.(?!git$|ztr-[^\\/]+$).+/
]

interface AddEvent {
  type: 'add'
  path: string
  descriptor: AnyDescriptor
}

interface ChangeEvent {
  type: 'change'
  path: string
  descriptor: AnyDescriptor
}

interface UnlinkEvent {
  type: 'unlink'
  path: string
}

type ChangeDescriptor = AddEvent | ChangeEvent | UnlinkEvent
type AnyDescriptor = DirDescriptor|MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor
type ChokidarEvents = 'add'|'addDir'|'change'|'unlink'|'unlinkDir'

interface RootCallbacks {
  onChange: (rootPath: string) => void
  onUnlink: (rootPath: string) => void
}

export class Root {
  private readonly log: LogProvider
  private readonly fsal: FSAL
  private readonly rootPath: string
  private readonly rootDescriptor: AnyDescriptor
  private readonly _process: FSWatcher
  private readonly eventQueue: Array<{ eventName: ChokidarEvents, eventPath: string }>
  private readonly changeQueue: ChangeDescriptor[]
  private readonly onChangeCallback: (rootPath: string) => void
  private readonly onUnlinkCallback: (rootPath: string) => void
  private isProcessingEvent: boolean

  constructor (
    descriptor: AnyDescriptor,
    logger: LogProvider,
    fsal: FSAL,
    callbacks: RootCallbacks
  ) {
    this.log = logger
    this.fsal = fsal
    this.rootPath = descriptor.path
    this.rootDescriptor = descriptor
    this.eventQueue= []
    this.changeQueue = []
    this.isProcessingEvent = false
    this.onChangeCallback = callbacks.onChange
    this.onUnlinkCallback = callbacks.onUnlink

    const options: WatchOptions = {
      useFsEvents: process.platform === 'darwin',
      ignored: ignoreDirs,
      persistent: true,
      ignoreInitial: true, // Do not track the initial watch as changes
      followSymlinks: true, // Follow symlinks
      ignorePermissionErrors: true, // In the worst case one has to reboot the software, but so it looks nicer.

      // Chokidar should always be using fsevents, but we will be leaving this
      // in here both in case something happens in the future, and for nostalgic
      // reasons.
      interval: 5000,
      binaryInterval: 5000
    }

    this._process = new FSWatcher(options)

    this._process.on('all', (eventName, eventPath) => {
      this.eventQueue.push({ eventName, eventPath })

      if (this.isProcessingEvent) {
        return // The loop will automatically pick this event up
      }

      this.processNextEvent()
        .catch(err => {
          this.log.error(`[Workspace Provider] Could not handle event ${eventName}:${eventPath}`, err)
        })
    })

    // Watch this root
    this._process.add(this.rootPath)
  }

  async prepareShutdown (): Promise<void> {
    this._process.unwatch(this.rootPath)
    await this._process.close()
  }

  async processNextEvent (): Promise<void> {
    if (this.isProcessingEvent) {
      return // Work sequentially through the event queue
    }

    console.log('PROCESS')

    // Immediately lock the function
    this.isProcessingEvent = true

    const nextEvent = this.eventQueue.shift()
    if (nextEvent === undefined) {
      this.isProcessingEvent = false
      return // Event queue is empty
    }

    const { eventName, eventPath } = nextEvent
    console.log('PROCESSING EVENT:', eventName, eventPath) // DEBUG

    const isUnlink = eventName === 'unlink' || eventName === 'unlinkDir'

    if (isUnlink && eventPath === this.rootPath) {
      // The root itself has been removed from disk
      this.onUnlinkCallback(this.rootPath)
      return
    } else if (isUnlink) {
      // Some file within the root (directory) has been removed
      this.changeQueue.push({ type: 'unlink', path: eventPath })
    } else {
      // Change or add
      try {
        // Load directories "shallow", no recursive parsing here
        // DEBUG/TODO: Since the FSAL may return a descriptor from its cache,
        // we have to decouple that here. REMOVE WHEN LOGIC CHANGE IS DONE IN FSAL
        const descriptor = _.cloneDeep(await this.fsal.loadAnyPath(eventPath, true))
        if (descriptor.type === 'directory') {
          descriptor.children = [] // Keep the change queue shallow; the merger accounts for that
        }

        this.changeQueue.push({
          type: eventName === 'change' ? 'change' : 'add',
          path: eventPath,
          descriptor
        })
      } catch (err: any) {
        this.log.error(`[Workspace Provider] Could not process event ${eventName}:${eventPath}`, err)
      }
    }

    // Now we either have a new root or a change in the queue.
    this.isProcessingEvent = false

    // Notify that one change has just been processed
    this.onChangeCallback(this.rootPath)

    // Immediately process the next event if new events have been added in the meantime.
    if (this.eventQueue.length > 0) {
      await this.processNextEvent()
    } else {
      // After all events have been accounted for, clean up the changeQueue to
      // keep it at maximum MAX_CHANGE_QUEUE elements
      this.afterProcessEvent()
    }
  }

  /**
   * This function ensures that the changeQueue does not exceed MAX_CHANGE_QUEUE
   * and merges the surplus events into the root descriptor tree.
   */
  afterProcessEvent (): void {
    if (this.changeQueue.length > MAX_CHANGE_QUEUE) {
      const eventsToMerge = this.changeQueue.splice(0, this.changeQueue.length - MAX_CHANGE_QUEUE)
      // console.log('MERGING EVENTS INTO TREE:', eventsToMerge)
      mergeEventsIntoTree(eventsToMerge, this.rootDescriptor)
      // console.log(this.rootDescriptor)
    }
  }
}
