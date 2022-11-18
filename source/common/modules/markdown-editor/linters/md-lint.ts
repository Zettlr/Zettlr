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
  const diagnostics: Diagnostic[] = []

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
    // So, the positions the messages give can come in several forms:
    // 1. No position -> Skip message
    // 2. Only start -> Point message
    // 3. No offset prop -> Calculate with line
    if (message.position === null) {
      console.warn(`Skipping linter warning "${message.message}": No position`)
      continue
    }

    const { start, end } = message.position

    if (start.line === null || start.column === null) {
      // We require at least a start. NOTE: Rule `final-newline` does not
      // provide a position. We can either ignore that for now, or find a fix
      // before Zettlr v3, but I'd argue it's relatively unproblematic for now.
      console.warn(`Skipping linter warning "${message.message}": No position`)
      continue
    }

    // As the offset can be calculated from the line:column properties, we just
    // default to always calculating that (regardless of presence of an offset)
    // in order to keep the logic slim.
    const from = view.state.doc.line(start.line).from + start.column - 1
    const to = (end.line === null || end.column === null)
      ? from
      : view.state.doc.line(end.line).from + end.column - 1

    diagnostics.push({
      from,
      to,
      severity: (message.fatal === true) ? 'error' : 'warning',
      message: message.message,
      // message.source is preferred, but can be undefined...?
      source: (message.ruleId === null) ? 'remark-lint' : `remark-lint (${message.ruleId})`
    })
  }

  return diagnostics
})
