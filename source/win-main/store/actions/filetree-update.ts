/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FiletreeUpdateAction
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Performs an update of the file tree
 *
 * END HEADER
 */

import { FSALHistoryEvent } from '@dts/common/fsal'
import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const ipcRenderer = window.ipc

function sanitizeFiletreeUpdates (events: FSALHistoryEvent[]): FSALHistoryEvent[] {
  const ret: FSALHistoryEvent[] = []

  for (const event of events) {
    if (event.event === 'remove') {
      // First: Check, if we have a corresponding add-event in history, and
      // remove that one.
      const addEvent = ret.findIndex(e => e.event === 'add' && e.path === event.path)
      if (addEvent > -1) {
        ret.splice(addEvent, 1)
        // Find all other events in between and splice them as well
        for (let i = 0; i < ret.length; i++) {
          if (ret[i].path.startsWith(event.path)) {
            ret.splice(i, 1)
            i-- // Important to not jump over events
          }
        }

        continue // Done here
      }
    }

    // Second: Check if we have events for some files/dirs that reside within
    // files/dirs that do not exist anymore -- we won't get any descriptor
    // for these anyway, so we can save some computational power here.
    // TODO: Is this even necessary ...?

    // In the very end, add the event to our return array
    ret.push(event)
  }

  return ret
}

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  // When this function is called, an fsal-state-updated event has been
  // emitted from the main process because something in the FSAL has
  // changed. We need to reflect this here in the main application window
  // so that the filemanager always shows the correct state.

  // We need to perform three steps: First, retrieve all the history events
  // since we last checked (we initialise the "lastChecked" property with
  // 0 so that we will initially get all events), and then, for each event,
  // first retrieve the necessary information, and finally apply this locally.
  const events: FSALHistoryEvent[] = await ipcRenderer.invoke('application', { command: 'get-filetree-events', payload: context.state.lastFiletreeUpdate })

  if (events.length === 0) {
    return // Nothing to do
  }

  // A first problem we might encounter is that there has been an addition
  // and subsequently a removal of the same file/directory. We need to
  // account for this. We do so by first sanitizing the events that need
  // to be processed.
  const saneEvents = sanitizeFiletreeUpdates(events)

  for (const event of saneEvents) {
    // console.log(`Processing event ${event.event}:${event.path}`)
    if (event.timestamp <= context.state.lastFiletreeUpdate) {
      console.warn(`FSAL event had an outdated timestamp (${event.timestamp}, current: ${context.state.lastFiletreeUpdate}) -- skipping (${event.event}:${event.path})`)
      continue
    }

    // In the end, we also need to update our filetree update timestamp
    context.commit('lastFiletreeUpdate', event.timestamp)

    if (event.event === 'remove') {
      context.commit('removeFromFiletree', event.path)
    } else if (event.event === 'add') {
      const descriptor = await ipcRenderer.invoke('application', { command: 'get-descriptor', payload: event.path })
      if (descriptor == null) {
        console.error(`The descriptor for path ${event.path} was empty!`)
      } else {
        context.commit('addToFiletree', descriptor)
      }
    } else if (event.event === 'change') {
      const descriptor = await ipcRenderer.invoke('application', { command: 'get-descriptor', payload: event.path })
      if (descriptor == null) {
        console.error(`The descriptor for path ${event.path} was empty!`)
      } else {
        context.commit('patchInFiletree', descriptor)
      }
    }
  }

  // Now, dispatch another event. This will only run this function once, and
  // will do nothing if there are no new events. This is meant as a convenience
  // if there are more than one event in a succession
  context.dispatch('filetreeUpdate').catch(e => console.error(e))
}
