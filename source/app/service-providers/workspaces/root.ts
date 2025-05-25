import type LogProvider from '@providers/log'
import type FSAL from '@providers/fsal'
import type { DirDescriptor, MDFileDescriptor, CodeFileDescriptor, OtherFileDescriptor } from '@dts/common/fsal'
import { mergeEventsIntoTree } from './merge-events-into-tree'
import type FSALWatchdog from '@providers/fsal/fsal-watchdog'
import { getSorter } from '@providers/fsal/util/directory-sorter'
import type ConfigProvider from '@providers/config'
import { sortDirectory } from './sort-all-directories'
import type { EventName } from 'chokidar/handler'

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

interface RootCallbacks {
  onChange: (rootPath: string) => void
  onUnlink: (rootPath: string) => void
}

export interface InitialTreeData {
  descriptor: AnyDescriptor
  changes: ChangeDescriptor[]
  currentVersion: number
}

/**
 * Small utility function that extracts the given property from all the file
 * descriptors. `prop` must be a key on MDFileDescriptor.
 *
 * @param   {AnyDescriptor}            root  The tree root
 * @param   {Key}                      prop  The property to extract
 *
 * @return  {Array<string, Type>}        A list of filename->property mappings
 */
function extractFromFileDescriptors<Key extends keyof MDFileDescriptor, Type = MDFileDescriptor[Key]> (root: AnyDescriptor, prop: Key): Array<[string, Type]> {
  if (root.type === 'directory') {
    const links = []
    for (const child of root.children) {
      links.push(...extractFromFileDescriptors(child, prop))
    }
    return links
  } else if (root.type === 'file') {
    return [[ root.path, root[prop] ]]
  } else {
    return []
  }
}

export class Root {
  // Dependencies
  private readonly log: LogProvider
  private readonly fsal: FSAL
  private readonly config: ConfigProvider

  // The root this instance represents
  public readonly rootPath: string
  public rootDescriptor: AnyDescriptor

  // State for listening to changes
  private readonly _process: FSALWatchdog
  private readonly eventQueue: Array<{ eventName: EventName, eventPath: string }>
  private readonly changeQueue: ChangeDescriptor[]
  private readonly onChangeCallback: (rootPath: string) => void
  private readonly onUnlinkCallback: (rootPath: string) => void
  private isProcessingEvent: boolean
  private currentVersion: number

  // Additional state that we keep track of here because it's more efficient.
  // The linkMap and tagMap can be kept insanely efficient by simple hooking
  // into the event processor to grab any changing links or tags.
  private readonly linkMap: Map<string, string[]>
  private readonly tagMap: Map<string, string[]>
  private readonly idMap: Map<string, string>

  constructor (
    descriptor: AnyDescriptor,
    logger: LogProvider,
    config: ConfigProvider,
    fsal: FSAL,
    callbacks: RootCallbacks
  ) {
    this.log = logger
    this.config = config
    this.fsal = fsal

    // TODO: Sort the workspaces AGAIN when the configuration pertaining to the
    // directory sorting has changed! --> subscribe to the config events

    this.rootPath = descriptor.path
    this.rootDescriptor = descriptor
    this.eventQueue= []
    this.changeQueue = []
    this.isProcessingEvent = false
    this.onChangeCallback = callbacks.onChange
    this.onUnlinkCallback = callbacks.onUnlink

    this.currentVersion = 0

    this.linkMap = new Map(extractFromFileDescriptors(this.rootDescriptor, 'links'))
    this.tagMap = new Map(extractFromFileDescriptors(this.rootDescriptor, 'tags'))
    this.idMap = new Map(extractFromFileDescriptors(this.rootDescriptor, 'id'))

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

    if (this.rootDescriptor.type === 'directory') {
      this.config.on('update', (option: string) => {
        // The config has changed, so sort all our directories according to the
        // new settings.
        if (![ 'sorting', 'sortFoldersFirst', 'fileNameDisplay', 'appLang', 'sortingTime' ].includes(option)) {
          return
        }

        const { sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime } = this.config.get()
        const sorter = getSorter(sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime)
        sortDirectory(this.rootDescriptor as DirDescriptor, sorter)
      })
    }
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

    let hasError = false

    const isUnlink = eventName === 'unlink' || eventName === 'unlinkDir'

    const { sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime } = this.config.get()
    const sorter = getSorter(sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime)

    if (isUnlink && eventPath === this.rootPath) {
      // The root itself has been removed from disk
      this.onUnlinkCallback(this.rootPath)
      return
    } else if (isUnlink) {
      // Some file within the root (directory) has been removed
      const change: ChangeDescriptor = { type: 'unlink', path: eventPath }
      this.rootDescriptor = mergeEventsIntoTree([change], this.rootDescriptor, sorter)
      this.changeQueue.push(change)
      this.linkMap.delete(eventPath)
      this.tagMap.delete(eventPath)
      this.idMap.delete(eventPath)
      this.currentVersion++
    } else {
      // Change or add
      try {
        if (eventPath === this.rootPath && eventName.startsWith('addDir')) {
          // I noticed this issue on my Nextcloud setup on my MBP 14in M2 Pro in
          // April 2024. Somehow the Nextcloud provider was re-adding a root
          // every time. This is a bug with them, however, as the bug
          // disappeared once I stopped the Nextcloud sync. I'll leave this here
          // in case other providers also do something funky in the future.
          throw new Error('There was an add event on the root descriptor which doesnt make sense -- ignoring')
        }

        // Load directories "shallow", no recursive parsing here
        const descriptor = await this.fsal.loadAnyPath(eventPath, true)
        if (descriptor.type === 'directory') {
          descriptor.children = [] // Keep the change queue shallow; the merger accounts for that
        }

        const change: ChangeDescriptor = {
          type: eventName === 'change' ? 'change' : 'add',
          path: eventPath,
          descriptor
        }

        this.rootDescriptor = mergeEventsIntoTree([change], this.rootDescriptor, sorter)
        this.changeQueue.push(change)

        if (descriptor.type === 'file') {
          this.linkMap.set(descriptor.path, descriptor.links)
          this.tagMap.set(descriptor.path, descriptor.tags)
          this.idMap.set(descriptor.path, descriptor.id)
        }

        this.currentVersion++
      } catch (err: any) {
        this.log.error(`[Workspace Provider] Could not process event ${eventName}:${eventPath}`, err)
        hasError = true
      }
    }

    // Now we either have a new root or a change in the queue.
    this.isProcessingEvent = false

    // Notify that one change has just been processed, but only if there was no
    // error to prevent consumers of these events to run into trouble.
    if (!hasError) {
      this.onChangeCallback(this.rootPath)
    }

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
   * Returns all internal links back and forth between all the files within this
   * workspace.
   *
   * @return  {Map<string, string[]>}  A map of links in the form filepath -> link[]
   */
  public getLinks (): Map<string, string[]> {
    return this.linkMap
  }

  /**
   * Returns all tags/keywords of files within this workspace.
   *
   * @return  {Map<string, string[]>}  A map of tags in the form filepath -> tag[]
   */
  public getTags (): Map<string, string[]> {
    return this.tagMap
  }

  /**
   * Returns all file IDs within this workspace.
   *
   * @return  {Map<string, string>}  A Map of filepaths to IDs.
   */
  public getIds (): Map<string, string> {
    return this.idMap
  }

  /**
   * Call this function with a version number to receive the changes that can be
   * applied to a remote tree in order to bring it up to date with the current
   * state of the file system. NOTE: If version indicates the receiver is so out
   * of date that we do not have the necessary change set anymore to synchronize
   * their remote state, this function will automatically return a set of
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
      // NOTE: We do not have to merge these events since they will be merged
      // immediately at the source.
      this.changeQueue.splice(0, this.changeQueue.length - MAX_CHANGE_QUEUE)
    }
  }
}
