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
import {
  type Update,
  sendableUpdates,
  receiveUpdates,
  collab,
  getSyncedVersion
} from '@codemirror/collab'
import { ChangeSet, StateEffect, type Extension } from '@codemirror/state'
import { ViewPlugin, type EditorView, type ViewUpdate } from '@codemirror/view'
import { configField } from '../util/configuration'

export type PullUpdateCallback = (filePath: string, version: number) => Promise<Update[]|false>
export type PushUpdateCallback = (filePath: string, version: number, updates: Update[]) => Promise<boolean>

/**
 * NOTE: The caller MUST listen for this state effect. If this effect is being
 * emitted, the document is irrepairably out of sync with the document authority
 * and the entire state must be reinitialized.
 */
export const reloadStateEffect = StateEffect.define<boolean>()

/**
 * Call this function to retrieve an Extension that can be used to synchronize
 * an editor with a central document authority.
 * @param   {string}              filePath      The file's path to be requested
 * @param   {number}              startVersion  Retrieve this when you retrieve
 *                                              the document initially.
 * @param   {PullUpdateCallback}  pullUpdates   The callback to request new
 *                                              updates from the document
 *                                              authority.
 * @param   {PushUpdateCallback}  pushUpdates   The callback to send updates to
 *                                              the document authority.
 *
 * @return  {Extension}                         A CodeMirror v6 extension
 */
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

      // Immediately enter a loop to pull updates to the document. The pull
      // method will create a Promise that links this plugin (and, by extension,
      // the editor state) over the IPC or websocket bridge until there are any
      // updates available.
      this.pull().catch(err => { console.error(`Pulling updates failed: ${String(err.message)}`, err) })
    }

    update (update: ViewUpdate): void {
      // Whenever the doc changed, sync those changes with the document authority
      if (update.docChanged) {
        this.push().catch(err => { console.error(`Pushing updates failed: ${String(err.message)}`, err) })
      }
    }

    async push (): Promise<void> {
      if (this.isCurrentlyPushing) {
        return // There's another push going on atm
      }

      const updates = sendableUpdates(this.view.state)
      if (updates.length === 0) {
        return // No updates available
      }

      this.isCurrentlyPushing = true
      const version = getSyncedVersion(this.view.state)
      const serializedUpdates: Update[] = updates.map(u => {
        return { clientID: u.clientID, changes: u.changes.toJSON() }
      })

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const success = await pushUpdates(filePath, version, serializedUpdates)

      // Allow another push, if new updates have amassed during the push
      this.isCurrentlyPushing = false
      setTimeout(() => {
        this.push().catch(err => { console.error(`Pushing updates failed: ${String(err.message)}`, err) })
      }, 100)
    }

    async pull (): Promise<void> {
      if (this.pluginDestroyed) {
        return // Do not attempt a new pull
      }

      const version = getSyncedVersion(this.view.state)
      const updates = await pullUpdates(filePath, version)
      // NOTE: At this point, hours may have passed, so we have to re-check the
      // current state, because the view will remain valid for as long as the
      // editor leaf exists. *However* if the editor now shows a different file,
      // the state will have a different remote-doc plugin that already takes
      // care of communicating with the API, so we have to remove this "dangling
      // promise".
      const currentFilePath = this.view.state.field(configField).metadata.path
      if (this.pluginDestroyed || filePath !== currentFilePath) {
        return // These updates shall not be applied to the current state
      }

      if (updates === false) {
        // By returning `false`, the authority told us that we've lost
        // synchronization and there is no way to re-synchronize in this method.
        // This means that here we need to emit an effect that must be captured
        // by the MainEditor instance to perform a full reload of the document
        // state. After that, we break out of the pull loop and let the new
        // plugin instance take over.
        this.view.dispatch({ effects: reloadStateEffect.of(true) })
        return
      }

      try {
        // Deserialize & apply updates
        const deserializedUpdates = updates.map(u => {
          return {
            clientID: u.clientID,
            changes: ChangeSet.fromJSON(u.changes)
          }
        })
        const transaction = receiveUpdates(this.view.state, deserializedUpdates)
        this.view.dispatch(transaction)
      } catch (err: any) {
        console.error(`Pulling updates for failed (retrying): ${String(err.message)}`, err)
      }

      // Whether there was an error or not, schedule another pull
      this.pull().catch(err => { console.error(`Pulling updates failed: ${String(err.message)}`, err) })
    }

    destroy (): void {
      // This ensures that the client stops trying to receive updates after the
      // editor has been removed (hence, no dangling promises that will prevent
      // a smooth shutdown of the application)
      this.pluginDestroyed = true
    }
  })

  return [ collab({ startVersion }), plugin ]
}
