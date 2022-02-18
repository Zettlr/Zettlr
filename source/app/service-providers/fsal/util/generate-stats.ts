/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        generateStats function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function takes the filetree of the FSAL and generates
 *                  some statistics based off that.
 *
 * END HEADER
 */

import objectToArray from '@common/util/object-to-array'
import { FSALStats } from '@dts/common/fsal'
import { MaybeRootDescriptor, DirDescriptor, MDFileDescriptor, CodeFileDescriptor } from '@dts/main/fsal'

export default function generateStats (filetree: MaybeRootDescriptor[]): FSALStats {
  // First, we need ALL of our loaded paths as an array
  let pathsArray: Array<DirDescriptor|MDFileDescriptor|CodeFileDescriptor> = []
  for (const descriptor of filetree) {
    pathsArray = pathsArray.concat(objectToArray(descriptor, 'children'))
  }

  // Now only the files
  const mdArray = pathsArray.filter(descriptor => descriptor.type === 'file') as MDFileDescriptor[]

  // So, let's first get our min, max, mean, and median word and charcount
  let minChars = Infinity
  let maxChars = -Infinity
  let minWords = Infinity
  let maxWords = -Infinity
  let sumChars = 0
  let sumWords = 0

  for (const descriptor of mdArray) {
    if (descriptor.charCount < minChars) {
      minChars = descriptor.charCount
    }

    if (descriptor.charCount > maxChars) {
      maxChars = descriptor.charCount
    }

    if (descriptor.wordCount < minWords) {
      minWords = descriptor.wordCount
    }

    if (descriptor.wordCount > maxWords) {
      maxWords = descriptor.wordCount
    }

    sumChars += descriptor.charCount
    sumWords += descriptor.wordCount
  }

  // Now calculate the mean
  const meanChars = Math.round(sumChars / mdArray.length)
  const meanWords = Math.round(sumWords / mdArray.length)

  // Now we are interested in the standard deviation to calculate the
  // spread of words in 95 and 99 percent intervals around the mean.
  let charsSS = 0
  let wordsSS = 0

  for (const descriptor of mdArray) {
    charsSS += (descriptor.charCount - meanChars) ** 2
    wordsSS += (descriptor.wordCount - meanWords) ** 2
  }

  // Now the standard deviation
  //                        |<      Variance      >|
  const sdChars = Math.sqrt(charsSS / mdArray.length)
  const sdWords = Math.sqrt(wordsSS / mdArray.length)

  // Calculate the standard deviation interval bounds
  const chars68PercentLower = Math.round(meanChars - sdChars)
  const chars68PercentUpper = Math.round(meanChars + sdChars)
  const chars95PercentLower = Math.round(meanChars - 2 * sdChars)
  const chars95PercentUpper = Math.round(meanChars + 2 * sdChars)

  const words68PercentLower = Math.round(meanWords - sdWords)
  const words68PercentUpper = Math.round(meanWords + sdWords)
  const words95PercentLower = Math.round(meanWords - 2 * sdWords)
  const words95PercentUpper = Math.round(meanWords + 2 * sdWords)

  return {
    minChars: minChars,
    maxChars: maxChars,
    minWords: minWords,
    maxWords: maxWords,
    sumChars: sumChars,
    sumWords: sumWords,
    meanChars: meanChars,
    meanWords: meanWords,
    sdChars: Math.round(sdChars),
    sdWords: Math.round(sdWords),
    chars68PercentLower: (chars68PercentLower < minChars) ? minChars : chars68PercentLower,
    chars68PercentUpper: (chars68PercentUpper > maxChars) ? maxChars : chars68PercentUpper,
    chars95PercentLower: (chars95PercentLower < minChars) ? minChars : chars95PercentLower,
    chars95PercentUpper: (chars95PercentUpper > maxChars) ? maxChars : chars95PercentUpper,
    words68PercentLower: (words68PercentLower < minWords) ? minWords : words68PercentLower,
    words68PercentUpper: (words68PercentUpper > maxWords) ? maxWords : words68PercentUpper,
    words95PercentLower: (words95PercentLower < minWords) ? minWords : words95PercentLower,
    words95PercentUpper: (words95PercentUpper > maxWords) ? maxWords : words95PercentUpper,
    mdFileCount: pathsArray.filter(d => d.type === 'file').length,
    codeFileCount: pathsArray.filter(d => d.type === 'code').length,
    dirCount: pathsArray.filter(d => d.type === 'directory').length
  }
}
