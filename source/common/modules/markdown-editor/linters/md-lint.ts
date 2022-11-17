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
import remarkLintNoConsecutiveBlankLines from 'remark-lint-no-consecutive-blank-lines'

export const mdLint = linter(async view => {
  const diagnostics: Diagnostic[] = []

  const result = await remark()
    // Some generic rules
    .use(remarkPresetLintConsistent)
    .use(remarkPresentLintRecommended)
    // Now to specific rules
    .use(remarkLintListItemIndent, 'space')
    .use(remarkLintNoConsecutiveBlankLines)
    .process(view.state.doc.toString())

  // Now we may or may not have messages that we can basically almost directly
  // convert into diagnostics
  for (const message of result.messages) {
    if (message.position === null || message.position.start.offset === undefined) {
      console.warn(`Received linter warning "${message.message}" from remark, but no position was provided`, message)
      continue
    }

    // Some messages are point-only
    const from = message.position.start.offset
    const to = message.position.end.offset ?? from

    const dia: Diagnostic = {
      from,
      to,
      severity: (message.fatal === true) ? 'error' : 'warning',
      message: message.message,
      source: message.source ?? 'remark-lint'
    }

    diagnostics.push(dia)
  }

  return diagnostics
})
