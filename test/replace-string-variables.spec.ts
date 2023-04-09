/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        replaceLinks tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import replaceStringVariables from '@common/util/replace-string-variables'
import { strictEqual } from 'assert'
import { DateTime } from 'luxon'

const myDate = DateTime.fromISO('2017-12-26T21:12:00.000', { zone: 'Europe/Stockholm' })

const replaceStringVariableTesters = [
  { in: '%Y-%M-%D', out: '2017-12-26' },
  { in: '%h:%m:%s', out: '21:12:00' },
  { in: 'Week %W, \'%y', out: 'Week 52, \'17' },
  { in: 'Zettlr was released at %X', out: 'Zettlr was released at 1514319120' }
]

describe('Utility#replaceLinks()', function () {
  for (const test of replaceStringVariableTesters) {
    it(`should replace the variables in "${test.in}" with "${test.out}"`, function () {
      strictEqual(replaceStringVariables(test.in, myDate), test.out)
    })
  }
})
