/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Readability Mode
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This extension applies one of the available readability
 *                  metrics to Markdown documents.
 *
 * END HEADER
 */

import {
  ViewPlugin,
  Decoration,
  type ViewUpdate,
  type DecorationSet, EditorView
} from '@codemirror/view'
import { configField } from '../util/configuration'
import { extractTextnodes, markdownToAST } from '@common/modules/markdown-utils'

const scoreDecorations = [
  Decoration.mark({ class: 'cm-readability-0' }),
  Decoration.mark({ class: 'cm-readability-1' }),
  Decoration.mark({ class: 'cm-readability-2' }),
  Decoration.mark({ class: 'cm-readability-3' }),
  Decoration.mark({ class: 'cm-readability-4' }),
  Decoration.mark({ class: 'cm-readability-5' }),
  Decoration.mark({ class: 'cm-readability-6' }),
  Decoration.mark({ class: 'cm-readability-7' }),
  Decoration.mark({ class: 'cm-readability-8' }),
  Decoration.mark({ class: 'cm-readability-9' }),
  Decoration.mark({ class: 'cm-readability-10' })
]

/**
 * A WORD ON COMPLEX AND DIFFICULT WORDS
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
 * @param {number} val       The input value to be transformed.
 * @param {number} sourceMin The lower limit of the source scale.
 * @param {number} sourceMax The upper limit of the source scale.
 * @param {number} targetMin The lower limit of the target scale, default 0.
 * @param {number} targetMax The upper limit of the target scale, default 10.
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
const readabilityAlgorithms: Record<string, (words: string[]) => number> = {
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
    for (let word of words) {
      sos += Math.pow(word.length - mean, 2)
    }

    // Then standard deviation
    std = Math.sqrt(sos / (words.length - 1))
    wordThreshold = mean + 2 * std // Tadaaa

    for (let word of words) {
      if (word.length > wordThreshold) {
        difficultWords++
      }
    }

    const totalSize = words.length
    let percentageOfDifficultWords = difficultWords / totalSize

    score = 0.1579 * percentageOfDifficultWords * 100 + (0.0496 * totalSize)

    if (percentageOfDifficultWords > 0.05) {
      score += 3.6365
    }

    score = Math.floor(score)
    if (score < 0) {
      score = 0
    }
    if (score > 9) {
      score = 10
    }

    // Dale-Chall returns values between 0 and 10
    return zTransform(score, 0, 10)
  },
  'gunning-fog': (words: string[]) => {
    // Gunning-Fog produces grades between 0 and 20 (tested with Bartleby full text).
    let score = 0
    let difficultWords = 0

    // Again we need the amount of "difficult words",
    // so we'll re-apply our definition from Dale-Chall.
    let mean = words.join('').length / words.length

    // Now the sum of squares (SoS)
    let sos = 0
    for (let word of words) {
      sos += Math.pow(word.length - mean, 2)
    }

    // Then standard deviation
    let std = Math.sqrt(sos / (words.length - 1))
    let wordThreshold = mean + 2 * std // Tadaaa
    for (let word of words) {
      if (word.length > wordThreshold) {
        difficultWords++
      }
    }

    score = 0.4 * (words.length + 100 * difficultWords / words.length)
    if (score < 0) {
      score = 0
    }
    if (score > 20) {
      score = 20
    }

    // Gunning-Fog returns values between 6 and 17
    return zTransform(score, 0, 20)
  },
  'coleman-liau': (words: string[]) => {
    // Coleman-Liau produces grades between 0 and 43 (tested with Bartleby full text).
    let score = 0
    let mean = words.join('').length / words.length
    // Formula taken from https://en.wikipedia.org/wiki/Coleman%E2%80%93Liau_index
    score = 5.89 * mean - 0.3 / (100 * words.length) - 15.8
    if (score < 0) {
      score = 0
    }
    if (score > 30) {
      score = 30
    }

    return zTransform(score, 0, 30)
  },
  'automated-readability': (words: string[]) => {
    // The ARI produces grades between -7 and 71 (tested with Bartleby full text).
    let score = 0
    let mean = words.join('').length / words.length

    // Formula see Wikipedia: https://en.wikipedia.org/wiki/Automated_readability_index
    score = 4.71 * mean + 0.5 * words.length - 21.43
    score = Math.ceil(score) // Scores must always be rounded up

    if (score < 0) {
      score = 0
    }
    if (score > 50) {
      score = 50
    }

    return zTransform(score, 0, 50)
  }
}

function extractScores (text: string, offset: number, algorithm: string): any[] {
  // Split at potential sentence-endings
  const textNodes = extractTextnodes(markdownToAST(text))
  const sentences = textNodes
    // Then, extract all sentences from the node's value
    .map(node => {
      const sentences = node.value.split(/[.:!?]\s+|\n/ig).filter(s => s.trim() !== '')
      const ret: Array<{ sentence: string, score: number, from: number, to: number }> = []
      const relativeStart = offset + node.from
      let index = 0

      for (const sentence of sentences) {
        index = node.value.indexOf(sentence, index)

        const words = sentence.trim().split(' ').filter(word => word !== '')
        const score = readabilityAlgorithms[algorithm](words)
        const from = relativeStart + index
        let to = relativeStart + index + sentence.length
        // If the next character after the sentence is a sentence ending, add it
        // to the sentence range so that the decorator includes it, which makes
        // it all look better.
        const charAfter = node.value.slice(to - relativeStart, to - relativeStart + 1)
        if ('.:!?'.includes(charAfter)) {
          to++
        }

        ret.push({ sentence, from, to, score })
        index += sentence.length
      }

      return ret
    })
    .flat() // We now have a 2d array --> flatten

  return sentences
    .map(sentence => scoreDecorations[sentence.score].range(sentence.from, sentence.to))
}

function readabilityScores (view: EditorView): DecorationSet {
  const { readabilityAlgorithm, readabilityMode } = view.state.field(configField)
  if (!readabilityMode) {
    return Decoration.none
  }

  let decos: any[] = []
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.sliceDoc(from, to)
    decos = decos.concat(extractScores(text, from, readabilityAlgorithm))
  }

  return Decoration.set(decos, true)
}

const readabilityModePlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = readabilityScores(view)
  }

  update (update: ViewUpdate): void {
    this.decorations = readabilityScores(update.view)
  }
}, {
  decorations: v => v.decorations
})

export const readabilityMode = [
  readabilityModePlugin,
  EditorView.baseTheme({
    // Define the readability classes based on a traffic light system. 
    // Red indicates bad readability scores, yellow indicates average scores, 
    // and green indicates good readability scores.
    '&light .cm-readability-0': { backgroundColor: '#298f2baa', color: '#444' },
    '&light .cm-readability-1': { backgroundColor: '#51c744aa', color: '#444' },
    '&light .cm-readability-2': { backgroundColor: '#74f84baa', color: '#444' },
    '&light .cm-readability-3': { backgroundColor: '#97f749aa', color: '#444' },
    '&light .cm-readability-4': { backgroundColor: '#c3f749aa', color: '#444' },
    '&light .cm-readability-5': { backgroundColor: '#ebf749aa', color: '#444' },
    '&light .cm-readability-6': { backgroundColor: '#f8e114aa', color: '#444' },
    '&light .cm-readability-7': { backgroundColor: '#fca625aa', color: '#444' },
    '&light .cm-readability-8': { backgroundColor: '#ff6911aa', color: '#444' },
    '&light .cm-readability-9': { backgroundColor: '#ff3b00aa', color: '#444' },
    '&light .cm-readability-10': { backgroundColor: '#cc0000aa', color: '#444' },
    // Dark styles
    '&dark .cm-readability-0': { backgroundColor: '#298f2baa', color: '#ccc' },
    '&dark .cm-readability-1': { backgroundColor: '#51c744aa', color: '#ccc' },
    '&dark .cm-readability-2': { backgroundColor: '#74f84baa', color: '#ccc' },
    '&dark .cm-readability-3': { backgroundColor: '#97f749aa', color: '#ccc' },
    '&dark .cm-readability-4': { backgroundColor: '#c3f749aa', color: '#ccc' },
    '&dark .cm-readability-5': { backgroundColor: '#ebf749aa', color: '#ccc' },
    '&dark .cm-readability-6': { backgroundColor: '#f8e114aa', color: '#ccc' },
    '&dark .cm-readability-7': { backgroundColor: '#fca625aa', color: '#ccc' },
    '&dark .cm-readability-8': { backgroundColor: '#ff6911aa', color: '#ccc' },
    '&dark .cm-readability-9': { backgroundColor: '#ff3b00aa', color: '#ccc' },
    '&dark .cm-readability-10': { backgroundColor: '#cc0000aa', color: '#ccc' }
  })
]
