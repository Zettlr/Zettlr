# Footnotes Test

This file is meant as a way to test the rendering of footnotes. Footnotes are not a part of original Markdown[^1], but have since been introduced in a variety of flavours, such as Pandoc Markdown[^2], PHP Markdown Extra[^3], or RStudio's RMarkdown[^4], which is basically just Pandoc Markdown, because that's the engine RStudio is using under the hood to compile output documents.

Footnotes, in a way, are simply reference-style links[^5], which is also why they aren't yet part of the CommonMark specification[^6]. In fact, the _only_ difference between footnotes and reference style links are that footnotes are always prepended with a `^`. You can also use inline-footnotes[^such as this^], which save you some space. Nevertheless, this file's purpose is to mainly exhibit problems within footnotes per se[^7]

[^1]: See https://daringfireball.net/projects/markdown/
[^2]: See https://pandoc.org/MANUAL.html#footnotes
[^3]: See https://michelf.ca/projects/php-markdown/extra/#footnotes
[^4]: See https://bookdown.org/yihui/rmarkdown/markdown-syntax.html
[^5]: See https://spec.commonmark.org/0.29/#link-reference-definitions
[^6]: [CommonMark](https://commonmark.org/)
[^7]: One common problem of Zettlr in the past was that it did not highlight footnotes specifically, and as they are not part of the GitHub flavored Markdown (which is the underlying mode we're using to render stuff here), the GFM mode would always treat them as reference style _links_.