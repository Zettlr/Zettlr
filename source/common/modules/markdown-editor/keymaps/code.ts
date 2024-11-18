import type { Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { sharedKeymap } from './shared'

// This keymap is used whenever non-Markdown text files are loaded. This keymap
// is less extensive than the Markdown one since we don't need many special
// keys, such as Cmd/Ctrl+B for bold text.
export function codeKeymap (): Extension {
  return keymap.of([
    // Include the sharedKeymap at the end to make the defaults available, but
    // with a lower priority, so that we can override anything in this keymap.
    ...sharedKeymap
  ])
}
