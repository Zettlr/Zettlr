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
 * Generates a table of contents from the given mdString and returns it
 *
 * @param   {string}  mdString  The Markdown to be used for generation
 *
 * @return  {any[]}             The ToC elements
 */
export default function generateTableOfContents (mdString: string): any[] {
  let toc = []

  let lines = mdString.split('\n')

  let inCodeBlock = false
  let inYamlFrontMatter = lines[0] === '---'
  for (let i = 0; i < lines.length; i++) {
    if (inYamlFrontMatter && [ '...', '---' ].includes(lines[i])) {
      inYamlFrontMatter = false
      continue
    }

    if (inYamlFrontMatter && ![ '...', '---' ].includes(lines[i])) {
      continue
    }

    if (/^\s*`{3,}/.test(lines[i])) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock && !/^\s*`{3,}$/.test(lines[i])) {
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
  for (let entry of toc) {
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
