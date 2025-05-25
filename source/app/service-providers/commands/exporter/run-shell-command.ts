import { spawn } from 'child_process'

/**
 * Runs an arbitrary command in the shell, passing any arguments and a working
 * directory. NOTE: THIS IS AN UNSAFE FUNCTION. DO NOT PASS UNSANITIZED INPUT TO
 * IT TO PREVENT ANY ATTACKS!
 *
 * @param   {string}    command  The command to run.
 * @param   {string[]}  argv     Any arguments to pass to the command
 * @param   {string}    cwd      The working directory for the command
 *
 * @return  {object}             Returns an object with keys stdout, stderr, and code
 */
export async function runShellCommand (command: string, argv: string[], cwd: string): Promise<{ stdout: string, stderr: string, code: number }> {
  const stdout: string[] = []
  const stderr: string[] = []
  let finalCode = 0

  await new Promise<void>((resolve, reject) => {
    // NOTE the shell: true parameter, which helps some commands find files.
    const proc = spawn(command, argv, { shell: true, cwd })

    proc.stdout.on('data', (data) => {
      stdout.push(String(data))
    })

    proc.stderr.on('data', (data) => {
      stderr.push(String(data))
    })

    proc.on('close', (code: number, _signal) => {
      finalCode = code
      resolve()
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })

  return {
    stdout: stdout.join(''),
    stderr: stderr.join(''),
    code: finalCode
  }
}
