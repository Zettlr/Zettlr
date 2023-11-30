/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Counter tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { shortenUrlVisually } from '@common/util/shorten-url-visually'
import { strictEqual } from 'assert'

const testUrls = [
  {
    input: 'https://www.cambridge.org/core/journals/philosophy-of-science/issue/F854E266F79EA9FC1D8EA585021FC72F?sort=canonical.position%3Aasc&pageNum=1&searchWithinIds=F854E266F79EA9FC1D8EA585021FC72F&productType=JOURNAL_ARTICLE&template=cambridge-core%2Fjournal%2Farticle-listings%2Flistings-wrapper&hideArticleJournalMetaData=true&displayNasaAds=false',
    expected: 'www.cambridge.org/…ls/philosophy-of-science/issue/F854E266F79EA9FC1D8EA585021FC72F'
  },
  {
    input: 'https://en.wikipedia.org/wiki/Marxist_literary_criticism#Critiquing_literary_works_through_Marxist_lens',
    expected: 'https://en.wikipedia.org/wiki/Marxist_literary_criticism'
  }
]

describe('Utility#shortenUrlVisually()', function () {
  for (const test of testUrls) {
    it(`should shorten URL to '${test.expected}'`, function () {
      const shortened = shortenUrlVisually(test.input)
      strictEqual(shortened, test.expected)
    })
  }
})
