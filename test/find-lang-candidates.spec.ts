/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        findLangCandidates tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import findLangCandidates from '@common/util/find-lang-candidates'
import assert from 'assert'

const candidatesFor = (tags: string[]): Array<{ tag: string }> => tags.map(tag => ({ tag }))

describe('Utility#findLangCandidates()', function () {
  it('should find an exact match', function () {
    const { exact, close } = findLangCandidates('en-US', candidatesFor([ 'en-US', 'en-GB' ]))
    assert.strictEqual(exact?.tag, 'en-US')
    assert.strictEqual(exact?.status, 'exact')
    assert.strictEqual(close, undefined)
  })

  it('should find a close match when only the region differs', function () {
    const { exact, close } = findLangCandidates('en', candidatesFor([ 'en-US', 'en-GB' ]))
    assert.strictEqual(exact, undefined)
    assert.strictEqual(close?.tag, 'en-US')
    assert.strictEqual(close?.status, 'close')
  })

  it('should not match a different language', function () {
    const { exact, close } = findLangCandidates('de-DE', candidatesFor([ 'en-US', 'fr-FR' ]))
    assert.strictEqual(exact, undefined)
    assert.strictEqual(close, undefined)
  })

  it('should find a tag that carries an extended language subtag', function () {
    // The subtag lists are arrays, so comparing them by identity rejected even
    // a candidate identical to the query
    const { exact } = findLangCandidates(
      'zh-cmn-Hans-CN',
      candidatesFor([ 'zh-cmn-Hans-CN', 'zh-Hans-CN' ])
    )
    assert.strictEqual(exact?.tag, 'zh-cmn-Hans-CN')
  })

  it('should still reject a candidate whose extended subtag differs', function () {
    const { exact, close } = findLangCandidates(
      'zh-cmn-Hans-CN',
      candidatesFor([ 'zh-yue-Hans-CN' ])
    )
    assert.strictEqual(exact, undefined)
    assert.strictEqual(close, undefined)
  })

  it('should keep matching a requested script exactly', function () {
    const { exact } = findLangCandidates('sr-Latn', candidatesFor([ 'sr-Cyrl', 'sr-Latn' ]))
    assert.strictEqual(exact?.tag, 'sr-Latn')
  })

  it('should return nothing for an empty candidate list', function () {
    const { exact, close } = findLangCandidates('en-US', [])
    assert.strictEqual(exact, undefined)
    assert.strictEqual(close, undefined)
  })
})
