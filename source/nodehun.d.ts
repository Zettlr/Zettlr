/**
 * This global module declaration is necessary since we have to directly import
 * the Nodehun dylib instead of just the module. Here we basically tell
 * Typescript that when we import the Nodehun.node library, we effectively
 * import the same thing as the nodehun module.
 */
declare module 'nodehun/build/Release/Nodehun.node' {
  import { Nodehun } from 'nodehun'
  export = Nodehun
}
