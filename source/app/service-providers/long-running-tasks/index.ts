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

import ProviderContract from '../provider-contract'
import { v4 as uuid } from 'uuid'
import type LogProvider from '../log'
import broadcastIPCMessage from 'source/common/util/broadcast-ipc-message'
import { ipcMain } from 'electron'
import { type LRT_JSON, LongRunningTask, TaskStatus } from './task'

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
