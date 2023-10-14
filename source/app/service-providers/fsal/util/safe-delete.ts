import type LogProvider from '@providers/log'
import { shell } from 'electron'
import { promises as fs } from 'fs'

export async function safeDelete (absPath: string, deleteOnFail: boolean, logger: LogProvider): Promise<void> {
  try {
    await shell.trashItem(absPath)
  } catch (err: any) {
    if (deleteOnFail) {
      // If this function throws, there's really something off and we shouldn't recover.
      logger.error(`[FSAL File] Forcing deletion of "${absPath}"!`)
      await fs.rm(absPath, { recursive: true, force: true })
    } else {
      err.message = `[FSAL File] Could not remove file ${absPath}: ${String(err.message)}`
      throw err
    }
  }
}
