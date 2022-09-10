// This plugin implements remote callbacks that keep the editor's document in
// sync with a central authority
import { Update, sendableUpdates, receiveUpdates, collab, getSyncedVersion } from '@codemirror/collab'
import { ChangeSet, Extension } from '@codemirror/state'
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'

type PullUpdateCallback = (filePath: string, version: number) => Promise<Update[]|false>
type PushUpdateCallback = (filePath: string, version: number, updates: Update[]) => Promise<boolean>

export function hookDocumentAuthority (
  filePath: string,
  startVersion: number,
  pullUpdates: PullUpdateCallback,
  pushUpdates: PushUpdateCallback
): Extension {
  const plugin = ViewPlugin.fromClass(class {
    private isCurrentlyPushing: boolean
    private pluginDestroyed: boolean

    constructor (private readonly view: EditorView) {
      this.isCurrentlyPushing = false
      this.pluginDestroyed = false

      // Immediately enter a loop to pull updates to the document
      this.pull()
    }

    update (update: ViewUpdate): void {
      if (update.docChanged) {
        this.push()
      }
    }

    push (): void {
      if (this.isCurrentlyPushing) {
        return // There's another push going on atm
      }

      const updates = sendableUpdates(this.view.state)
      if (updates.length === 0) {
        return // No updates available
      }

      this.isCurrentlyPushing = true
      new Promise<void>((resolve, reject) => {
        const version = getSyncedVersion(this.view.state)
        const updates = sendableUpdates(this.view.state)
        if (updates.length === 0) {
          resolve() // Nothing to do
          return
        }

        const payload: Update[] = updates.map(u => {
          return {
            clientID: u.clientID,
            changes: u.changes.toJSON()
          }
        })

        pushUpdates(filePath, version, payload)
          .then(success => {
            if (!success) {
              console.warn('Pushing updates failed!')
            }

            // Allow another push
            this.isCurrentlyPushing = false
            const pendingUpdates = sendableUpdates(this.view.state)
            if (pendingUpdates.length > 0) {
              // NOTE: We need to add a timeout here to give the return message from
              // main some time for pull() to actually apply "our" updates and
              // confirm them, because it may be that pendingUpdates === updates at
              // this point
              setTimeout(() => { this.push() }, 100)
            }
            resolve() // Resolve the promise
          })
          .catch(err => reject(err))
      })
        .catch(err => console.error(err))
    }

    pull (): void {
      if (this.pluginDestroyed) {
        return // Do not attempt a new pull
      }

      new Promise<void>((resolve, reject) => {
        const version = getSyncedVersion(this.view.state)
        pullUpdates(filePath, version)
          .then(updates => {
            try {
              if (this.pluginDestroyed) {
                return
              }

              if (updates === false) {
                console.error('The client is completely out of sync -- pulling document again...')
                // By returning `false`, the authority told us that basically we've
                // run out of sync in so far that our current version is so old that
                // it cannot provide us with precise updates anymore. This means
                // that we have to fetch the document anew and re-set our internal
                // state. TODO
                resolve()
                return
              }

              // Revitalize the updates
              updates = updates.map(u => {
                return {
                  clientID: u.clientID,
                  changes: ChangeSet.fromJSON(u.changes)
                }
              })
              this.view.dispatch(receiveUpdates(this.view.state, updates))
            } catch (e: any) {
              reject(e)
            }

            // Whether there was an error or not, schedule another pull
            this.pull()
            resolve() // Mark the promise as solved
          })
          .catch(err => reject(err))
      })
        .catch(err => console.error(err))
    }

    destroy (): void {
      // This ensures that the client stops trying to receive updates after the
      // editor has been removed (hence, no dangling promises that will prevent
      // a smooth shutdown of the application)
      this.pluginDestroyed = true
    }
  })

  // TODO: Use the leaf ID for the clientID later on!
  return [ collab({ startVersion, clientID: undefined }), plugin ]
}
