import { transformSelectedText } from './transform-selected-text'

const SEPARATOR_WORD = ' '
const SEPARATOR_PARAGRAPH = '\n\n'

/**
 * Remove unwanted line breaks from selected text.
 *
 * Note that paragraphs will still be preserved. In this implementation a
 * paragraph is indicated by two line breaks in sequence. (`\n\n`)
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The text with unwanted line breaks removed.
 */
export const removeLineBreaks = transformSelectedText((text) => {
  return text
    .split(SEPARATOR_PARAGRAPH)
    .filter((paragraph) => paragraph.length > 0)
    .map((line) =>
      line.split('\n')
        .map((word) => word.trim())
        .join(SEPARATOR_WORD)
    )
    .join(SEPARATOR_PARAGRAPH)
})
