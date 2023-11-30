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

import { linter, type Diagnostic } from '@codemirror/lint'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'
import { configField } from '../util/configuration'

// Rules we use
import remarkLintBlockquoteIndentation from 'remark-lint-blockquote-indentation'
import remarkLintCheckboxCharacterStyle from 'remark-lint-checkbox-character-style'
import remarkLintCodeBlockStyle from 'remark-lint-code-block-style'
import remarkLintEmphasisMarker from 'remark-lint-emphasis-marker'
import remarkLintFencedCodeMarker from 'remark-lint-fenced-code-marker'
import remarkLintHardBreakSpaces from 'remark-lint-hard-break-spaces'
import remarkLintHeadingStyle from 'remark-lint-heading-style'
import remarkLintLinkTitleStyle from 'remark-lint-link-title-style'
import remarkLintListItemBulletIndent from 'remark-lint-list-item-bullet-indent'
import remarkLintListItemIndent from 'remark-lint-list-item-indent'
import remarkLintNoBlockquoteWithoutMarker from 'remark-lint-no-blockquote-without-marker'
import remarkLintNoConsecutiveBlankLines from 'remark-lint-no-consecutive-blank-lines'
import remarkLintNoDuplicateDefinitions from 'remark-lint-no-duplicate-definitions'
import remarkLintNoHeadingContentIndent from 'remark-lint-no-heading-content-indent'
import remarkLintNoInlinePadding from 'remark-lint-no-inline-padding'
import remarkLintNoShortcutReferenceImage from 'remark-lint-no-shortcut-reference-image'
import remarkLintNoShortcutReferenceLink from 'remark-lint-no-shortcut-reference-link'
import remarkLintNoUnusedDefinitions from 'remark-lint-no-unused-definitions'
import remarkLintOrderedListMarkerStyle from 'remark-lint-ordered-list-marker-style'
import remarkLintRuleStyle from 'remark-lint-rule-style'
import remarkLintStrongMarker from 'remark-lint-strong-marker'
import remarkLintTableCellPadding from 'remark-lint-table-cell-padding'
import remarkLint from 'remark-lint'

export const mdLint = linter(async view => {
  // We're using a set since somehow the remark linter sometimes happily throws
  // the same warnings
  const diagnostics: Diagnostic[] = []

  const config = view.state.field(configField, false)
  const emphasisMarker = config?.italicFormatting
  const boldMarker = config?.boldFormatting
  let boldSetting: 'consistent'|'*'|'_' = 'consistent'
  if (boldMarker !== undefined && boldMarker === '**') {
    boldSetting = '*'
  } else if (boldMarker !== undefined) {
    boldSetting = '_'
  }

  const result = await remark()
    .use(remarkFrontmatter, [
      // Either Pandoc-style frontmatters ...
      { type: 'yaml', fence: { open: '---', close: '...' } },
      // ... or Jekyll/Static site generators-style frontmatters.
      { type: 'yaml', fence: { open: '---', close: '---' } }
    ])
    .use(remarkLint)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-blockquote-indentation
    .use(remarkLintBlockquoteIndentation, 2)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-checkbox-character-style
    .use(remarkLintCheckboxCharacterStyle, { checked: 'consistent', unchecked: ' ' })
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-code-block-style
    .use(remarkLintCodeBlockStyle, 'consistent')
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-emphasis-marker
    .use(remarkLintEmphasisMarker, emphasisMarker ?? 'consistent')
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-fenced-code-marker
    .use(remarkLintFencedCodeMarker, 'consistent')
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-heading-style
    .use(remarkLintHeadingStyle, 'consistent')
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-link-title-style
    .use(remarkLintLinkTitleStyle, '"')
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-ordered-list-marker-style
    .use(remarkLintOrderedListMarkerStyle, '.')
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-rule-style
    .use(remarkLintRuleStyle, 'consistent')
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-strong-marker
    .use(remarkLintStrongMarker, boldSetting)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-table-cell-padding
    .use(remarkLintTableCellPadding, 'consistent')
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-list-item-bullet-indent
    .use(remarkLintListItemBulletIndent)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-list-item-indent
    .use(remarkLintListItemIndent, 'space')
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-no-blockquote-without-marker
    .use(remarkLintNoBlockquoteWithoutMarker)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-hard-break-spaces
    .use(remarkLintHardBreakSpaces)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-no-duplicate-definitions
    .use(remarkLintNoDuplicateDefinitions)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-no-heading-content-indent
    .use(remarkLintNoHeadingContentIndent)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-no-inline-padding
    .use(remarkLintNoInlinePadding)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-no-shortcut-reference-image
    .use(remarkLintNoShortcutReferenceImage)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-no-shortcut-reference-link
    .use(remarkLintNoShortcutReferenceLink)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-no-unused-definitions
    .use(remarkLintNoUnusedDefinitions)
    // https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-no-consecutive-blank-lines
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
