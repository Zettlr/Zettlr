/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Vue shim
 * CVM-Role:        Types
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file makes sure TypeScript is able to work with Vue files.
 *
 * END HEADER
 */

// declare module '*.vue' {
//   import Vue from 'vue'
//   export default Vue
// }

declare module '*.vue' {
  import type { defineComponent } from 'vue'
  const Component: ReturnType<typeof defineComponent>
  export default Component
}
