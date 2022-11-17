/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Markdown Linter
 * CVM-Role:        Linter
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This linter utilizes the re:mark package to highlight style
 *                  issues with Markdown documents.
 *
 * END HEADER
 */

import { linter, Diagnostic } from '@codemirror/lint'
import { remark } from 'remark'
import remarkPresentLintRecommended from 'remark-preset-lint-recommended'
import remarkPresetLintConsistent from 'remark-preset-lint-consistent'
import remarkLintListItemIndent from 'remark-lint-list-item-indent'
import remarkFrontmatter from 'remark-frontmatter'

// Individual rules we have to turn off/reconfigure
import remarkLintNoConsecutiveBlankLines from 'remark-lint-no-consecutive-blank-lines'
import remarkLintNoUndefinedReferences from 'remark-lint-no-undefined-references'

export const mdLint = linter(async view => {
  // We're using a set since somehow the remark linter sometimes happily throws
  // the same warnings
  const diagnostics: Set<Diagnostic> = new Set()

  const result = await remark()
    .use(remarkFrontmatter, [
      // Either Pandoc-style frontmatters ...
      { type: 'yaml', fence: { open: '---', close: '...' } },
      // ... or Jekyll/Static site generators-style frontmatters.
      { type: 'yaml', fence: { open: '---', close: '---' } }
    ])
    // Some generic rules
    .use(remarkPresetLintConsistent)
    .use(remarkPresentLintRecommended)
    // Now to specific rules
    .use(remarkLintListItemIndent, 'space')
    .use(remarkLintNoUndefinedReferences, false) // Turn off this rule to enable ellipses such as: […]
    .use(remarkLintNoConsecutiveBlankLines)
    .process(view.state.doc.toString())

  // Now we may or may not have messages that we can basically almost directly
  // convert into diagnostics
  for (const message of result.messages) {
    let from = 0
    let to = 0
    if (message.position?.start.offset !== undefined) {
      // If we have a start position, use that one (plus optionally an end)
      // instead of the default beginning of file.
      from = message.position.start.offset
      to = message.position.end.offset ?? from // to === from for points
    }

    diagnostics.add({
      from,
      to,
      severity: (message.fatal === true) ? 'error' : 'warning',
      message: message.message,
      source: 'remark-lint' // message.source is preferred, but can be undefined...?
    })
  }

  return [...diagnostics]
})
