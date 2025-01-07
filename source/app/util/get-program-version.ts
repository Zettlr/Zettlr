/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getProgramVersion
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A simple function that runs a command with the `--version`
 *                  flag and extracts a version string (if applicable)
 *
 * END HEADER
 */

import { spawn } from 'child_process'

/**
 * This command can check an arbitrary command's version by running `program
 * --version`. This will return undefined if no version string is found on the
 * first line of whatever the program outputs when called with --version. NOTE:
 * This command throws when the program throws an error or anything unexpected
 * happens.
 *
 * @param   {string}            program  The program (can be an absolute path or
 *                                       just the command (resolved according to
 *                                       the operating system))
 *
 * @return  {string|undefined}           Either a version string, or undefined
 */
export async function getProgramVersion (program: string): Promise<string|undefined> {
  let output: string = ''
  await new Promise<void>((resolve, reject) => {
    let err: string = ''
    const process = spawn(program, ['--version'], { shell: true })

    process.stderr?.on('data', (data) => {
      err += String(data)
    })

    process.stdout?.on('data', (data) => {
      output += String(data)
    })

    process.on('close', (code: number, _signal) => {
      if (code !== 0) {
        reject(new Error(`Could not check program version, process exited with code ${code}; stderr: ${err}`))
      } else {
        resolve()
      }
    })

    process.on('error', (err) => {
      reject(err)
    })
  })

  // First line is the "pandoc 2.19.2" or any other version string
  output = output.split('\n')[0]
  const match = /\d[\d.]+/.exec(output)
  if (match === null) {
    return undefined
  } else {
    return match[0]
  }
}
