/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateBibliographyAction
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Updates the list of references with the current citation keys
 *
 * END HEADER
 */

import { type ActionContext } from 'vuex'
import { type ZettlrState } from '..'

const ipcRenderer = window.ipc

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  const bibliography: [BibliographyOptions, string[]]|undefined = await ipcRenderer.invoke('citeproc-provider', {
    command: 'get-bibliography',
    // Note we are de-proxying the citation keys here
    payload: context.state.citationKeys.map(e => e)
  })

  context.commit('updateBibliography', bibliography)
}
