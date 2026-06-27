/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        runCommand
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Small utility to run commands and return the results.
 *
 * END HEADER
 */

import { spawn } from 'child_process'

/**
 * The return of running a command.
 */
export interface CMD_OUT {
  /**
   * The exit code. Typically, 0 = success. Other exit codes depend on the program.
   */
  code: number,
  /**
   * A single string with all output (typically delimited with newlines).
   */
  stdout: string,
  /**
   * A single string with all error output (typically delimited with newlines).
   */
  stderr: string
}

/**
 * A simple wrapper around Node's `spawn` utility. Provide a command, optional
 * arguments, and receive the result from the call. The result will be raw, so
 * you'll have to do any checking yourself.
 *
 * @param   {string}    command  The command (can be an absolute path or just
 *                               the command, resolved according to the
 *                               operating system).
 * @param   {string[]}  argv     Optional arguments to pass to the command.
 * @param   {boolean}   shell    Some commands need to be spawned in a shell.
 *                               This enables certain shell expansions, which
 *                               may be harmful to the user, thus this param is
 *                               set to `false` by default.
 *
 * @return  {CMD_OUT}           The exit code, stdout and stderr.
 * @throws                      if spawning the process fails, or on any other
 *                              error. Does not throw if the return code is != 0
 */
export async function runCommand (command: string, argv?: string[], shell: boolean = false): Promise<CMD_OUT> {
  let stdout = ''
  let stderr = ''

  const code = await new Promise<number>((resolve, reject) => {
    const process = spawn(command, argv, { shell })

    process.stderr?.on('data', (data) => {
      stderr += String(data)
    })

    process.stdout?.on('data', (data) => {
      stdout += String(data)
    })

    process.on('close', (code) => {
      if (code !== null) {
        resolve(code)
      } else {
        reject(new Error('The command has terminated, but there was no exit code.'))
      }
    })

    process.on('error', (err) => {
      reject(err)
    })
  })

  return { code, stdout, stderr }
}
