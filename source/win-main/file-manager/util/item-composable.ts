/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Item Mixin
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a composable that manages a little bit of
 *                  state that is handled identically for both TreeItems and
 *                  FileItems.
 *
 * END HEADER
 */

import { displayFileContext } from './file-item-context'
import { displayDirContext } from './dir-item-context'
import { useConfigStore, useDocumentTreeStore, useWindowStateStore } from 'source/pinia'
import type { AnyDescriptor } from 'source/types/common/fsal'
import { ref, computed, type Ref, watch, nextTick } from 'vue'
import { hasImageExt, hasPDFExt } from 'source/common/util/file-extention-checks'
import makeValidUri from 'source/common/util/make-valid-uri'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'

const ipcRenderer = window.ipc

export function useItemComposable (
  object: AnyDescriptor,
  rootElement: Ref<HTMLElement|null>,
  windowId: string,
  nameEditingInput: Ref<HTMLInputElement|null>
) {
  const obj = ref(object)
  const nameEditing = ref<boolean>(false)
  const showPopover = ref<boolean>(false)
  const operationType = ref<'createFile'|'createDir'|undefined>(undefined)

  const configStore = useConfigStore()
  const documentTreeStore = useDocumentTreeStore()
  const windowStateStore = useWindowStateStore()

  const isDirectory = computed(() => obj.value.type === 'directory')
  const selectedFile = computed(() => documentTreeStore.lastLeafActiveFile)
  const selectedDir = computed(() => configStore.config.openDirectory)

  watch(nameEditing, (newVal) => {
    if (!newVal) {
      return // No need to select
    }

    nextTick().then(() => {
      if (nameEditingInput.value === null) {
        return
      }
      nameEditingInput.value.focus()
      const lastDot = nameEditingInput.value.value.lastIndexOf('.')
      nameEditingInput.value.setSelectionRange(0, lastDot)
    })
      .catch(err => console.error(err))
  })

  /**
   * Requests a file or directory to be selected and sends an appropriate
   * request to main.
   *
   * @param   {KeyboardEvent|MouseEvent}  event  The triggering event
   */
  function requestSelection (event: MouseEvent): void {
    // Dead directories can't be opened, so stop the propagation to
    // the file manager and don't do a thing.
    if (obj.value.type === 'directory' && obj.value.dirNotFoundFlag === true) {
      return event.stopPropagation()
    }

    if (event.button === 2) {
      return // The user requested a context menu
    }

    // Determine if we have a middle (wheel) click. The event-type check is
    // necessary since the left mouse button will have index 1 on click events,
    // whereas the middle mouse button will also have index 1, but on auxclick
    // events.
    const middleClick = (event.type === 'auxclick' && event.button === 1)
    const alt = event.altKey
    const type = obj.value.type

    if (middleClick) {
      event.preventDefault() // Otherwise, on Windows we'd have a middle-click-scroll
    }

    if ([ 'file', 'code' ].includes(type)) {
      // Request the clicked file
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: {
          path: obj.value.path,
          windowId,
          leafId: documentTreeStore.lastLeafId,
          newTab: middleClick || (alt && type === 'file') // Force a new tab in this case.
        }
      } as DocumentManagerIPCAPI)
        .catch(e => console.error(e))
    } else if (type === 'other') {
      const { files } = configStore.config
      // Determine if we can open the file in Zettlr
      if (
        (hasImageExt(obj.value.path) && files.images.openWith === 'zettlr') ||
        (hasPDFExt(obj.value.path) && files.pdf.openWith === 'zettlr')
      ) {
        ipcRenderer.invoke('documents-provider', {
          command: 'open-file',
          // We leave leafId undefined
          payload: { path: obj.value.path, windowId }
        })
          .catch(e => console.error(e))
      } else {
        // Open the file externally (again, NOTE, this only works because main
        // intercepts every navigation attempt).
        window.location.href = makeValidUri(obj.value.path)
      }
    } else if (alt) {
      // Select the parent directory
      configStore.setConfigValue('openDirectory', obj.value.dir)
    } else if (type === 'directory') {
      configStore.setConfigValue('openDirectory', obj.value.path)
      // Finally, since it's a directory, uncollapse it.
      if (!windowStateStore.uncollapsedDirectories.includes(obj.value.path)) {
        windowStateStore.uncollapsedDirectories.push(obj.value.path)
      }
    }
  }
  /**
   * Handles a context menu on a file or directory item.
   *
   * @param   {MouseEvent}  event  The triggering contextmenu event
   */
  function handleContextMenu (event: MouseEvent): void {
    if (rootElement.value === null) {
      return
    }

    if (obj.value.type === 'directory') {
      displayDirContext(event, obj.value, rootElement.value, clickedID => {
        if (clickedID === 'menu.rename_dir') {
          nameEditing.value = true
        } else if (clickedID === 'menu.new_file') {
          operationType.value = 'createFile'
        } else if (clickedID === 'menu.new_dir') {
          operationType.value = 'createDir'
        } else if (clickedID === 'menu.delete_dir') {
          ipcRenderer.invoke('application', {
            command: 'dir-delete',
            payload: { path: obj.value.path }
          })
            .catch(err => console.error(err))
        } else if (clickedID === 'menu.close_workspace') {
          ipcRenderer.invoke('application', {
            command: 'root-close',
            payload: obj.value.path
          })
            .catch(err => console.error(err))
        } else if (clickedID === 'menu.project_build') {
          // We should trigger an export of this project.
          ipcRenderer.invoke('application', {
            command: 'dir-project-export',
            payload: obj.value.path
          })
            .catch(err => console.error(err))
        } else if (clickedID === 'menu.properties') {
          showPopover.value = true
        }
      })
    } else {
      displayFileContext(event, obj.value, rootElement.value, clickedID => {
        if (clickedID === 'new-tab') {
          // Request the clicked file, explicitly in a new tab
          ipcRenderer.invoke('documents-provider', {
            command: 'open-file',
            payload: {
              path: obj.value.path,
              windowId,
              newTab: true
            }
          } as DocumentManagerIPCAPI)
            .catch(e => console.error(e))
        } else if (clickedID === 'menu.rename_file') {
          nameEditing.value = true
        } else if (clickedID === 'menu.duplicate_file') {
          ipcRenderer.invoke('application', {
            command: 'file-duplicate',
            payload: {
              path: obj.value.path,
              windowId,
              leafId: documentTreeStore.lastLeafId
            }
          })
            .catch(err => console.error(err))
        } else if (clickedID === 'menu.delete_file') {
          ipcRenderer.invoke('application', {
            command: 'file-delete',
            payload: { path: obj.value.path }
          })
            .catch(err => console.error(err))
        } else if (clickedID === 'properties') {
          showPopover.value = true
        } else if (clickedID === 'menu.close_file') {
          // The close_file item is only shown in the tree view on root files
          ipcRenderer.invoke('application', {
            command: 'root-close',
            payload: obj.value.path
          })
            .catch(err => console.error(err))
        }
      })
    }
  }

  /**
   * Is called during drag operations.
   *
   * @param   {DragEvent}  event  The drag event.
   */
  function onDragHandler (event: DragEvent): void {
    if (obj.value.type === 'directory') {
      return // Directories cannot be dragged out of the app
    }

    // If the drag x/y-coordinates are about to leave the window, we
    // have to continue the drag in the main process (as it's being
    // dragged out of the window)
    const x = Number(event.x)
    const y = Number(event.y)
    const w = window.innerWidth
    const h = window.innerHeight

    if (x === 0 || y === 0 || x === w || y === h) {
      event.stopPropagation()
      event.preventDefault()

      ipcRenderer.send('window-controls', {
        command: 'drag-start',
        payload: { filePath: obj.value.path }
      })
    }
  }

  /**
   * Called when the user finishes renaming the represented item
   *
   * @param   {string}  newName  The new name given to the file or directory
   */
  function finishNameEditing (newName: string): void {
    if (newName === obj.value.name) {
      return // Not changed
    }

    const command = (obj.value.type === 'directory') ? 'dir-rename' : 'file-rename'

    ipcRenderer.invoke('application', {
      command,
      payload: {
        path: obj.value.path,
        name: newName
      }
    })
      .catch(e => console.error(e))
      .finally(() => { nameEditing.value = false })
  }

  function updateObject (newObject: AnyDescriptor): void {
    obj.value = newObject
  }

  return {
    nameEditing,
    showPopover,
    operationType,
    onDragHandler,
    handleContextMenu,
    requestSelection,
    finishNameEditing,
    isDirectory,
    selectedFile,
    selectedDir,
    updateObject
  }
}
