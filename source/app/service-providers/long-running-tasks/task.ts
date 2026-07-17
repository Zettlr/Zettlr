/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LongRunningTask
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Defines a LongRunningTask that is managed by the provider.
 *
 * END HEADER
 */

import EventEmitter from 'events'
import broadcastIPCMessage from 'source/common/util/broadcast-ipc-message'
import type { LRTIPCSyncMessage } from '.'
import { DateTime, type Duration } from 'luxon'

// How often should long running tasks broadcast a status update (in ms)?
const LRT_UPDATE_DEBOUNCE = 100

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
  interactable: boolean
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
   * An optional function that will perform an action when the user clicks this
   * task in the GUI.
   *
   * @var  {Function}
   */
  private successInteraction: (() => void)|undefined

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
  constructor (public readonly id: string, title: string, info?: string, successInteraction?: () => void, abortable: boolean = true) {
    super()
    this.title = title
    this.info = info
    this.startTime = DateTime.now()
    this.status = TaskStatus.ongoing
    this.abortable = abortable
    this.successInteraction = successInteraction
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
  public update (data: Partial<{ title: string, info: string, percentage: number, abortable: boolean, successInteraction: () => void }>) {
    this.title = data.title ?? this.title
    this.info = data.info ?? this.info
    this.currentTaskPercentage = data.percentage ?? this.currentTaskPercentage
    this.abortable = data.abortable ?? this.abortable
    this.successInteraction = data.successInteraction ?? this.successInteraction
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
   * Calls the interaction for the task (if applicable)
   */
  public interactWith () {
    this.successInteraction?.()
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
      abortable: this.abortable,
      interactable: this.successInteraction !== undefined
    }
  }
}
