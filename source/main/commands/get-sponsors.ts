/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GetSponsors command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command retrieves the list of sponsors from the API.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import got from 'got'
import { sponsors_url as REPO_URL } from '../../common/data.json'

export default class GetSponsors extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'get-sponsors')
  }

  /**
   * Search a file and return the results to the renderer.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of a file to be searched
   * @return {Boolean}     Whether the call succeeded.
   */
  async run (evt: string, arg: any): Promise<boolean> {
    const response = await got(REPO_URL, { method: 'GET' })
    // Alright, we only need the body
    global.ipc.send('sponsors-list', JSON.parse(response.body))
    return true
  }
}

module.exports = GetSponsors
