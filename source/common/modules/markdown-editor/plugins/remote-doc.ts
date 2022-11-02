/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Remote Document
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module defines a set of functions required by the
 *                  editor to retrieve, update, and sync with the document
 *                  provider.
 *
 * END HEADER
 */

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
              // NOTE: When main returns false it's not THAT ideal, but the
              // algorithm is capable of recovering. The reason pushing fails
              // regularly is because of a race condition that the push and pull
              // listeners are not tied to the same state, hence there will
              // always be that instance where the editor instance is faster in
              // pushing a second set of updates, but with a wrong version number.
              // It will then just try to push updates AGAIN (hence we don't
              // return).
              // TODO: There must be a better solution. Like, don't push while
              // pulling, or vice versa, idk.
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
                // By returning `false`, the authority told us that we've lost
                // synchronization and there is no way to re-synchronize in this
                // method. The `false` will be captured by the MainEditor
                // instance (in the pullUpdates handler) and handled by simply
                // reloading the full editor state. What we need to do here is
                // break out of the pull-loop.
                return resolve()
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
