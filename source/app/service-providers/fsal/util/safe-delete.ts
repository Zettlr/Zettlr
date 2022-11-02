import { shell } from 'electron'
import { promises as fs } from 'fs'

export async function safeDelete (absPath: string, deleteOnFail: boolean): Promise<void> {
  try {
    await shell.trashItem(absPath)
  } catch (err: any) {
    if (deleteOnFail) {
      // If this function throws, there's really something off and we shouldn't recover.
      await fs.unlink(absPath)
    } else {
      err.message = `[FSAL File] Could not remove file ${absPath}: ${String(err.message)}`
      throw err
    }
  }
}
