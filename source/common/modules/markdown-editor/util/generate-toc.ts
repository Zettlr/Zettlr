/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        generateTableOfContents
  * CVM-Role:        Utility function
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This function generates a table of contents for a Markdown string.
  *
  * END HEADER
  */

/**
 * A single entry within the table of contents
 */
export interface ToCEntry {
  /**
   * The zero-indexed line number of the heading
   */
  line: number
  /**
   * The text contents of the heading (without the heading formatting)
   */
  text: string
  /**
   * The level of the heading (1-6)
   */
  level: number
  /**
   * A human-readable title numbering (e.g. 1.2, 2.5.1)
   */
  renderedLevel: string
}

/**
 * Generates a table of contents from the given mdString and returns it
 *
 * @param   {string}      mdString  The Markdown to be used for generation
 *
 * @return  {ToCEntry[]}            The ToC elements
 */
export default function generateTableOfContents (mdString: string): ToCEntry[] {
  const toc = []

  const lines = mdString.split('\n')

  let inCodeBlock = false
  let inYamlFrontMatter = false

  for (let i = 0; i < lines.length; i++) {
    if (i === 0 && lines[0] === '---') {
      inYamlFrontMatter = true
      continue
    }

    if (inYamlFrontMatter && [ '...', '---' ].includes(lines[i])) {
      inYamlFrontMatter = false
      continue
    }

    if (inYamlFrontMatter) {
      continue
    }

    if (/^\s*`{3,}/.test(lines[i])) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      continue
    }

    // Now that invalid sections are out of the way, test for a heading
    if (/^#{1,6} /.test(lines[i])) {
      toc.push({
        line: i,
        // From the line remove both the heading indicators and optional ending classes
        text: lines[i].replace(/^#{1,6} /, '').replace(/\{.*\}$/, ''),
        level: (lines[i].match(/^(#+)/) ?? [ [], [] ])[1].length,
        renderedLevel: ''
      })
    }
  }

  // Now add the renderedLevel property to each toc entry
  let h1 = 0
  let h2 = 0
  let h3 = 0
  let h4 = 0
  let h5 = 0
  let h6 = 0
  for (const entry of toc) {
    switch (entry.level) {
      case 1:
        h1++
        h2 = h3 = h4 = h5 = h6 = 0
        entry.renderedLevel = h1.toString()
        break
      case 2:
        h2++
        h3 = h4 = h5 = h6 = 0
        entry.renderedLevel = [ h1, h2 ].join('.')
        break
      case 3:
        h3++
        h4 = h5 = h6 = 0
        entry.renderedLevel = [ h1, h2, h3 ].join('.')
        break
      case 4:
        h4++
        h5 = h6 = 0
        entry.renderedLevel = [ h1, h2, h3, h4 ].join('.')
        break
      case 5:
        h5++
        h6 = 0
        entry.renderedLevel = [ h1, h2, h3, h4, h5 ].join('.')
        break
      case 6:
        h6++
        entry.renderedLevel = [ h1, h2, h3, h4, h5, h6 ].join('.')
        break
    }
  }

  return toc
}
