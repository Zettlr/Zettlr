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

import ProviderContract, { type IPCAPI } from '../provider-contract'
import type LogProvider from '@providers/log'
import { runCommand } from 'source/app/util/run-command'
import path from 'path'

class GitError extends Error {
  constructor (message: string, public readonly stderr: string, public readonly code?: number) {
    super(message)
  }
}

export type GitIPCAPI = IPCAPI<{
  'init-git': { directoryPath: string, initialBranchName?: string }
}>

export default class GitProvider extends ProviderContract {
  constructor (private readonly _logger: LogProvider) {
    super()

    // Send the Custom CSS Path to whomever requires it
    ipcMain.handle('git-provider', async (event, message: GitIPCAPI) => {
      const { command, payload } = message

      if (command === 'init-git') {
        return await this.initGitRepository(payload.directoryPath, payload.initialBranchName)
      }
    })
  }

  /**
   * Boots the provider
   */
  async boot (): Promise<void> {
  }

  /**
   * Returns true if git is available on this system.
   *
   * @return  {boolean}  True if git is installed.
   */
  private isGitAvailable (): boolean {
    return process.env.GIT_SUPPORT === '1'
  }

  /**
   * Returns the git version on this system, if available.
   *
   * @return  {string}  The version or undefined
   */
  private getGitVersion (): string|undefined {
    return process.env.GIT_VERSION
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<void> {
  }

  /**
   * Initializes an empty git repository in the directory.
   *
   * @param  {string}  directoryPath      The directory path. Must be absolute.
   * @param  {string}  initialBranchName  Initial branch name. Default: main.
   */
  public async initGitRepository (directoryPath: string, initialBranchName: string = 'main') {
    if (!path.isAbsolute(directoryPath)) {
      throw new Error(`Directory path must be absolute, received: ${directoryPath}`)
    }

    try {
      const result = await runCommand('git', [
        'init', `--initial-branch=${initialBranchName}`, directoryPath
      ])

      if (result.code !== 0) {
        throw new GitError('Could not initiate git repository.', result.stderr, result.code)
      }
    } catch (err: unknown) {
      console.error(err)
    }
  }
}
