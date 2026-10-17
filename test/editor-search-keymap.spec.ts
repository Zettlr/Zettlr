/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Editor search keymap tests
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests that F3 and Shift-F3 stay bound to the
 *                   search commands regardless of the customizable shortcuts.
 *
 * END HEADER
 */

import { strictEqual, ok } from 'assert'
import { findNext, findPrevious } from '@codemirror/search'
import { mainEditorKeybindings } from 'source/common/modules/markdown-editor/keymaps/default'

describe('mainEditorKeybindings()', () => {
  it('binds F3 to findNext and Shift-F3 to findPrevious', () => {
    // toSentenceCase() builds an Intl.Segmenter eagerly from the configured
    // app locale, so a valid locale has to be present before the keymap can
    // be constructed.
    window.config.set('appLang', 'en-US')

    const bindings = mainEditorKeybindings([], {
      autocompleteWithEnter: true,
      autocompleteWithTab: true
    })

    const f3Binding = bindings.find(b => b.key === 'F3')
    ok(f3Binding !== undefined, 'expected a keybinding for F3')
    strictEqual(f3Binding?.run, findNext)
    strictEqual(f3Binding?.shift, findPrevious)
  })
})
