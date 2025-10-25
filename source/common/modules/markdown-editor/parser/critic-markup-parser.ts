import { LRLanguage } from '@codemirror/language'
import { parseMixed } from '@lezer/common'
import { criticMarkupLanguage as critic } from 'lang-criticmarkup'
import markdownParser, { type MarkdownParserConfig } from './markdown-parser'
import { type Extension } from '@codemirror/state'

// BUG: This currently does not work as expected. It does appear to somewhat pick
// up on the correct state. However, some plugin always crashes, and we have no
// syntax highlighting, as apparently the overlay nodes from the Markdown parser
// are not properly mounted into the tree.
export function criticMarkupLanguage (config?: MarkdownParserConfig): Extension[] {
  const markdownLanguage = markdownParser(config)

  const mixedCMParser = critic.parser.configure({
    wrap: parseMixed(node => {
      return node.type.isTop ? {
        parser: markdownLanguage.language.parser,
        overlay: n => n.type.name == 'Content'
      } : null
    })
  })

  return [
    LRLanguage.define({ parser: mixedCMParser }),
    markdownLanguage.support,
  ]
}
