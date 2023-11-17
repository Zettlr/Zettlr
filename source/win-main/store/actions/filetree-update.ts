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

import { type ActionContext } from 'vuex'
import { type ZettlrState } from '..'

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  // DEBUG: DEPRECATED / NO-OP
}
