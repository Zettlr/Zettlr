/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Zettlr class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class is the main hub for everything that the main
 *                  process does. This means that here everything the app can
 *                  or cannot do come together.
 *
 * END HEADER
 */

import extractFilesFromArgv from '../app/util/extract-files-from-argv'
import AppServiceContainer from '../app/app-service-container'

export default class Zettlr {
  private readonly _app: AppServiceContainer

  /**
   * Create a new application object
   * @param {AppServiceContainer} _app The app service container.
   */
  constructor (_app: AppServiceContainer) {
    this._app = _app

    // Now that the config provider is definitely set up, let's see if we
    // should copy the interactive tutorial to the documents directory.
    if (this._app.config.isFirstStart()) {
      this._app.log.info('[First Start] Copying over the interactive tutorial!')
      this._app.commands.run('tutorial-open', {})
        .catch(err => this._app.log.error('[Application] Could not open tutorial', err))
    }
  }

  /**
   * Initiate the main process logic after boot.
   */
  async init (): Promise<void> {
    // Open any new files we have in the process arguments.
    await this._app.commands.run('roots-add', extractFilesFromArgv())
  }

  /**
    * Shutdown the app. This function is called on quit.
    * @return {Promise} Resolves after the providers have shut down
    */
  async shutdown (): Promise<void> {
    if (!this._app.documents.isClean()) {
      this._app.log.error('[Application] Attention! The FSAL reported there were unsaved changes to certain files. This indicates a critical logical bug in the application!')
    }
  }
}
