/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the footnote commands
 * CVM-Role:        TESTING
 * Maintainers:     Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests the footnote command functions.
 *
 * END HEADER
 */

import { strictEqual } from 'assert'
import { EditorState, Transaction } from '@codemirror/state'
import { cleanupFootnotes } from 'source/common/modules/markdown-editor/commands/footnotes'
import markdownParser from 'source/common/modules/markdown-editor/parser/markdown-parser'

const cleanupFootnotesTests = [
 // Test removing references without identifiers
  {
    content: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^2], PHP Markdown Extra[^3], or RStudio's RMarkdown[^4], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

[^1]: See https://daringfireball.net/projects/markdown/
[^2]: See https://pandoc.org/MANUAL.html#footnotes
[^3]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^4]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
[^5]: See https://spec.commonmark.org/0.29/#link-reference-definitions
[^6]: [CommonMark](https://commonmark.org/)
[^7]: One common problem of Zettlr in the past was that it did not highlight footnotes specifically, and as they are not part of the GitHub flavored Markdown (which is the underlying mode we're using to render stuff here), the GFM mode would always treat them as reference style _links_.
`,
    expected: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^2], PHP Markdown Extra[^3], or RStudio's RMarkdown[^4], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

[^1]: See https://daringfireball.net/projects/markdown/
[^2]: See https://pandoc.org/MANUAL.html#footnotes
[^3]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^4]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
`
  },
  // Test removing identifiers without references and renumbering
  {
    content: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^2], PHP Markdown Extra[^3], or RStudio's RMarkdown[^4], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

[^1]: See https://daringfireball.net/projects/markdown/
[^3]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^4]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html`,
    expected: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown, PHP Markdown Extra[^2], or RStudio's RMarkdown[^3], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

[^1]: See https://daringfireball.net/projects/markdown/
[^2]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^3]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
`
  },
  // Test moving references to the end of the document
  {
    content: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^2], PHP Markdown Extra[^3], or RStudio's RMarkdown[^4], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

Footnotes, in a way, are simply reference-style links[^5], which is also why they aren't yet part of the CommonMark specification[^6]. In fact, the _only_ difference between footnotes and reference style links are that footnotes are always prepended with a \`^\`. You can also use inline-footnotes^[such as this], which save you some space. Nevertheless, this file's purpose is to mainly exhibit problems within footnotes per se[^7]

[^1]: See https://daringfireball.net/projects/markdown/
[^2]: See https://pandoc.org/MANUAL.html#footnotes
[^3]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^4]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
[^5]: See https://spec.commonmark.org/0.29/#link-reference-definitions
[^6]: [CommonMark](https://commonmark.org/)
[^7]: One common problem of Zettlr in the past was that it did not highlight footnotes specifically, and as they are not part of the GitHub flavored Markdown (which is the underlying mode we're using to render stuff here), the GFM mode would always treat them as reference style _links_.

# Section 2

Body text below footnotes.`,
    expected: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^2], PHP Markdown Extra[^3], or RStudio's RMarkdown[^4], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

Footnotes, in a way, are simply reference-style links[^5], which is also why they aren't yet part of the CommonMark specification[^6]. In fact, the _only_ difference between footnotes and reference style links are that footnotes are always prepended with a \`^\`. You can also use inline-footnotes^[such as this], which save you some space. Nevertheless, this file's purpose is to mainly exhibit problems within footnotes per se[^7]

# Section 2

Body text below footnotes.

[^1]: See https://daringfireball.net/projects/markdown/
[^2]: See https://pandoc.org/MANUAL.html#footnotes
[^3]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^4]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
[^5]: See https://spec.commonmark.org/0.29/#link-reference-definitions
[^6]: [CommonMark](https://commonmark.org/)
[^7]: One common problem of Zettlr in the past was that it did not highlight footnotes specifically, and as they are not part of the GitHub flavored Markdown (which is the underlying mode we're using to render stuff here), the GFM mode would always treat them as reference style _links_.
`,
  },
  // Test renumbering references with the same label
  {
    content: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^1], PHP Markdown Extra[^1], or RStudio's RMarkdown[^1], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

Footnotes, in a way, are simply reference-style links[^1], which is also why they aren't yet part of the CommonMark specification[^1]. In fact, the _only_ difference between footnotes and reference style links are that footnotes are always prepended with a \`^\`. You can also use inline-footnotes^[such as this], which save you some space. Nevertheless, this file's purpose is to mainly exhibit problems within footnotes per se[^1]

[^1]: See https://daringfireball.net/projects/markdown/
[^1]: See https://pandoc.org/MANUAL.html#footnotes
[^1]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^1]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
[^1]: See https://spec.commonmark.org/0.29/#link-reference-definitions
[^1]: [CommonMark](https://commonmark.org/)
[^1]: One common problem of Zettlr in the past was that it did not highlight footnotes specifically, and as they are not part of the GitHub flavored Markdown (which is the underlying mode we're using to render stuff here), the GFM mode would always treat them as reference style _links_.
`,
    expected: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^2], PHP Markdown Extra[^3], or RStudio's RMarkdown[^4], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

Footnotes, in a way, are simply reference-style links[^5], which is also why they aren't yet part of the CommonMark specification[^6]. In fact, the _only_ difference between footnotes and reference style links are that footnotes are always prepended with a \`^\`. You can also use inline-footnotes^[such as this], which save you some space. Nevertheless, this file's purpose is to mainly exhibit problems within footnotes per se[^7]

[^1]: See https://daringfireball.net/projects/markdown/
[^2]: See https://pandoc.org/MANUAL.html#footnotes
[^3]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^4]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
[^5]: See https://spec.commonmark.org/0.29/#link-reference-definitions
[^6]: [CommonMark](https://commonmark.org/)
[^7]: One common problem of Zettlr in the past was that it did not highlight footnotes specifically, and as they are not part of the GitHub flavored Markdown (which is the underlying mode we're using to render stuff here), the GFM mode would always treat them as reference style _links_.
`,
  },
  // Test renumbering references with the same label and removing non-matching ones
  {
    content: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^2], PHP Markdown Extra[^3], or RStudio's RMarkdown[^4], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

Footnotes, in a way, are simply reference-style links[^5], which is also why they aren't yet part of the CommonMark specification[^4]. In fact, the _only_ difference between footnotes and reference style links are that footnotes are always prepended with a \`^\`. You can also use inline-footnotes^[such as this], which save you some space. Nevertheless, this file's purpose is to mainly exhibit problems within footnotes per se[^4]

[^1]: See https://daringfireball.net/projects/markdown/
[^2]: See https://pandoc.org/MANUAL.html#footnotes
[^3]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^4]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
[^5]: See https://spec.commonmark.org/0.29/#link-reference-definitions
[^4]: [CommonMark](https://commonmark.org/)
[^7]: One common problem of Zettlr in the past was that it did not highlight footnotes specifically, and as they are not part of the GitHub flavored Markdown (which is the underlying mode we're using to render stuff here), the GFM mode would always treat them as reference style _links_.
`,
    expected: `\
# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^2], PHP Markdown Extra[^3], or RStudio's RMarkdown[^4], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

Footnotes, in a way, are simply reference-style links[^5], which is also why they aren't yet part of the CommonMark specification[^6]. In fact, the _only_ difference between footnotes and reference style links are that footnotes are always prepended with a \`^\`. You can also use inline-footnotes^[such as this], which save you some space. Nevertheless, this file's purpose is to mainly exhibit problems within footnotes per se

[^1]: See https://daringfireball.net/projects/markdown/
[^2]: See https://pandoc.org/MANUAL.html#footnotes
[^3]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^4]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
[^5]: See https://spec.commonmark.org/0.29/#link-reference-definitions
[^6]: [CommonMark](https://commonmark.org/)
`,
  }
]

describe('MarkdownEditor#cleanupFootnotes()', function () {

  cleanupFootnotesTests.forEach((test, idx) => {
    it(`Cleanup Footnotes: Test ${idx + 1}`, function () {
      const { content, expected } = test

      const state = EditorState.create({
        doc: content,
        extensions: [
          markdownParser(),
        ]
      })

      let wasDispatched = false

      const dispatch = (tx: Transaction) => {
        wasDispatched = true

        const newDoc = tx.newDoc.toString()
        strictEqual(newDoc, expected, "Footnotes were cleaned up incorrectly.")
      }

      cleanupFootnotes({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })
})
