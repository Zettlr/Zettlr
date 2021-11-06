/**
 * BEGIN HEADER
 *
 * Contains:        Utility class
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains functionality to generate regular
 *                  expressions to be used across the application for
 *                  consistent behaviour.
 *
 * END HEADER
 */

module.exports = {

  /**
   * Returns a regular expression that matches block Maths.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getBlockMathRE': function () {
    return RegExp(
      /^(\s*\$\$)\s*$/.source
    )
  },

  /**
   * Returns a regular expression that matches MarkDown Blocks.
   *
   * First capturing group: preceding whitespace. Second cap.: line contents
   * Non-capturing group in the middle: all block elements.
   * Non-capturing group afterwards: catches all whitespace
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getBlockRE': function () {
    return RegExp(
      /^(\s*?)(?:#{1,6}|>|\*|\+|-|\d{1,5}\.)(?:\s+)(.*)$/.source
    )
  },

  /**
   * Returns a regular expression that matches MarkDown inline code.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getCodeRE': function () {
    return RegExp(
      /`.*?`/.source,
      'i')
  },

  /**
   * Returns a regular expression that matches MarkDown Code Blocks.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getCodeBlockRE': function (multiline = false) {
    if (!multiline) {
      // The user only wants to match a single line
      return RegExp(
        /^\s{0,3}(`{3,}|~{3,})/.source
      )
    } else {
      // `multiline` indicates the user has a complete Markdown document.
      // This RegExp matches backtick and tilde code blocks, and indented code
      // blocks.
      return RegExp(
        /^`{3,}.+?^`{3,}|^[ \t]{4,}.+?$|^~{3,}.+?^~{3,}/gms.source,
        'gms'
      )
    }
  },

  /**
   * Returns a regular expression that matches footnotes for project export.
   *
   * @param   {boolean}  multiline  Whether to match multiline
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getFnExportRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    return RegExp(
      /\[\^([\w]+?)\]/.source,
      // Necessary flags + optional multiline flag
      'g' + flag)
  },

  /**
   * Returns a regular expression that matches MarkDown footnote references.
   *
   * This matches footnote links in the style of [^<text>] but only if it includes
   * numbers, letters (without umlauts) and _ as well as - chars.
   * The second or third capturing group contains the identifier. The other
   * will then be `undefined`
   * This also matches strings where ] is the end of a string, but
   * still ensures, ":" is NOT behind the closing bracket.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getFnRE': function () {
    return RegExp(
      /(\[\^([\da-zA-Z_-]+)\][^:]|\[\^([\da-zA-Z_-]+)\]$)/.source,
      'g')
  },

  /**
   * Returns a regular expression that matches MarkDown footnote references.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getFnReferenceRE': function () {
    return RegExp(
      /^\[\^.+\]:\s/.source
    )
  },

  /**
   * Returns a regular expression that matches MarkDown footnote references.
   *
   * This matches footnote references in the style of [^<text>]: <reference text>
   * This matches the same type of footnotes as the fnRE and includes two
   * capturing groups: match[1] holds the identifier, match[2] the reference text.
   * group 1: footnote number; group 2: text
   *
   * @param   {boolean}  multiline  Whether to match multiline
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getFnRefRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    return RegExp(
      /^\[\^([\da-zA-Z_-]+)\]: (.+)/.source,
      'g' + flag)
  },

  /**
   * Returns a regular expression that matches MarkDown footnote references.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getFootnoteRefRE': function () {
    return RegExp(
      /\[\^[^\]]+\]/.source,
      'i')
  },

  /**
   * Returns a regular expression that matches MarkDown Headings.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getHeadRE': function () {
    return RegExp(
      /^(#{1,6}) (.*)/.source,
      'g')
  },

  /**
   * Returns a regular expression that matches MarkDown Headings.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getHeadingRE': function () {
    return RegExp(
      /(#+)\s+/.source
    )
  },

  /**
   * Returns a regular expression that matches Zettlr's MarkDown highlighting extension.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getHighlightRE': function () {
    return RegExp(
      /::.+?::|==.+?==/.source
    )
  },

  /**
   * Returns a regular expression that matches file IDs as in the settings
   *
   * @param   {boolean}  multiline  Whether to match multiline
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getIDRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    let idRegExpString = global.config.get('zkn.idRE')
    // Make sure the ID definitely has at least one
    // capturing group to not produce errors.
    if (!(/\(.+?\)/.test(idRegExpString))) {
      idRegExpString = `(${idRegExpString})`
    }

    return RegExp(
      idRegExpString,
      'g' + flag
    )
  },

  /**
   * Returns a regular expression that matches inline frames.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getIframeRE': function () {
    return RegExp(
      /^<iframe.*?src="(.+?)".*?>.*?<\/iframe>$/.source,
      'i')
  },

  /**
   * Returns a regular expression that can detect Markdown images globally.
   * Matches the following groups:
   *
   * 1. The ALT-text in square brackets
   * 2. The full contents of the round brackets
   * 3. Only the title-text in quotes within group 2
   * 4. Pandoc-specific attributes in curly braces
   *
   * @param   {boolean}  multiline  Whether or not the regular expression should be multiline
   *
   * @return  {RegExp}           The wanted regular expression.
   */
  'getImageRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    return RegExp(
      /(?<=\s|^)!\[(.*?)\]\((.+?(?:(?<= )"(.+)")?)\)({[^{]+})?/.source,
      // Necessary flags + optional multiline flag
      'g' + flag)
  },

  /**
   * Returns a regular expression that matches image file names
   *
   * @param   {boolean}  multiline  Whether the expression should match multilines
   *
   * @return  {RegExp}             The compiled expression
   */
  'getImageFileRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    return RegExp(
      /(\.jpg|\.jpeg|\.png|\.gif|\.svg|\.tiff|\.tif)$/.source,
      // Necessary flags + optional multiline flag
      'i' + flag
    )
  },

  /**
   * Returns a regular expression that matches inline Maths.
   *
   * @param   {boolean} global      whether the expression should be global
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getInlineMathRE': function (global = false) {
    let flag = (global) ? 'g' : ''
    return RegExp(
      /^(?:\${1,2}[^\s\\]\${1,2}(?!\d)|\${1,2}[^\s].*?[^\s\\]\${1,2}(?!\d))/.source,
      flag)
  },

  /**
   * Returns a regular expression that matches inline Maths.
   *
   * Used to render inline math.
   *
   * Matches all inlines according to the Pandoc documentation
   * on its tex_math_dollars-extension.
   * More information: https://pandoc.org/MANUAL.html#math
   * First alternative is only for single-character-equations
   * such as $x$. All others are captured by the second alternative.
   *
   * @param   {boolean} global      whether the expression should be global
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getInlineMathRenderRE': function (global = false) {
    let flag = (global) ? 'g' : ''
    return RegExp(
      /(?<![\\$])(?<dollar>\${1,2})(?![\s$])(?<eq>.+?)(?<![\s\\])\k<dollar>(?!\d)/.source,
      flag)
  },
  /**
   * Returns a regular expression that matches MarkDown links.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getLinkRE': function () {
    return RegExp(
      /^.+\.[a-z0-9]+/.source,
      'i')
  },

  /**
   * Returns a regular expression that matches MarkDown lists.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getListRE': function () {
    return RegExp(
      /^(\s*)([*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]\s))(\s*)/.source
    )
  },

  /**
   * Returns a regular expression that matches empty MarkDown lists.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getListEmptyRE': function () {
    return RegExp(
      /^(\s*)([*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/.source
    )
  },

  /**
   * Returns a regular expression that matches Markdown Ordered lists.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getListOrderedRE': function () {
    return RegExp(
      /^(\s*)((\d+)([.)]))(\s*)/.source
    )
  },

  /**
   * Returns a regular expression that matches Markdown task lists.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getListTaskListRE': function () {
    return RegExp(
      /^(\s*)(- \[[x ]\])(\s*)/.source
    )
  },

  /**
   * Returns a regular expression that matches ordered lists, unordered lists,
   * task lists, and blockquotes. Captures the following:
   *
   * 1. The amount of whitespace before the list token
   * 2. The list token itself
   * 3. In case of an ordered list the list number
   * 4. The amount of following whitespace (after the list token)
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getListTokenRE': function () {
    return RegExp(
      /^(\s*)(>[> ]*|[*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)/.source
    )
  },

  /**
   * Returns a regular expression that matches unordered Markdown lists.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getListUnorderedRE': function () {
    return RegExp(
      /[*+-]\s/.source
    )
  },

  /**
   * Returns a regular expression that matches unordered Markdown lists.
   *
   * Used in CodeMirror MarkDown shortcuts.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getListUnorderedCMRE': function () {
    return RegExp(
      /^(\s*)([*+-])\s/.source
    )
  },

  /**
   * Returns a regular expression that matches Markdown files.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getMarkDownFileRE': function () {
    return RegExp(
      /.+\.(?:md|markdown|txt|rmd)$/.source,
      'i')
  },

  /**
   * Returns a regular expression that matches URL protocols (e.g. http://)
   *
   * @param   {boolean}  multiline  Whether or not the expression should be multiline
   *
   * @return  {RegExp}           The wanted regular expression
   */
  'getProtocolRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    return RegExp(
      /^([a-z]{1,10}):\/\//,
      'i' + flag
    )
  },

  /**
   * Returns a regular expression that matches Markdown Tables.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getTableRE': function () {
    return RegExp(
      /^\|.+\|$/.source,
      'i')
  },

  /**
   * Returns a regular expression that matches Markdown table headings.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getTableHeadingRE': function () {
    return RegExp(
      /(^[- ]+$)|(^[- +:]+$)|(^[- |:+]+$)/.source
    )
  },

  /**
   * Returns a regular expression that matches tasks.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getTaskRE': function () {
    return RegExp(
      /^(\s*)([-+*]) \[( |x)\] /.source,
      'g')
  },

  /**
   * Returns a regular expression that matches URLs.
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getUrlRE': function () {
    return RegExp(
      /^\[([^\]]+)\]\((.+?)\)|(((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()[\]{};:'".,<>?«»“”‘’])))|([a-z0-9.\-_+]+?@[a-z0-9.\-_+]+\.[a-z]{2,7})$/.source,
      'i')
  },

  /**
   * Returns a regular expression that matches:
   *
   * 1. Underscore strong
   * 2. Underscore emphasis
   * 3. Asterisk strong
   * 4. Asterisk emphasis
   * 5. Heading levels 1-6 (mark)
   * 6. Heading levels 1-6 (content)
   * 7. Blockquotes
   * 8. Inline code
   *
   * @return  {RegExp}              The compiled Regular Expression
   */
  'getWysiwygRE': function () {
    return RegExp(
      /__(.+?)__|_(.+?)_|\*\*(.+?)\*\*|\*(.+?)\*|^(#{1,6}) (.+?)$|^(?:\s*)> (.+)$|`(.+?)`/.source,
      'gi')
  },

  /**
   * Returns a regular expression that matches Zettelkasten IDs.
   *
   * @param   {boolean}  [global=false]  Whether this RegExp should have the global flag.
   * @return  {RegExp}                   The compiled Regular Expression
   */
  'getZknTagRE': function (global = false) {
    return RegExp(
      /(?<=^|\s|[({[])#(#?[^\s,.:;…!?"'`»«“”‘’—–@$%&*#^+~÷\\/|<=>[\](){}]+#?)/.source,
      (global) ? 'gi' : 'i')
  }

}
