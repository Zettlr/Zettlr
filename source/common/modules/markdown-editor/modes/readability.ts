/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror readability mode
 * CVM-Role:        CodeMirror Mode
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This mode extends the Markdown mode and highlights whole
 *                  sentences using one of four available readability algorithms.
 *
 * END HEADER
 */

import { defineMode, overlayMode, getMode, defineMIME, Mode } from 'codemirror'

/**
 * INTRODUCTION
 *
 * Some of the following algorithms need the amount of difficult or complex
 * words that appear inside a given sentence. These are mostly not computed but
 * given in form of a dictionary. So the "correct" application of these
 * algorithms would be to either look up all words in a sentence in a provided
 * dictionary, or to calculate the amount of syllables of each word. "Difficult"
 * words are mainly calculated with dictionaries, while "complex" words are
 * mostly defined by the amount of syllables. Another difficulty with many of
 * the algorithms is that they have been developed with the English language in
 * mind. Thereby, other languages face huge problems when it comes to
 * appropriate readability scores. To alleviate these problems and to make sure
 * the algorithm is both fast and language-agnostic, both complex and difficult
 * words are re-defined for the purposes of this CodeMirror mode as following:
 *
 * Complex or difficult words are words whose number of characters exceeds the
 * threshold of two times the standard deviation of the average word length
 * inside a given sentence. This means that the probability of difficult words
 * is defined to be 5 percent of the language (as two times the standard
 * deviation around the average value includes 95 % of all possible values).
 *
 * This is a statistically sound measure, because this way we set the bar of the
 * presumed skill of reading to be higher than average (as 5 percent difficult
 * words will mainly apply to academics, journalists, and generally people that
 * work a lot with text). Additionally, according to Coleman and Liau, who
 * devised the Coleman-Liau readability algorithm: "There is no need to estimate
 * syllables since word length in letters is a better predictor of readability
 * than word length in syllables." (1975, see
 * https://psycnet.apa.org/fulltext/1975-22007-001.pdf)
 */

/**
 * Performs a z-transformation of a given value from the source range to the
 * target range. NOTE: If source and target ranges are extraordinarily far away
 * in terms of range size, the result will suffer some precision. The effects
 * are visible at the magnitude of ten (so if the range sizes are about ten
 * times apart from each other).
 *
 * @param {Number} val       The input value to be transformed.
 * @param {Number} sourceMin The lower limit of the source scale.
 * @param {Number} sourceMax The upper limit of the source scale.
 * @param {Number} targetMin The lower limit of the target scale.
 * @param {Number} targetMax The upper limit of the target scale.
 */
function zTransform (val: number, sourceMin: number, sourceMax: number, targetMin: number = 0, targetMax: number = 10): number {
  // This algorithm "shrinks" val to the scale 0:1 before extrapolating
  // to the target scale.

  // Calculate the ranges
  let sourceRange = sourceMax - sourceMin
  let targetRange = targetMax - targetMin

  // Calculate the percentage (i.e. value as expressed in range 0:1).
  // We round to strengthen the precision with natural numbers.
  let percentage = Math.round((val - sourceMin) / sourceRange * 100) / 100

  // All we need is now a simple cross-multiplication
  let targetVal = targetMin + percentage * targetRange
  return Math.round(targetVal) // Round again for natural numbers
}

/**
 * Readability algorithms, currently supported: dale-chall, gunning-frog,
 * coleman-liau and automated readability.
 * @type {Object}
 */
const readabilityAlgorithms = {
  /**
   * Calculates a score for a sentence, given an Array of words.
   * @type {Function}
   */
  'dale-chall': (words: string[]) => {
    // Gunning-Fog produces grades between 0 and 11 (tested with Bartleby full text).
    let score = 0
    let difficultWords = 0
    let mean = 0
    let std = 0 // Standard deviation of word length
    let wordThreshold = 0 // Will be mean + 1 * std

    // To do so first calculate the mean of the word lengths.
    mean = words.join('').length / words.length // See what I did here? 8)

    // Now the sum of squares (SoS)
    let sos = 0
    for (let word of words) sos += Math.pow(word.length - mean, 2)

    // Then standard deviation
    std = Math.sqrt(sos / (words.length - 1))
    wordThreshold = mean + 2 * std // Tadaaa

    for (let word of words) if (word.length > wordThreshold) difficultWords++

    const totalSize = words.length
    let percentageOfDifficultWords = difficultWords / totalSize

    score = 0.1579 * percentageOfDifficultWords * 100 + (0.0496 * totalSize)

    if (percentageOfDifficultWords > 0.05) score += 3.6365

    score = Math.floor(score)
    if (score < 0) score = 0
    if (score > 9) score = 10

    // Dale-Chall returns values between 0 and 10
    return zTransform(score, 0, 10)
  },
  /**
   * Calculates a score for a sentence following Gunning-Fog, given an Array of words.
   * @type {Function}
   */
  'gunning-fog': (words: string[]) => {
    // Gunning-Fog produces grades between 0 and 20 (tested with Bartleby full text).
    let score = 0
    let difficultWords = 0

    // Again we need the amount of "difficult words",
    // so we'll re-apply our definition from Dale-Chall.
    let mean = words.join('').length / words.length

    // Now the sum of squares (SoS)
    let sos = 0
    for (let word of words) sos += Math.pow(word.length - mean, 2)

    // Then standard deviation
    let std = Math.sqrt(sos / (words.length - 1))
    let wordThreshold = mean + 2 * std // Tadaaa
    for (let word of words) if (word.length > wordThreshold) difficultWords++

    score = 0.4 * (words.length + 100 * difficultWords / words.length)
    if (score < 0) score = 0
    if (score > 20) score = 20

    // Gunning-Fog returns values between 6 and 17
    return zTransform(score, 0, 20)
  },
  /**
   * Calculates a score for a sentence following Coleman/Liau, given an Array of words.
   * @type {Function}
   */
  'coleman-liau': (words: string[]) => {
    // Coleman-Liau produces grades between 0 and 43 (tested with Bartleby full text).
    let score = 0
    let mean = words.join('').length / words.length
    // Formula taken from https://en.wikipedia.org/wiki/Coleman%E2%80%93Liau_index
    score = 5.89 * mean - 0.3 / (100 * words.length) - 15.8
    if (score < 0) score = 0
    if (score > 30) score = 30

    return zTransform(score, 0, 30)
  },
  /**
   * Calculates a score for a sentence following ARI, given an Array of words.
   * @type {Function}
   */
  'automated-readability': (words: string[]) => {
    // The ARI produces grades between -7 and 71 (tested with Bartleby full text).
    let score = 0
    let mean = words.join('').length / words.length

    // Formula see Wikipedia: https://en.wikipedia.org/wiki/Automated_readability_index
    score = 4.71 * mean + 0.5 * words.length - 21.43
    score = Math.ceil(score) // Scores must always be rounded up

    if (score < 0) score = 0
    if (score > 50) score = 50

    return zTransform(score, 0, 50)
  }
}

const delim = '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~ «»“”–—…÷‘’‚'
const sentenceEndings = '!?.:'

interface ReadabilityModeState {
  /**
   * A variable holding information about whether the mode is currently
   * processing a frontmatter
   */
  inFrontmatter: boolean
  /**
   * A variable that will be true only when we are at the very start of a file
   */
  startOfFile: boolean
  /**
   * This variable holds the amount of characters the mode should skip over
   * before processing the next sentence
   */
  eatCharacters: number
}

/**
* This defines the readability mode. It will highlight sentences according
* to readability formulae. I don't specifically know what these formulae
* do, as I'm not a linguist, but I trust them. Adapted from Titus Worm's
* work over at github.com/wooorm.
* @param  {Object} config       The config with which the mode was loaded
* @param  {Object} parserConfig The previous config object
* @return {OverlayMode}              The loaded overlay mode.
*/
defineMode('readability', function (config, parserConfig) {
  const readability: Mode<ReadabilityModeState> = {
    startState: function () {
      return {
        startOfFile: true,
        inFrontmatter: false,
        eatCharacters: 0
      }
    },
    copyState: function (state) {
      return {
        startOfFile: state.startOfFile,
        inFrontmatter: state.inFrontmatter,
        eatCharacters: state.eatCharacters
      }
    },
    token: function (stream, state) {
      // As in the Markdown mode (basically just copied over the logic), we also
      // have to keep track of a frontmatter to not render it using readability
      if (state.startOfFile && stream.sol() && stream.match(/---/) !== null) {
        // Assume a frontmatter
        state.startOfFile = false
        state.inFrontmatter = true
        return null
      } else if (!state.startOfFile && state.inFrontmatter) {
        // Still in frontMatter?
        if (stream.sol() && stream.match(/---|\.\.\./) !== null) {
          state.inFrontmatter = false
          return null
        }

        // Skip over the line
        stream.skipToEnd()
        return null
      } else if (state.startOfFile) {
        // If no frontmatter was found, set the state to a desirable state
        state.startOfFile = false
      }

      // After the frontmatter, next possibility is that we have to jump over
      // a few characters. This can happen below if the end of a detected
      // sentence includes delimiters. We exclude them both from calculation and
      // from rendering, so we have to assign them the null-class first before
      // continuing to render sentences.
      while (state.eatCharacters > 0) {
        --state.eatCharacters
        stream.next()
      }

      // Now that the frontmatter has been dealt with, extract a sentence.
      let sentence = ''
      const ch = stream.peek()
      if (ch !== null && delim.includes(ch)) {
        // When encountering delimiters outside of a sentence, jump over them.
        stream.next()
        return null
      }

      while (!stream.eol()) {
        const ch = stream.peek()
        if (ch !== null && sentenceEndings.includes(ch)) {
          sentence += stream.next() as string
          // Check if this really was the end of the sentence. Else, continue to
          // include characters.
          if (!stream.eol() && stream.peek() === ' ') {
            break
          }
        } else {
          sentence += stream.next() as string
        }
      }

      // Post-production of the sentence -> First, remove delims at the end of
      // the sentence.
      while (delim.includes(sentence[sentence.length - 1]) &&
        !sentenceEndings.includes(sentence[sentence.length - 1])) {
        // Special case: Brackets. If the sentence ends with one and somewhere
        // inside there is just the opening pendant, include it in rendering.
        let shouldBreak = false
        const minusLastChar = sentence.substring(0, sentence.length - 1)
        for (const [ start, end ] of [ [ '(', ')' ], [ '[', ']' ], [ '{', '}' ] ]) {
          if (
            sentence[sentence.length - 1] === end &&
            minusLastChar.lastIndexOf(start) > minusLastChar.lastIndexOf(end)
          ) {
            shouldBreak = true
            break
          }
        }

        if (shouldBreak) {
          break
        }

        sentence = sentence.substring(0, sentence.length - 1)
        // Also back up so that the rendered class does not include these
        // characters
        stream.backUp(1)
        ++state.eatCharacters
      }

      // Now, remove some Markdown formattings
      sentence = sentence.replace(/[*_]{1,3}[^_*]+[_*]{1,3}/g, '')
      sentence = sentence.replace(/\[\[[^\]]+\[\[/g, '')
      // Remove images completely
      sentence = sentence.replace(/!\[[^\]]+\]\([^)]+\)/g, '')
      // Make links as they would be read
      sentence = sentence.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove citations
      sentence = sentence.replace(/\[[^[\]]*@[^[\]]+\]/, '')

      if (sentence.length < 2) {
        // Don't render too short sentences.
        return null
      }

      const words = sentence.trim().split(' ')

      // Pluck empty strings
      if (words[0] === '') {
        words.shift()
      }
      if (words[words.length - 1] === '') {
        words.pop()
      }

      const algorithm: keyof typeof readabilityAlgorithms = (config as any).zettlr.readabilityAlgorithm ?? 'dale-chall'

      const score = readabilityAlgorithms[algorithm](words)

      // Now return a token corresponding to the score.
      return 'readability-' + score.toString()
    }
  }

  return overlayMode(getMode(config, 'markdown-zkn'), readability, true)
})

// Define the corresponding MIME
defineMIME('text/x-markdown-readability', 'readability')
