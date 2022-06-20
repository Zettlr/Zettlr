/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror Markdown mode
 * CVM-Role:        CodeMirror Mode
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the central Markdown mode used by Zettlr. It wraps
 *                  CodeMirror's Markdown and YAML modes (for the frontmatter).
 *
 * END HEADER
 */

import { getZknTagRE, getHeadingRE, getHighlightRE, getTableRE, getInlineMathRE, getFnReferenceRE } from '@common/regular-expressions'
import cssSafeString from '@common/util/css-safe-string'
// @ts-expect-error
import { defineMode, getMode, startState as _startState, copyState as _copyState, defineMIME, Mode } from 'codemirror'

const zknTagRE = getZknTagRE()
const headingRE = getHeadingRE()
const highlightRE = getHighlightRE()
const tableRE = getTableRE()
const fnReferenceRE = getFnReferenceRE()

const inlineMathRE = getInlineMathRE()
const inlineMathStartRE = /^\${1,2}/i
const inlineMathEndRE = /^(?<!\\)\${1,2}(?!\d)/i

interface MarkdownModeState {
  startOfFile: boolean
  inFrontmatter: boolean
  inEquation: boolean
  inZknLink: boolean // Whether or not we're currently within a zkn Link
  hasJustEscaped: boolean // Whether the previous iteration had an escape char
  yamlState: ReturnType<typeof _startState>
  mdState: ReturnType<typeof _startState>
  mathState: ReturnType<typeof _startState>
}

interface ModeWithInner<T> extends Mode<T> {
  innerMode?: (state: T) => any
  fold: string
}

/**
  * This defines the Markdown Zettelkasten system mode, which highlights IDs
  * and tags for easy use of linking and searching for files.
  * THIS MODE WILL AUTOMATICALLY LOAD THE SPELLCHECKER MODE WHICH WILL THEN
  * LOAD THE GFM MODE AS THE BACKING MODE.
  * @param  {Object} config       The config with which the mode was loaded
  * @param  {Object} parserConfig The previous config object
  * @return {OverlayMode}              The loaded overlay mode.
  */
defineMode('markdown-zkn', function (config, parserConfig) {
  const yamlMode = getMode(config, 'yaml')
  const mdMode = getMode(config, { name: 'gfm', highlightFormatting: true, gitHubSpice: false })
  const mathMode = getMode(config, { name: 'stex', inMathMode: true })

  const markdownZkn: ModeWithInner<MarkdownModeState> = {
    startState: function () {
      return {
        startOfFile: true,
        inFrontmatter: false,
        inEquation: false,
        inZknLink: false, // Whether or not we're currently within a zkn Link
        hasJustEscaped: false, // Whether the previous iteration had an escape char
        yamlState: _startState(yamlMode) as Mode<any>,
        mdState: _startState(mdMode) as Mode<any>,
        mathState: _startState(mathMode) as Mode<any>
      }
    },
    copyState: function (state) {
      return {
        startOfFile: state.startOfFile,
        inFrontmatter: state.inFrontmatter,
        inEquation: state.inEquation,
        inZknLink: state.inZknLink,
        hasJustEscaped: state.hasJustEscaped,
        // Make sure to correctly copy the YAML state
        yamlState: _copyState(yamlMode, state.yamlState),
        mdState: _copyState(mdMode, state.mdState),
        mathState: _copyState(mathMode, state.mathState)
      }
    },
    /**
     * Defines the token function
     *
     * @param   {CodeMirror.StringStream}  stream  The stream
     * @param   {any}                      state   The state
     *
     * @return  {string|null|undefined}            Returns a token class or null
     */
    token: function (stream, state) {
      // First: YAML highlighting. This block will only execute at the beginning
      // of a file. NOTE the `stream.eol()` check at the end of the conditions.
      // If the RE for a frontmatter did match, we have to additionally check
      // that three dots or dashes are indeed the *only* contents on the line
      // for it in order to be recognized as a valid frontmatter. More dashes or
      // dots are not allowed as per the Pandoc documentation.
      if (state.startOfFile && stream.sol() && stream.match(/---/) !== null && stream.eol()) {
        // Assume a frontmatter
        state.startOfFile = false
        state.inFrontmatter = true
        return 'hr yaml-frontmatter-start'
      } else if (!state.startOfFile && state.inFrontmatter) {
        // Still in frontMatter?
        if (stream.sol() && stream.match(/---|\.\.\./) !== null && stream.eol()) {
          state.inFrontmatter = false
          return 'hr yaml-frontmatter-end'
        }

        // Continue to parse in YAML mode
        return (yamlMode.token(stream, state.yamlState) as string) + ' fenced-code'
      } else if (state.startOfFile) {
        // If no frontmatter was found, set the state to a desirable state
        state.startOfFile = false
      }

      // Now let's check for footnotes. Other than reference style links these
      // require a different formatting, which we'll implement here. NOTE: We
      // must perform the check before below's check if we are in a codeblock,
      // because multi-paragraph footnotes will set those
      if (stream.sol() && stream.match(fnReferenceRE) !== null) {
        return 'footnote-formatting'
      }

      // Directly afterwards check for inline code or comments, so
      // that stuff such as zkn-links are not highlighted:
      if ((state.mdState as any).overlay.code || (state.mdState as any).overlay.codeBlock || (state.mdState as any).baseCur === 'comment') {
        return mdMode.token(stream, state.mdState)
      }

      // Next, it could be that we're currently inside an inline math equation
      if (state.inEquation && stream.match(inlineMathEndRE) === null) {
        return (mathMode.token(stream, state.mathState) as string) + ' fenced-code'
      } else if (state.inEquation) {
        state.inEquation = false
        return 'formatting-code-block'
      }

      // In everything that follows, escpaing things is allowed and possible.
      // By immediately returning and checking right at the beginning of the
      // method, we can prevent other modes from triggering.
      if (stream.match('\\')) {
        if (!stream.eol()) {
          // Only set the escaped state if the backslash
          // did not occur at the end of a line
          state.hasJustEscaped = true
        }
        return 'escape-char'
      }

      // Then check if we have just escaped, and, if so, return an empty class
      // which will also (intentionally) break any rendering that the next()
      // char would have initiated.
      if (state.hasJustEscaped) {
        state.hasJustEscaped = false // Needs to be reset always
        if (!stream.eol()) {
          stream.next()
          return null // No highlighting for escaped characters
        } // Else: It might be sol(), but don't escape
      }

      // Are we in a link?
      if (state.inZknLink) {
        if (stream.match((config as any).zettlr.zettelkasten.linkEnd)) {
          state.inZknLink = false
          return 'zkn-link-formatting'
        }

        while (!stream.eol() && !stream.match((config as any).zettlr.zettelkasten.linkEnd, false)) {
          stream.next()
        }
        return 'zkn-link'
      }

      // From here on there are only not-so-special things. Using the
      // hasJustEscaped-state, we can keep most things very simple.
      // None of the following has to explicitly check for backspaces.

      // Now let's check for inline equations. Since the start/end REs are a tad
      // stupid, we make sure that whatever follows is definitely a valid RE.
      // Then, we can safely match the beginning chars and give over to the
      // mathMode.
      if (stream.match(inlineMathRE, false) !== null) {
        stream.match(inlineMathStartRE)
        state.inEquation = true
        return 'formatting-code-block'
      }

      // Implement highlighting
      if (stream.match(highlightRE) !== null) {
        return 'highlight'
      }

      // Now dig deeper for more tokens

      // This mode should also handle tables, b/c they are rather simple to detect.
      if (stream.sol() && stream.match(tableRE, false) !== null) {
        // Got a table line -> skip to end and convert to table
        stream.skipToEnd()
        return 'table'
      }

      // Next on are tags in the form of #hashtag. We have to check for
      // headings first, as the tagRE will also match these, but they are not
      // real tags, so we need to hand them over to the mdMode.
      if (stream.match(headingRE, false) !== null) {
        return mdMode.token(stream, state.mdState)
      } else if (stream.match(zknTagRE, false) !== null) {
        const match = stream.match(zknTagRE)
        // Retrieve a CSS class name-safe version of the tag text
        const tagText = cssSafeString(match[1])
        return `zkn-tag zkn-tag-${tagText}`
      }

      // Now check for a zknLink
      if (stream.match((config as any).zettlr.zettelkasten.linkStart)) {
        state.inZknLink = true
        return 'zkn-link-formatting'
      }

      // IDs (The upside of this is that IDs _inside_ links will
      // be treated as _links_ and not as "THE" ID of the file as long
      // as the definition of zkn-links is above this matcher.)

      let zknIDRE = new RegExp((config as any).zettlr.zettelkasten.idRE)
      if (stream.match(zknIDRE) !== null) {
        return 'zkn-id'
      }

      // If nothing has triggered until here, let the markdown
      // mode take over as it is responsible for everything else.
      return mdMode.token(stream, state.mdState)
    },
    innerMode: function (state) {
      // We need to return the correct mode so that
      // other plugins such as AutoCorrect don't
      // trigger in YAML mode as these inspect the
      // mode object.
      if (state.inFrontmatter) {
        return { mode: yamlMode, state: state.yamlState }
      } else if (state.inEquation) {
        return { mode: mathMode, state: state.mathState }
      } else {
        return { mode: markdownZkn, state: state.mdState }
      }
    },
    blankLine: function (state) {
      state.inZknLink = false
      state.hasJustEscaped = false
      state.inZknLink = false
      state.inEquation = false
      // The underlying mode needs
      // to be aware of blank lines
      return mdMode.blankLine?.(state.mdState)
    },
    // Since in innerMode() we are returning the ZKN mode instead of the
    // Markdown mode when we are not inside the frontmatter, the foldcode
    // addon will have no clue how to fold the Markdown code. By adding this
    // property to the mode, we tell the foldcode addon that it can use the
    // markdown foldcode helper for that.
    fold: 'markdown'
  }

  return markdownZkn
})

defineMIME('text/x-zkn', 'markdown-zkn')
