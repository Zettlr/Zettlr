/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Windows emoji panel regression tests
 * CVM-Role:        Testing
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Chromium reverts emoji-panel insertions when the focused
 *                  editable element sets `autocorrect="off"` (Chromium bugs
 *                  487613498 and 530123092). CodeMirror sets that attribute,
 *                  so the Win+. symbol panel inserted nothing into the editor
 *                  (issue #6547). These tests pin the Windows override.
 *
 * END HEADER
 */

import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { strictEqual } from 'assert'
import { autocorrectOnWindows } from '../source/common/modules/markdown-editor/util/autocorrect'

describe('Windows emoji panel (issue #6547)', function () {
  let view: EditorView | undefined

  before(function () {
    // The shared setup stubs the frame callbacks on the Node global, but
    // CodeMirror schedules them on the window of the document it mounts in.
    if (typeof window.requestAnimationFrame !== 'function') {
      window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
        return setTimeout(() => { callback(Date.now()) }, 0) as unknown as number
      }) as typeof window.requestAnimationFrame
    }
    if (typeof window.cancelAnimationFrame !== 'function') {
      window.cancelAnimationFrame = ((handle: number) => {
        clearTimeout(handle)
      }) as typeof window.cancelAnimationFrame
    }
  })

  afterEach(function () {
    view?.destroy()
    view = undefined
  })

  function mountAndReadAttribute (platform: string): string | null {
    view = new EditorView({
      state: EditorState.create({
        doc: 'Hello world',
        extensions: [autocorrectOnWindows(platform)]
      }),
      parent: document.body
    })

    return view.contentDOM.getAttribute('autocorrect')
  }

  it('turns autocorrect on for the Windows editor', function () {
    strictEqual(mountAndReadAttribute('win32'), 'on')
  })

  it('keeps the CodeMirror default on other platforms', function () {
    strictEqual(mountAndReadAttribute('linux'), 'off')
  })
})
