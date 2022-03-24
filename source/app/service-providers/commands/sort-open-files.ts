/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SortOpenFiles command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command sorts the open files and persists this.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'

export default class SortOpenFiles extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'sort-open-files')
  }

  /**
    * Applies a new sorting to the open files
    * @param {String} evt The event name
    * @param  {Object} arg An array of hashes in the desired order.
    */
  async run (evt: string, arg: any): Promise<void> {
    // arg contains the list of current open files in the desired order. We
    // need to propagate that both to the FSAL and then to the config. The
    // FSAL will make sure its internal state is correct, so just feed it to
    // the FSAL and feed its return then back to the config for persisting.
    this._app.documents.sortOpenFiles(arg)
  }
}
