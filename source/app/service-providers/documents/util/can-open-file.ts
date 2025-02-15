import { hasMdOrCodeExt } from '@common/util/file-extention-checks'
import { promises as fs, constants as FSConstants } from 'fs'

/**
 * Checks if the given absolute path represents a file supported by Zettlr
 * (YAML, Markdown, JSON, etc.) and if the process has the correct access rights
 * to it.
 *
 * @param   {string}  filePath  The filePath to check
 *
 * @return  {Promise<boolean>}  True if everything is okay with the file
 */
export async function canOpenFile (filePath: string): Promise<boolean> {
  try {
    // 1. Check for access and rights issues
    await fs.access(filePath,
      FSConstants.F_OK | // File must be visible to the process
      FSConstants.R_OK | // We need to read it
      FSConstants.W_OK // And write it
    )
  } catch (err: any) {
    return false
  }

  // Then check if it's actually a file we can handle
  if (!hasMdOrCodeExt(filePath)) {
    return false
  }

  return true
}
