import type LogProvider from '@providers/log'
import removePath from '@common/util/remove-path'
import { shell } from 'electron'

export async function safeDelete (absPath: string, deleteOnFail: boolean, logger: LogProvider): Promise<void> {
  try {
    await shell.trashItem(absPath)
  } catch (err: unknown) {
    if (deleteOnFail) {
      // If this function throws, there's really something off and we shouldn't recover.
      logger.error(`[FSAL File] Forcing deletion of "${absPath}"!`)
      await removePath(absPath, { force: true, recursive: true })
    } else {
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw new Error(`[FSAL File] Could not remove file ${absPath}: ${message}`)
    }
  }
}
