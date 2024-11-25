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
import path from 'path'

// Reference if we need more: https://www.iana.org/assignments/media-types/media-types.xhtml
const CONTENT_TYPE_MAP = new Map([
  [ '.svg', 'image/svg+xml' ],
  [ '.jpg', 'image/jpeg' ],
  [ '.jpeg', 'image/jpeg' ],
  [ '.gif', 'image/gif' ],
  [ '.tiff', 'image/tiff' ],
  [ '.tif', 'image/tiff' ],
  [ '.ico', 'image/vnd.microsoft.icon' ],
  [ '.png', 'image/png' ],
  [ '.webp', 'image/webp' ],
  [ '.mp4', 'video/mp4' ],
  [ '.webm', 'video/webm' ],
  [ '.pdf', 'application/pdf' ]
])

/**
 * Returns file-type-specific content type headers, suitable for use in Response
 *
 * @param   {string}                  filePath  The file's path
 *
 * @return  {Record<string, string>}            A record of headers
 */
function headersForFileType (filePath: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const type = CONTENT_TYPE_MAP.get(path.extname(filePath))
  if (type !== undefined) {
    headers['Content-type'] = type
  }
  return headers
}

export default function registerCustomProtocols (logger: LogProvider): void {
  // Make it possible to safely load external files
  // In order to load files, the 'safe-file' protocol has to be used instead of 'file'
  // https://stackoverflow.com/a/61623585/873661
  const protocolName = 'safe-file'

  logger.info(`Registering custom protocol ${protocolName}`)
  protocol.handle(protocolName, async request => {
    const url = new URL(request.url)
    try {
      let pathName = decodeURIComponent(url.pathname)

      // Due to the colons in the drive letters on Windows, the pathname will
      // look like this: /C:/Users/Documents/test.jpg
      // See: https://github.com/Zettlr/Zettlr/issues/5489
      if (/^\/[A-Z]:/i.test(pathName)) {
        pathName = pathName.slice(1)
      }

      const fileBuffer = await fs.readFile(pathName)
      return new Response(fileBuffer, {
        status: 200,
        // Prevent that local files are cached
        headers: {
          'Cache-control': 'no-store',
          pragma: 'no-cache',
          // Headers are important, since otherwise, e.g., SVG images or PDFs
          // aren't properly rendered (see #5496)
          ...headersForFileType(pathName)
        }
      })
    } catch (err: any) {
      const msg = `Error loading external file: ${err.message as string}`
      logger.error(msg, err)
      return new Response(msg, { status: 500 })
    }
  })
}
