import type LogProvider from '@providers/log'
import type FSAL from '@providers/fsal'
import type { DirDescriptor, MDFileDescriptor, CodeFileDescriptor, OtherFileDescriptor } from '@dts/common/fsal'
import _ from 'lodash'
import { mergeEventsIntoTree } from './merge-events-into-tree'
import type FSALWatchdog from '@providers/fsal/fsal-watchdog'

// How many events do we keep in the change queue before merging them into the
// file tree? This number dictates how much memory a root will use up. The root
// descriptor works as a "sink" where we can dump extraneous events into, so the
// overall memory consumption will always be size of root + MAX_CHANGE_QUEUE
// events x size of a single event
const MAX_CHANGE_QUEUE = 100

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

export type ChangeDescriptor = AddEvent | ChangeEvent | UnlinkEvent
type AnyDescriptor = DirDescriptor|MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor
type ChokidarEvents = 'add'|'addDir'|'change'|'unlink'|'unlinkDir'

interface RootCallbacks {
  onChange: (rootPath: string) => void
  onUnlink: (rootPath: string) => void
}

export interface InitialTreeData {
  descriptor: AnyDescriptor
  changes: ChangeDescriptor[]
  currentVersion: number
}

export class Root {
  private readonly log: LogProvider
  private readonly fsal: FSAL
  public readonly rootPath: string
  private rootDescriptor: AnyDescriptor
  private readonly _process: FSALWatchdog
  private readonly eventQueue: Array<{ eventName: ChokidarEvents, eventPath: string }>
  private readonly changeQueue: ChangeDescriptor[]
  private readonly onChangeCallback: (rootPath: string) => void
  private readonly onUnlinkCallback: (rootPath: string) => void
  private isProcessingEvent: boolean
  private currentVersion: number

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

    this.currentVersion = 0

    if (descriptor.type === 'directory' && descriptor.dirNotFoundFlag === true) {
      // This root exclusively represents an "empty" directory, so attempting to
      // "watch" its path will lead to errors, since the path does not exist.
      return
    }

    this._process = this.fsal.watchPath(this.rootPath)

    this._process.on('change', (eventName, eventPath) => {
      this.eventQueue.push({ eventName, eventPath })

      if (this.isProcessingEvent) {
        return // The loop will automatically pick this event up
      }

      this.processNextEvent()
        .catch(err => {
          this.log.error(`[Workspace Provider] Could not handle event ${eventName}:${eventPath}`, err)
        })
    })
  }

  async prepareShutdown (): Promise<void> {
    await this._process.shutdown()
  }

  private async processNextEvent (): Promise<void> {
    if (this.isProcessingEvent) {
      return // Work sequentially through the event queue
    }

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
      this.currentVersion++
    } else {
      console.log('Add or change event')
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
        this.currentVersion++
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
   * This function returns the required information to set up a listener that
   * can sync the filetree represented by this root with any additional changes.
   *
   * @return  {InitialTreeData}  The initial tree data
   */
  public getInitialTreeData (): InitialTreeData {
    return {
      descriptor: this.rootDescriptor,
      changes: this.changeQueue,
      currentVersion: this.currentVersion
    }
  }

  /**
   * Call this function with a version number to receive the changes that can be
   * applied to a remote tree in order to bring it up to date with the current
   * state of the file system. NOTE: If version indicates the receiver is so out
   * of date that we do not have the necessary change set anymore to synchronize
   * their remove state, this function will automatically return a set of
   * initial tree data, making it simple for the receiver to re-initialize
   * itself. This can happen if (a) the IPC channel is clogged (unlikely), or if
   * (b) so many changes have happened that we had to roll over the version
   * number (may happen with larger file trees).
   *
   * @param   {number}                              version  The version of the
   *                                                         remote receiver
   *
   * @return  {ChangeDescriptor[]|InitialTreeData}           Either a set of
   *                                                         changes (if the
   *                                                         receiver is up-to-
   *                                                         date), or an entire
   *                                                         set of tree data,
   *                                                         if the receiver is
   *                                                         too outdated
   */
  public getChangesSince (version: number): ChangeDescriptor[]|InitialTreeData {
    const lastSupportedVersion = this.currentVersion - this.changeQueue.length
    if (version < lastSupportedVersion || version > this.currentVersion) {
      // The renderer is completely outdated, or the version string has rolled
      // over. In both cases, the renderer has to re-initialize.
      return this.getInitialTreeData()
    } else {
      return this.changeQueue.slice(version - lastSupportedVersion)
    }
  }

  /**
   * This function ensures that the changeQueue does not exceed MAX_CHANGE_QUEUE
   * and merges the surplus events into the root descriptor tree.
   */
  afterProcessEvent (): void {
    if (this.changeQueue.length > MAX_CHANGE_QUEUE) {
      const eventsToMerge = this.changeQueue.splice(0, this.changeQueue.length - MAX_CHANGE_QUEUE)
      this.rootDescriptor = mergeEventsIntoTree(eventsToMerge, this.rootDescriptor)
    }
  }
}