/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LongRunningTaskProvider
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This provider implements an interface to handle potentially
 *                  long-running tasks around the app. It tries to make it as
 *                  easy as possible for other providers and commands to
 *                  register and handle long running tasks, and it tries to make
 *                  it as easy as possible for renderer processes to ingest this
 *                  information and display it to the users. The objects in this
 *                  class merely represent *metadata*, meaning that the caller
 *                  who registers such a task is responsible for actually
 *                  performing the task. The objects in this class are
 *                  exclusively meant to indicate to the user that there is
 *                  something going on in the background. Partial background for
 *                  this class is that exports can take quite a long time, and
 *                  before this class was written, there was zero feedback on
 *                  the process.
 *
 *                  HOW TO IDENTIFY A LONG-RUNNING TASK
 *                  ===================================
 *
 *                  The first question is: What even is a long-running task? For
 *                  the purposes of this app, the definition is simply: Any
 *                  process that has a discernible start and end, which pertains
 *                  to a user-action, where the user needs to know both  when
 *                  its done, and with what result, and which is non-obvious or
 *                  hard to detect from looking at the app itself. Please note
 *                  average time to completion are part of this definition. Even
 *                  if a task runs almost instantly on *your* computer does not
 *                  mean it will run quickly on other people's computer.
 *                  Likewise, just because it finishes almost instantly for
 *                  *most* users, doesn't mean it's not that neither the actual
 *                  time of a long-running task, nor the a long-running task.
 *
 *                  Natural examples of long-running tasks (for which this class
 *                  was primarily written):
 *
 *                  * Exports (both single file and projects, but especially
 *                    projects)
 *                  * Loading new workspaces (the indexing process)
 *
 *                  HOW TO USE THIS PROVIDER
 *                  ========================
 *
 *                  When you are writing a new process or user-command that
 *                  might take a while to complete in the background, or if you
 *                  spot a task that would be an ideal candidate for a LRT, you
 *                  will first "register" the task with the provider itself.
 *                  This registration will give you an object of class
 *                  "LongRunningTask" that is properly hooked up. As your task
 *                  progresses, you update the LRT object accordingly. Once the
 *                  task is complete, you mark the object as finished, providing
 *                  a reason, etc.
 *
 *                  Your responsibilities:
 *
 *                  * Create a NEW LRT for every long-running process you start
 *                  * ALWAYS finalize the LRT. Any LRTs that are still running
 *                    when the app is shutting down is considered an error, so
 *                    depending on how intricate your process is, this could
 *                    lead to red herrings.
 *
 * END HEADER
 */

import { DateTime, type Duration } from 'luxon'
import ProviderContract from '../provider-contract'
import { v4 as uuid } from 'uuid'
import type LogProvider from '../log'
import broadcastIPCMessage from 'source/common/util/broadcast-ipc-message'
import { ipcMain } from 'electron'
import { EventEmitter } from 'stream'

// How often should long running tasks broadcast a status update (in ms)?
const LRT_UPDATE_DEBOUNCE = 100

export interface LRTIPCGetMessage {
  command: 'get-tasks'
}

export interface LRTIPCAbortMessage {
  command: 'abort-task'
  payload: { id: string }
}

export interface LRTIPCDeleteMessage {
  command: 'delete-task'
  payload: { id: string }
}

export interface LRTIPCUpdateMessage {
  command: 'update-task',
  payload: { task: LRT_JSON }
}

export interface LRTIPCNewTaskMessage {
  command: 'new-task'
  payload: { task: LRT_JSON }
}

export type LRTIPCSyncMessage = LRTIPCAbortMessage|LRTIPCNewTaskMessage|LRTIPCUpdateMessage|LRTIPCDeleteMessage
export type LRTIPCAsyncMessage = LRTIPCGetMessage|LRTIPCDeleteMessage

/**
 * Enum of all status a task can have.
 */
export enum TaskStatus {
  /**
   * The task is still ongoing
   */
  'ongoing',
  /**
   * The task has finished successfully
   */
  'finished',
  /**
   * The task has errored out
   */
  'error',
  /**
   * The task has been aborted
   */
  'aborted'
}

/**
 * A JSON-serializable representation of a task
 */
export interface LRT_JSON {
  id: string
  status: TaskStatus
  error?: { name: string, message: string }
  startTime: string
  endTime?: string
  title: string
  info?: string
  currentTaskPercentage?: number
  abortable: boolean
}

// Events the LRT can emit
interface LRT_EventMap {
  // When the task is aborted
  task_aborted: Array<() => void>
  // When the task errors out
  // NOTE: We cannot emit a literal "error" event as these are special:
  // https://nodejs.org/docs/latest/api/events.html#error-events
  task_errored: Array<() => void>
  // When the task finishes
  task_finished: Array<() => void>
}

export class LongRunningTask extends EventEmitter<LRT_EventMap> {
  /**
   * The current status of the task.
   *
   * @var {TaskStatus}
   */
  private status: TaskStatus

  /**
   * If this is not undefined, the task has experienced an error, and this
   * variable contains an error describing this.
   *
   * @var {Error|undefined}
   */
  private error: Error|undefined

  /**
   * Whether this task is user-abortable. The GUI component must implement a way
   * for the user to send an abort-signal to the provider, if this is true. NOTE
   * that every task can be aborted programmatically.
   *
   * @var {boolean}
   */
  private abortable: boolean

  /**
   * Holds the timestamp when this task was registered with the provider
   *
   * @var {DateTime}
   */
  private startTime: DateTime<true>

  /**
   * Holds the timestamp when this task was marked ended (regardless of reason).
   * Will be undefined as long as the task is not yet finished.
   *
   * @var {DateTime|undefined}
   */
  private endTime: DateTime|undefined
  
  /**
   * A short description of the task that should be presented as a title.
   *
   * @var {string}
   */
  private title: string

  /**
   * An optional (longer) description of the task that can contain more info.
   *
   * @var {string|undefined}
   */
  private info: string|undefined

  /**
   * Some tasks can have a definable progress. In that case, this property
   * contains the percentage "done" for this task (number between 0 and 1).
   *
   * @var {number|undefined}
   */
  private currentTaskPercentage: number|undefined

  /**
   * This variable is used to hold a debounce promise to ensure the provider
   * does not flood the IPC pipe with messages in case a task is updated
   * extremely often.
   *
   * @var {Promise<void>|undefined}
   */
  private debouncePromise: Promise<void>|undefined
  private debounceFlag: boolean

  /**
   * Creates a new LRT representation object.
   *
   * @param  {string}  id         A unique ID that can be attached to this LRT.
   * @param {string}   title      The title/short description of the task
   * @param {string}   info       Optional longer description/info-string.
   * @param {boolean}  abortable  Whether this task is user-abortable (default: true)
   */
  constructor (public readonly id: string, title: string, info?: string, abortable: boolean = true) {
    super()
    this.title = title
    this.info = info
    this.startTime = DateTime.now()
    this.status = TaskStatus.ongoing
    this.abortable = abortable
    this.debounceFlag = false
  }

  /**
   * Broadcasts any changes to this task status to all open renderers. Utilizes
   * a debounce mechanism to ensure the updates are throttled.
   */
  private broadcastChange () {
    if (this.debouncePromise !== undefined) {
      this.debounceFlag = true
      return
    }

    broadcastIPCMessage('lrt-provider', { command: 'update-task', payload: { task: this.toJSON() } } as LRTIPCSyncMessage)
    let resolve = () => {}
    this.debouncePromise = new Promise<void>((r) => { resolve = r })
    setTimeout(() => {
      this.debouncePromise = undefined
      resolve()
      if (this.debounceFlag) {
        this.debounceFlag = false
        this.broadcastChange()
      }
    }, LRT_UPDATE_DEBOUNCE)
  }

  /**
   * Updates the task with new information. Will broadcast an update event to
   * all listeners.
   *
   * @param  {any}  data  The data to update.
   */
  public update (data: Partial<{ title: string, info: string, percentage: number, abortable: boolean }>) {
    this.title = data.title ?? this.title
    this.info = data.info ?? this.info
    this.currentTaskPercentage = data.percentage ?? this.currentTaskPercentage
    this.abortable = data.abortable ?? this.abortable
    this.broadcastChange()
  }

  /**
   * Is this task user-abortable?
   *
   * @return  {boolean}  Whether the task is abortable.
   */
  public get isAbortable (): boolean {
    return this.abortable
  }

  /**
   * Ends the task. You must provide a reason (due to abort, due to an error, or
   * successful). If you end the task with an error, you must provide an error
   * object explaining the error.
   *
   * @param   {string} reason  The ending reason
   * @param   {Error}  error  If reason is "error", this must contain an error
   *                          object with more details.
   */
  public endTask (reason: 'abort'|'success'): void
  public endTask (reason: 'error', error: Error): void
  public endTask (reason: 'abort'|'error'|'success' = 'success', error?: Error): void {
    this.endTime = DateTime.now()

    switch (reason) {
      case 'abort':
        this.status = TaskStatus.aborted
        this.emit('task_aborted')
        break
      case 'error':
        this.status = TaskStatus.error
        this.error = error
        console.error(error)
        this.emit('task_errored')
        break
      case 'success':
        this.status = TaskStatus.finished
        this.emit('task_finished')
    }
    this.broadcastChange()
  }

  //

  public getElapsed (): Duration {
    const end = (this.endTime ?? DateTime.now())
    const dur = end.diff(this.startTime, [ 'days', 'hours', 'minutes', 'seconds', 'milliseconds' ])
    return dur
  }

  public getStatus (): TaskStatus {
    return this.status
  }

  /**
   * Serializes this LRT into a JSON object for transmission over IPC pipes.
   *
   * @return  {LRT_JSON}  A serialized JSON form of the task.
   */
  public toJSON (): LRT_JSON {
    return {
      id: this.id, title: this.title, info: this.info,
      error: this.error !== undefined ? { name: this.error.name, message: this.error.message } : undefined,
      status: this.status, startTime: this.startTime.toISO(), endTime: this.endTime?.toISO() ?? undefined,
      currentTaskPercentage: this.currentTaskPercentage,
      abortable: this.abortable
    }
  }
}

export default class LongRunningTaskProvider extends ProviderContract {
  private tasks: LongRunningTask[]

  constructor (private readonly logger: LogProvider) {
    super()
    this.tasks = []

    ipcMain.on('lrt-provider', (event, args: LRTIPCSyncMessage) => {
      if (args.command === 'abort-task') {
        const task = this.tasks.find(t => t.id === args.payload.id)

        if (task === undefined) {
          throw new Error(`Cannot abort task with ID ${args.payload.id}: Not found.`)
        }

        if (!task.isAbortable) {
          throw new Error(`Cannot abort task ${task.id}: This task cannot be aborted.`)
        }

        task.endTask('abort')
      }
    })

    ipcMain.handle('lrt-provider', (event, args: LRTIPCAsyncMessage) => {
      if (args.command === 'get-tasks') {
        return this.tasks.map(task => task.toJSON())
      } else if (args.command === 'delete-task') {
        return this.deleteTask(args.payload.id)
      }
    })
  }

  public async boot () {}

  public async shutdown () {
    const stillRunning = this.tasks.filter(t => t.getStatus() === TaskStatus.ongoing)

    if (stillRunning.length > 0) {
      this.logger.warning(`[LRT Provider] There are still ${stillRunning.length} tasks running in the background. The provider will now abort them.`)

      for (const t of stillRunning) {
        t.endTask('abort')
      }
    }
  }

  // NOTE: "abortable" says whether the USER can abort this task. Tasks can always be aborted programmatically.
  public registerTask (title: string, info?: string, abortable: boolean = true): LongRunningTask {
    const task = new LongRunningTask(uuid(), title, info, abortable)

    this.tasks.push(task)

    broadcastIPCMessage('lrt-provider', { command: 'new-task', payload: { task: task.toJSON() } } as LRTIPCSyncMessage)

    return task
  }

  public deleteTask (id: string) {
    const idx = this.tasks.findIndex(t => t.id === id)
    if (idx > -1) {
      this.tasks.splice(idx, 1)
      broadcastIPCMessage('lrt-provider', { command: 'delete-task', payload: { id } } as LRTIPCSyncMessage)
    }
  }
}
