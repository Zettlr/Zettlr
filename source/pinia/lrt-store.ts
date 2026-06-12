import { defineStore } from 'pinia'
import type { LRT_JSON, LRTIPCAsyncMessage, LRTIPCSyncMessage } from 'source/app/service-providers/long-running-tasks'
import { ref } from 'vue'

/**
 * Enum of all status a task can have. (Mirror from the provider, because it's
 * needed in the renderer.)
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

const ipcRenderer = window.ipc

async function fetchTasks (): Promise<LRT_JSON[]> {
  return await ipcRenderer.invoke('lrt-provider', { command: 'get-tasks' } as LRTIPCAsyncMessage)
}

export const useLRTStore = defineStore('lrt', () => {
  const tasks = ref<LRT_JSON[]>([])

  // Initial update
  fetchTasks()
    .then(t => { tasks.value = t })
    .catch(err => console.error('Could not fetch long running tasks', err))

  // Hook event listeners
  ipcRenderer.on('lrt-provider', (event, args: LRTIPCSyncMessage) => {
    if (args.command === 'update-task') {
      // A single task was updated
      const { task } = args.payload
      const taskIdx = tasks.value.findIndex(t => t.id === task.id)
  
      if (taskIdx > -1) {
        tasks.value.splice(taskIdx, 1, task)
      } else {
        // This can happen if the task has a rapid update before this store has
        // had a chance to re-fetch the new tasks.
        tasks.value.push(task)
      }
    } else if (args.command === 'delete-task') {
      // A single task was deleted
      const { id } = args.payload
      const taskIdx = tasks.value.findIndex(t => t.id === id)

      if (taskIdx > -1) {
        tasks.value.splice(taskIdx, 1)
      }
    }
  })

  ipcRenderer.on('lrt-provider', (event, args: LRTIPCSyncMessage) => {
    if (args.command === 'new-task') {
      // A new task has been started
      tasks.value.push(args.payload.task)
    }
  })

  function abortTask (id: string) {
    const task = tasks.value.find(t => t.id === id)

    if (task === undefined) {
      throw new Error(`Could not abort task with ID ${id}: Not found`)
    }

    if (!task.abortable) {
      throw new Error(`Cannot abort task ${id}: Not abortable.`)
    }

    ipcRenderer.send('lrt-provider', { command: 'abort-task', payload: { id } } as LRTIPCSyncMessage)
  }

  function deleteTask (id: string) {
    const task = tasks.value.find(t => t.id === id)

    if (task === undefined) {
      throw new Error(`Could not delete task ${id}: Not found.`)
    }

    ipcRenderer.invoke('lrt-provider', { command: 'delete-task', payload: { id: task.id } } as LRTIPCSyncMessage)
      .catch(err => console.error('Could not delete task', err))
  }

  return { tasks, abortTask, deleteTask }
})
