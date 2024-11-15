/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Registers custom protocols for the application.
 *
 * END HEADER
 */

import type LogProvider from '@providers/log'
import { protocol } from 'electron'
import { promises as fs } from 'fs'

export default function registerCustomProtocols (logger: LogProvider): void {
  // Make it possible to safely load external files
  // In order to load files, the 'safe-file' protocol has to be used instead of 'file'
  // https://stackoverflow.com/a/61623585/873661
  const protocolName = 'safe-file'

  logger.info(`Registering custom protocol ${protocolName}`)
  protocol.handle(protocolName, async request => {
    const url = request.url.replace(`${protocolName}://`, '')
    try {
      const fileBuffer = await fs.readFile(decodeURIComponent(url))
      return new Response(fileBuffer, {
        status: 200,
        // Prevent that local files are cached
        headers: { 'Cache-control': 'no-store', pragma: 'no-cache' }
      })
    } catch (err: any) {
      const msg = `Error loading external file: ${err.message as string}`
      logger.error(msg, err)
      return new Response(msg, { status: 500 })
    }
  })
}
