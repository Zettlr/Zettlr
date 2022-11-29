/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PersistentDataContainer tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import PersistentDataContainer from '@common/modules/persistent-data-container'
import assert from 'assert'
import 'mocha'
import path from 'path'
import { promises as fs } from 'fs'

const thisdir = __dirname

// Holds the path to the only config file we require during testing
const filePath = path.join(thisdir, 'test-container.config')
// Since we're not dealing with many set() calls per second, we can set the delay
// to something much shorter here so we don't have to wait for too long for testing
// if everything works fine.
const delay = 10

// Test data
const testData = {
  someProperty: 'Hello world',
  aNestedProperty: { a: 1, b: 2 },
  anArray: [ 'one', 'two', 'three' ]
}

// Test data for checking if updates work fine
const updatedData = {
  someProperty: 'This has been updated!',
  aNestedProperty: { a: 1, b: 2 },
  anArray: [ 'one', 'two', 'three' ]
}

describe('Modules#PersistentDataContainer', function () {
  // Clean up after the test so we have no dangling files in here
  after(async function () {
    await fs.unlink(filePath)
  })

  it('should properly handle initialization', async function () {
    const container = new PersistentDataContainer(filePath, 'json', delay)
    await assert.rejects(async () => await container.get(), 'The container did not complain about calling get()')

    await container.init(testData)

    await assert.doesNotReject(async () => await container.get(), 'The container complained despite being initialized')
    container.shutdown()
  })

  it('should return the same data as was provided', async function () {
    const container1 = new PersistentDataContainer(filePath, 'json', delay)
    await container1.init(testData)
    let retData = await container1.get()
    assert.deepStrictEqual(retData, testData, 'The provided and returned data was not the same (JSON)')
    container1.shutdown()

    const container2 = new PersistentDataContainer(filePath, 'yaml', delay)
    await container2.init(testData)
    retData = await container2.get()
    assert.deepStrictEqual(retData, testData, 'The provided and returned data was not the same (YAML)')
    container2.shutdown()
  })

  it('should correctly update stored data', async function () {
    const container = new PersistentDataContainer(filePath, 'json', delay)
    await container.init(testData)
    const originalData = await container.get()
    assert.deepStrictEqual(originalData, testData, 'The container did not return the correct data')
    container.set(updatedData)
    // Wait for the specified amount of time
    await new Promise((resolve, reject) => {
      setTimeout(resolve, delay + 100) // We add 100ms to make sure the write was successful
    })

    container.shutdown()

    // Then check that the correct data has been written by creating a new container
    const newContainer = new PersistentDataContainer(filePath, 'json', delay)
    const newData = await newContainer.get()
    assert.deepStrictEqual(newData, updatedData)
    newContainer.shutdown()
  })

  it('should not accept null or undefined as data', async function () {
    const container = new PersistentDataContainer(filePath, 'json', delay)

    await assert.rejects(async () => await container.init(undefined), 'The container did not reject undefined init data')
    await assert.rejects(async () => await container.init(null), 'The container did not reject null init data')

    // Init properly
    await container.init(testData)

    assert.throws(() => container.set(undefined), 'The container did not reject undefined data')
    assert.throws(() => container.set(null), 'The container did not reject null data')
  })

  it('should throw an error for non-serializable data', async function () {
    const container = new PersistentDataContainer(filePath, 'json', delay)

    await container.init(testData)

    // Funny enough, only BigInts don't work. Everything else is simply replaced
    // with "null".
    assert.throws(() => container.set({ a: BigInt(1) }))
  })
})
