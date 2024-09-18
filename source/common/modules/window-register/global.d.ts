/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Global renderer types
 * CVM-Role:        Types
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains interfaces used by the renderer. Due to
 *                  the way TypeScript works, these are also available in main
 *                  process files, but should be seen as invalid there.
 *
 * END HEADER
 */

declare namespace NodeJS {
  interface Global {
    config: any
  }
}
