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
import { ChangeSet, Extension, StateEffect } from '@codemirror/state'
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { configField } from '../util/configuration'

export type PullUpdateCallback = (filePath: string, version: number) => Promise<Update[]|false>
export type PushUpdateCallback = (filePath: string, version: number, updates: Update[]) => Promise<boolean>

/**
 * NOTE: The caller MUST listen for this state effect. If this effect is being
 * emitted, the document is irrepairably out of sync with the document authority
 * and the entire state must be reinitialized.
 */
export const reloadStateEffect = StateEffect.define<boolean>()

export function hookDocumentAuthority (
  editorId: string,
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
            // Allow another push -> will break out of the loop if there are no
            // new updates.
            this.isCurrentlyPushing = false
            setTimeout(() => { this.push() }, 100)
            resolve()
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
              // These two conditions are equal: Either the plugin has been
              // destroyed, or the file path has changed because the editor has
              // loaded in a different document. In that case, the view may be
              // still valid, but should not be overwritten
              if (this.pluginDestroyed || filePath !== this.view.state.field(configField).metadata.path) {
                return resolve()
              }

              if (updates === false) {
                // By returning `false`, the authority told us that we've lost
                // synchronization and there is no way to re-synchronize in this
                // method. This means that here we need to emit an effect that
                // must be captured by the MainEditor instance to perform a full
                // reload of the document state. After that, we break out of the
                // pull loop and let the new plugin instance take over.
                this.view.dispatch({ effects: reloadStateEffect.of(true) })
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

  return [ collab({ startVersion, clientID: editorId }), plugin ]
}
