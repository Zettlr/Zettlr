/**
 * A chunk of text not inside any delimiter.
 */
export type NotDelimitedText = {
  kind: 'not-delimited-text'
  text: string
}

/**
 * A chunk of delimited text.
 */
export type DelimitedText = {
  kind: 'delimited-text'

  /**
   * The delimiter around the `text`.
   */
  delimiter: string

  /**
   * The text _inside_ the `delimiter`.
   *
   * Given the text `"Blush"` and a delimiter of `"`:
   *
   * * the `text` will be `Blush`
   * * the `delimiter` will be `"`
   */
  text: string
}

export type MaybeDelimitedText = NotDelimitedText | DelimitedText

export type NonEmptyArray<T> = [T, ...T[]]

/**
 * Build a function that chunks text by _pairs_ of the `delimiter`.
 *
 * Give the string `What a _wonderful_ world!` and using the delimiter `_`, the
 * function will return an array of objects with the texts
 * `["What a ", "wonderful", " world"]`.
 *
 * You can identify which text was delimited by interrogating the objects:
 * delimited text will have the `kind` of `"delimited-text"`.
 *
 * @param   {string}  delimiter  The delimiter; `,`, `"`, etc.
 *
 * @return  {Function}           A delimiting function.
 */
export function delimit (delimiter: string) {
  const pattern = new RegExp(`(${delimiter})(.+?)\\1`, 'd')

  return (text: string): NonEmptyArray<MaybeDelimitedText> => {
    const texts: MaybeDelimitedText[] = []

    let exhausted = false
    let workingText = text

    do {
      const match = pattern.exec(workingText)

      if (match?.indices == null) {
        exhausted = true

        texts.push({
          kind: 'not-delimited-text',
          text: workingText
        })
      } else {
        // push everything up to the match
        texts.push({
          kind: 'not-delimited-text',
          text: workingText.substring(0, match.index)
        })

        // push the match itself
        texts.push({
          kind: 'delimited-text',
          delimiter,
          text: match[2]
        })

        // and then change the working text to everything after the match
        workingText = workingText.substring(match.indices[0][1])
      }
    } while (!exhausted)

    if (texts.length === 0) {
      // degenerate case of no matches at all so just return the whole text
      texts.push({
        kind: 'not-delimited-text',
        text: text
      })
    }

    return texts as NonEmptyArray<MaybeDelimitedText>
  }
}
