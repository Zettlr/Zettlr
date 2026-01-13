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

export type CMD_OUT = { code: number, stdout: string, stderr: string }

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
 * @return  {CMD_OUT}           Either a version string, or undefined.
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

    process.on('close', (code: number, _signal) => {
      resolve(code)
    })

    process.on('error', (err) => {
      reject(err)
    })
  })

  // First line is the "pandoc 2.19.2" or any other version string
  return { code, stdout, stderr }
}
