const { spawn } = require('child_process')

module.exports = {
  getGitHash: async function () {
    const command = 'git rev-parse --short HEAD'

    const hash = await new Promise((resolve, reject) => {
      const process = spawn(command, { shell: true })
      let returnValue = ''
      process.stdout.on('data', (chunk) => {
        if (typeof chunk === 'string') {
          returnValue += chunk
        } else if (chunk instanceof Buffer) {
          returnValue += chunk.toString('utf-8')
        } else {
          returnValue += String(chunk)
        }
      })

      process.on('close', (code, _signal) => {
        if (code === 0) {
          resolve(returnValue)
        } else {
          reject(new Error(`Could not retrieve commit hash, command exited with code ${code}`))
        }
      })

      process.on('error', err => {
        reject(err)
      })
    })

    return hash
  }
}
