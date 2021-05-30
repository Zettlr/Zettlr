// This is a mixin that is being implemented by both the file item and tree item
// and contains shared logic that applies to both objects. This way, we have
// different styling for tree items and file list items, but the same underlying
// logic, since both represent the same data structures.
import fileContextMenu from './file-item-context'
import dirContextMenu from './dir-item-context'
import PopoverFileProps from './PopoverFileProps'
import PopoverDirProps from './PopoverDirProps'

const ipcRenderer = window.ipc

export default {
  props: {
    obj: {
      type: Object,
      default: function () { return {} }
    }
  },
  data: function () {
    return {
      nameEditing: false // True if the user wants to rename the item
    }
  },
  computed: {
    isDirectory: function () {
      return this.obj.type === 'directory'
    }
  },
  watch: {
    nameEditing: function (newVal, oldVal) {
      if (newVal === false) {
        return // No need to select
      }

      this.$nextTick(() => {
        this.$refs['name-editing-input'].focus()
        this.$refs['name-editing-input'].select()
      })
    }
  },
  methods: {
    /**
     * Requests a file or directory to be selected and sends an appropriate
     * request to main.
     *
     * @param   {KeyboardEvent|MouseEvent}  event  The triggering event
     */
    requestSelection: function (event) {
      // Dead directories can't be opened, so stop the propagation to
      // the file manager and don't do a thing.
      if (this.obj.dirNotFoundFlag === true) {
        return event.stopPropagation()
      }

      if (event.button === 2) {
        return // The user requested a context menu
      }

      // Determine if we have a middle (wheel) click. The event-type checking
      // is only done so this is only true when we triggered this function using
      // the mousedown event.
      const middleClick = (event.type === 'mousedown' && event.button === 1)
      const alt = event.altKey
      const type = this.obj.type

      if (middleClick) {
        event.preventDefault() // Otherwise, on Windows we'd have a middle-click-scroll
      }

      if (type === 'file' && alt) {
        // QuickLook the file
        ipcRenderer.invoke('application', {
          command: 'open-quicklook',
          payload: this.obj.path
        })
          .catch(e => console.error(e))
      } else if ([ 'file', 'code' ].includes(type)) {
        // Request the clicked file
        ipcRenderer.invoke('application', {
          command: 'open-file',
          payload: {
            path: this.obj.path,
            newTab: middleClick // Force a new tab in this case.
          }
        })
          .catch(e => console.error(e))
      } else if (alt && this.obj.parent !== null) {
        // Select the parent directory
        ipcRenderer.invoke('application', {
          command: 'set-open-directory',
          payload: this.obj.parent.path
        })
          .catch(e => console.error(e))
      } else if (type === 'directory') {
        // Select this directory
        ipcRenderer.invoke('application', {
          command: 'set-open-directory',
          payload: this.obj.path
        })
          .catch(e => console.error(e))
      }
    },
    /**
     * Handles a context menu on a file or directory item.
     *
     * @param   {MouseEvent}  event  The triggering contextmenu event
     */
    handleContextMenu: function (event) {
      // We need to tweak some minor things depending on whether this is a
      // FileItem or a TreeItem. NOTE: These things were determined by diffing
      // the original handleContextMenu functions in both components.
      const treeItem = this.$options.name === 'TreeItem'

      if (this.isDirectory === true) {
        dirContextMenu(event, this.obj, this.$el, (clickedID) => {
          if (clickedID === 'menu.rename_dir') {
            this.nameEditing = true
          } else if (clickedID === 'menu.new_file') {
            if (treeItem) {
              this.operationType = 'createFile'
            } else {
              this.$emit('create-file')
            }
          } else if (clickedID === 'menu.new_dir') {
            if (treeItem) {
              this.operationType = 'createDir'
            } else {
              this.$emit('create-dir')
            }
          } else if (clickedID === 'menu.delete_dir') {
            ipcRenderer.invoke('application', {
              command: 'dir-delete',
              payload: { path: this.obj.path }
            })
              .catch(err => console.error(err))
          } else if (clickedID === 'menu.properties') {
            const data = {
              dirname: this.obj.name,
              creationtime: this.obj.creationtime,
              modtime: this.obj.modtime,
              files: this.obj.children.filter(e => e.type !== 'directory').length,
              dirs: this.obj.children.filter(e => e.type === 'directory').length,
              isProject: this.isProject === true,
              icon: this.obj.icon
            }

            if (this.obj.sorting !== null) {
              data.sortingType = this.obj.sorting.split('-')[0]
              data.sortingDirection = this.obj.sorting.split('-')[1]
            } // Else: Default sorting of name-up

            const elem = (treeItem) ? this.$refs['display-text'] : this.$el

            this.$showPopover(PopoverDirProps, elem, data, (data) => {
              // Apply new sorting if applicable
              if (data.sorting !== this.obj.sorting) {
                ipcRenderer.invoke('application', {
                  command: 'dir-sort',
                  payload: {
                    path: this.obj.path,
                    sorting: data.sorting
                  }
                }).catch(e => console.error(e))
              }

              // Set the project flag if applicable
              const projectChanged = data.isProject !== this.isProject
              if (projectChanged && data.isProject) {
                ipcRenderer.invoke('application', {
                  command: 'dir-new-project',
                  payload: { path: this.obj.path }
                }).catch(e => console.error(e))
              } else if (projectChanged && !data.isProject) {
                ipcRenderer.invoke('application', {
                  command: 'dir-remove-project',
                  payload: { path: this.obj.path }
                }).catch(e => console.error(e))
              }

              // Set the icon if it has changed
              if (data.icon !== this.obj.icon) {
                ipcRenderer.invoke('application', {
                  command: 'dir-set-icon',
                  payload: {
                    path: this.obj.path,
                    icon: data.icon
                  }
                }).catch(e => console.error(e))
              }
            })
          }
        })
      } else {
        fileContextMenu(event, this.obj, this.$el, (clickedID) => {
          console.log(clickedID)
          if (clickedID === 'new-tab') {
            console.log('Will open in new tab!')
            // Request the clicked file, explicitly in a new tab
            ipcRenderer.invoke('application', {
              command: 'open-file',
              payload: {
                path: this.obj.path,
                newTab: true
              }
            })
              .catch(e => console.error(e))
          } else if (clickedID === 'menu.rename_file') {
            this.nameEditing = true
          } else if (clickedID === 'menu.duplicate_file') {
            // The user wants to duplicate this file --> instruct the file list
            // controller to display a mock file object below this file for the
            // user to enter a new file name.
            this.$emit('duplicate')
          } else if (clickedID === 'menu.delete_file') {
            ipcRenderer.invoke('application', {
              command: 'file-delete',
              payload: { path: this.obj.path }
            })
              .catch(err => console.error(err))
          } else if (clickedID === 'menu.properties') {
            const data = {
              filename: this.obj.name,
              creationtime: this.obj.creationtime,
              modtime: this.obj.modtime,
              tags: this.obj.tags,
              // We need to provide the coloured tags so
              // the popover can render them correctly
              colouredTags: this.$store.state.colouredTags,
              targetValue: 0,
              targetMode: 'words',
              fileSize: this.obj.size,
              type: this.obj.type,
              words: 0,
              ext: this.obj.ext
            }

            if (this.hasWritingTarget === true) {
              data.targetValue = this.obj.target.count
              data.targetMode = this.obj.target.mode
            }

            if (this.obj.type === 'file') {
              data.words = this.obj.wordCount
            }

            const elem = (treeItem) ? this.$refs['display-text'] : this.$el

            this.$showPopover(PopoverFileProps, elem, data, (data) => {
              // Whenever the data changes, update the target

              // 1.: Writing Target
              if (this.obj.type === 'file') {
                ipcRenderer.invoke('application', {
                  command: 'set-writing-target',
                  payload: {
                    mode: data.target.mode,
                    count: data.target.value,
                    path: this.obj.path
                  }
                }).catch(e => console.error(e))
              }
            })
          } else if (clickedID === 'menu.close_file') {
            // The close_file item is only shown in the tree view on root files
            ipcRenderer.invoke('application', {
              command: 'root-close',
              payload: this.obj.path
            })
              .catch(err => console.error(err))
          }
        })
      }
    },
    /**
     * Is called during drag operations.
     *
     * @param   {DragEvent}  event  The drag event.
     */
    onDragHandler: function (event) {
      if (this.isDirectory === true) {
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
          payload: { filePath: this.obj.path }
        })
      }
    },
    /**
     * Called when the user finishes renaming the represented item
     *
     * @param   {string}  newName  The new name given to the file or directory
     */
    finishNameEditing: function (newName) {
      if (newName === this.obj.name) {
        return // Not changed
      }

      const command = (this.obj.type === 'directory') ? 'dir-rename' : 'file-rename'

      ipcRenderer.invoke('application', {
        command: command,
        payload: {
          path: this.obj.path,
          name: newName
        }
      })
        .catch(e => console.error(e))
        .finally(() => { this.nameEditing = false })
    }
  }
}
