/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        YAML Linter
 * CVM-Role:        Linter
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This linter utilizes the YAML library's ability to collect
 *                  every error that it encounters while parsing a document to
 *                  lint, e.g., the defaults files within Zettlr.
 *
 * END HEADER
 */

import { linter, type Diagnostic } from '@codemirror/lint'
import YAML from 'yaml'

/**
 * Include this linter in a YAML mode configuration to provide diagnostics
 * indicating YAML syntax errors within the document.
 *
 * NOTE: If you need to lint only a YAML frontmatter, not an entire file,
 * include the yamlFrontmatterLint instead!
 *
 * @var {Extension}
 */
export const yamlLint = linter(async view => {
  const diagnostics: Diagnostic[] = []

  const content = view.state.sliceDoc()

  try {
    const document = YAML.parseDocument(content)
    for (const error of document.errors) {
      diagnostics.push({
        from: error.pos[0],
        to: error.pos[1],
        severity: 'error',
        source: `yaml-lint(${error.code})`,
        message: error.message,
        actions: []
      })
    }
    return diagnostics
  } catch (err: any) {
    console.error('Could not lint YAML: Linter threw an error', err)
  }

  return diagnostics
})
