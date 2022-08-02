/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File extension functions
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Two small utility functions to centralise which file
 *                  extensions are allowed both for Markdown and code files.
 *
 * END HEADER
 */

/**
 * Returns an array with all recognised Markdown file extensions (lowercase)
 *
 * @param   {boolean}       withDot  If true, returns the extensions with dot.
 *
 * @return  {string[]}               The list of valid file extensions
 */
export function mdFileExtensions (withDot = false): string[] {
  const ext = [ 'md', 'rmd', 'qmd', 'markdown', 'txt', 'mdx', 'mkd' ]

  return (withDot) ? ext.map(e => '.' + e) : ext
}

/**
 * Returns an array with all recognised Code file extensions (lowercase)
 *
 * @param   {boolean}       withDot  If true, returns the extensions with dot.
 *
 * @return  {string[]}               The list of valid file extensions
 */
export function codeFileExtensions (withDot = false): string[] {
  const ext = [ 'tex', 'json', 'yaml', 'yml' ]

  return (withDot) ? ext.map(e => '.' + e) : ext
}
