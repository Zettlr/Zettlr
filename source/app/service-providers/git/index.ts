/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GitProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Communicates with Git-instances, and performs backup tasks.
 *
 * END HEADER
 */

import { ipcMain } from 'electron'

import ProviderContract from '../provider-contract'
import type LogProvider from '@providers/log'

export default class GitProvider extends ProviderContract {
  constructor (private readonly _logger: LogProvider) {
    super()

    // Send the Custom CSS Path to whomever requires it
    ipcMain.handle('git-provider', async (event, _payload) => {
    })
  }

  /**
   * Boots the provider
   */
  async boot (): Promise<void> {
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<void> {
  }
}
