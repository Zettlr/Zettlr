/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractLinefeed
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function extracts the correct linefeed from a file.
 *
 * END HEADER
 */

type Linefeed = '\n'|'\r'|'\r\n'|'\n\r'

export function extractLinefeed (text: string): Linefeed {
  const CR = text.includes('\r')
  const LF = text.includes('\n')
  const CRLF = text.includes('\r\n')
  const LFCR = text.includes('\n\r')

  const indexCRLF = CRLF ? text.indexOf('\r\n') : Infinity
  const indexLFCR = LFCR ? text.indexOf('\n\r') : Infinity

  if (LF && !CR) {
    return '\n' // Unix-style (Linux/macOS)
  } else if (CR && !LF) {
    return '\r' // Commodore 64 and old Apple II systems, also emails afaik
  } else if (CRLF && indexCRLF < indexLFCR) {
    return '\r\n' // Windows and MS-DOS
  } else if (LFCR && indexLFCR < indexCRLF) {
    return '\n\r' // According to Wikipedia, only Acorn BBC and RISC OS
  } else {
    return '\n' // By default, assume a simple newline
  }
}
