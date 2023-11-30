/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Replace Links
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function can replace a set of links across a file
 *
 * END HEADER
 */

import extractYamlFrontmatter from './extract-yaml-frontmatter'
import path from 'path'

/**
 * Takes a Markdown document and replaces all occurrences of a link to
 * oldContent with links to newContent. NOTE: Do not remove the file extensions,
 * the function will do that for you!
 *
 * @param   {string}        markdown    The document in question
 * @param   {string}        oldContent  The link to be replaced.
 * @param   {string}        newContent  The new link contents
 *
 * @return  {string}                    The new document
 */
export default function replaceLinks (markdown: string, oldContent: string, newContent: string): string {
  // Users can link both to `Zettelkasten.md` as well as to `Zettelkasten`.
  // The "withoutExtension" vars will equal the arguments to the function if
  // there is no extension given.
  const oldWithoutExtension = path.basename(oldContent, path.extname(oldContent))
  const newWithoutExtension = path.basename(newContent, path.extname(newContent))

  if (!markdown.includes(oldContent) && !markdown.includes(oldWithoutExtension)) {
    return markdown
  }

  // Finding (Wiki/Zettelkasten) links is easy ...
  const linkRE = /\[\[(.+?)\]\]/g
  // ... but we need to ensure we don't arbitrarily parse anything in a
  // potential frontmatter
  const { frontmatter, content } = extractYamlFrontmatter(markdown)
  if (frontmatter !== null) {
    linkRE.lastIndex = markdown.indexOf(content)
  }

  // After that precaution, it's a simple matter of going through the document
  return markdown.replace(linkRE, (_, content: string) => {
    if (content === oldContent) {
      return `[[${newContent}]]`
    } else if (content === oldWithoutExtension) {
      return `[[${newWithoutExtension}]]`
    } else {
      return `[[${content}]]`
    }
  })
}
