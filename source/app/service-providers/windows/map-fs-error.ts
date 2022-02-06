/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        reportFSError
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function provides a convenient way to inform users
 *                  about file or directory operation errors, usually thrown by
 *                  calls to some method on the fs module.
 *
 * END HEADER
 */

interface NodeError extends Error {
  dest?: string
  path?: string
  code: string
}

// For now, we only account for the very common system errors, see:
// https://nodejs.org/api/errors.html#common-system-errors
function mapErrorCode (errorCode: string): string {
  switch (errorCode) {
    case 'EACCESS':
      return `${errorCode}: You do not have permission to access this object`
    case 'ECONNREFUSED':
      return `${errorCode}: The target server refused the connection`
    case 'EISDIR':
      return `${errorCode}: Expected to open a file, but a folder was provided`
    case 'EMFILE':
      return `${errorCode}: We could not open the file, because other programs occupy all the available space for file handles`
    case 'ENOENT':
      return `${errorCode}: The given path does not exist`
    case 'ENOTDIR':
      return `${errorCode}: Expected to open a folder, but a file was provided`
    case 'EPERM':
      return `${errorCode}: You do not have permission to access this object, but might be able to do so with elevated privileges`
    case 'ETIMEDOUT':
      return `${errorCode}: The operation took too long to finish`
    case 'ENAMETOOLONG':
      return `${errorCode}: The path was too long for the operating system to handle`
    // FROM HERE ON CUSTOM ERROR CODES BY US
    case 'EINVALIDPATH':
      return `${errorCode}: The file had a wrong file extension`
    default:
      return `${errorCode}: Unknown error`
  }
}

export default function mapFSError (error: NodeError): { what: string, why: string } {
  // This function should display a very specific type of information: Why a
  // certain error occurred. The user is not interested in a callstack or trace
  // but rather in "why didn't Zettlr open that Workspace/root file?"
  // So they need the following information:
  // * What failed to load?
  // * Why did it fail to load?
  //
  // See for the following as reference: https://nodejs.org/api/errors.html#errors
  return {
    what: error.path ?? error.dest ?? '<unknown>',
    why: mapErrorCode(error.code)
  }
}
