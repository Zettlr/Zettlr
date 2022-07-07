/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ConfigFileContainer tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import ConfigFileContainer from '@common/modules/config-file-container'
import assert from 'assert'
import 'mocha'
import path from 'path'
import { promises as fs } from 'fs'

const thisdir = __dirname
const filePath = path.join(thisdir, 'test-container.config')

const testData = {
  someProperty: 'Hello world',
  aNestedProperty: { a: 1, b: 2 },
  anArray: [ 'one', 'two', 'three' ]
}

const updatedData = {
  someProperty: 'This has been updated!',
  aNestedProperty: { a: 1, b: 2 },
  anArray: [ 'one', 'two', 'three' ]
}

describe('Modules#ConfigFileContainer', function () {
  // Clean up after the test
  after(async function () {
    await fs.unlink(filePath)
  })

  it('should properly handle initialization', async function () {
    const container = new ConfigFileContainer(filePath, 'json', 1000)
    await assert.rejects(async () => await container.get(), 'The container did not complain about calling get()')

    await container.init(testData)

    await assert.doesNotReject(async () => await container.get(), 'The container complained despite being initialized')
    container.shutdown()
  })

  it('should return the same data as was provided', async function () {
    const container1 = new ConfigFileContainer(filePath, 'json', 1000)
    await container1.init(testData)
    let retData = await container1.get()
    assert.deepStrictEqual(retData, testData, 'The provided and returned data was not the same (JSON)')
    container1.shutdown()

    const container2 = new ConfigFileContainer(filePath, 'yaml', 1000)
    await container2.init(testData)
    retData = await container2.get()
    assert.deepStrictEqual(retData, testData, 'The provided and returned data was not the same (YAML)')
    container2.shutdown()
  })

  it('should correctly update stored data', async function () {
    const container = new ConfigFileContainer(filePath, 'json', 1000)
    await container.init(testData)
    const originalData = await container.get()
    assert.deepStrictEqual(originalData, testData, 'The container did not return the correct data')
    container.set(updatedData)
    // Wait for the specified amount of time
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 1500)
    })

    container.shutdown()

    // Then check that the correct data has been written by creating a new container
    const newContainer = new ConfigFileContainer(filePath, 'json', 1000)
    const newData = await newContainer.get()
    assert.deepStrictEqual(newData, updatedData)
    newContainer.shutdown()
  })
})
