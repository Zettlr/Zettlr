/* global define CodeMirror */
// This plugin renders markdown inline links

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  const makeAbsoluteURL = require('../../../../common/util/make-absolute-url')
  const openMarkdownLink = require('../../../util/open-markdown-link')

  // This regular expression matches three different kinds of URLs:
  // 1. Linked images in the format [![Alt text](image/path.png)](www.link-target.tld)
  // 2. Markdown URLs in the format [Caption](www.link-target.tld)
  // 3. Standalone links, either beginning with http(s):// or www.
  // 4. Email addresses.
  // var linkRE = /\[([^\]]+?)\]\(([^)]+?)\)|(https?:\/\/\S+|www\.\S+)|([a-z0-9.\-_+]+?@[a-z0-9.\-_+]+\.[a-z]{2,7})/gi
  // ATTENTION: The middle part is taken from the gfm mode so that the rendered
  // links are the same as those that the gfm mode detects.
  var linkRE = /\[!\[([^[]*)\]\((.+)\)\]\((.+)\)|\[([^\]]+)\]\((.+?)\)|(((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()[\]{};:'".,<>?«»“”‘’])))|([a-z0-9.\-_+]+?@[a-z0-9.\-_+]+\.[a-z]{2,7})/gi

  CodeMirror.commands.markdownRenderLinks = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advance it.
      linkRE.lastIndex = 0

      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if (!linkRE.test(line)) {
        continue
      }

      linkRE.lastIndex = 0 // Necessary because of global flag in RegExp

      // Run through all links on this line
      while ((match = linkRE.exec(line)) != null) {
        if ((match.index > 0) && (line[match.index - 1] === '!')) {
          continue
        }
        // What groups can we expect here?
        // Group 1: Image caption of a linked image
        // Group 2: Image link of a linked image
        // Group 3: Link target of a linked image
        // Group 4: Caption of a regular link
        // Group 5: Link target of a regular link
        // Group 6 & 7: Link target of a standalone link
        // Group 8: Email address
        let linkImageCaption = match[1] || ''
        let linkImagePath = match[2] || ''
        let linkImageTarget = match[3] || ''
        let regularLinkCaption = match[4] || ''
        let regularLinkTarget = match[5] || ''
        let standaloneLinkTarget = match[6] || ''
        let email = match[8] || ''

        let isLinkedImage = linkImagePath !== '' && linkImageTarget !== ''
        let isMdLink = regularLinkTarget !== ''
        let isStandaloneLink = standaloneLinkTarget !== ''
        let isEmail = email !== ''

        // Now get the precise beginning of the match and its end
        let curFrom = { 'line': i, 'ch': match.index }
        let curTo = { 'line': i, 'ch': match.index + match[0].length }

        // Now the age-old problem of parenthesis-detection. The regular expression
        // will not match all parenthesis, if a link contains these, so what we need
        // is we have to go through the URL, and, if it contains opening parentheses
        // we need a matching pair of these, so we'll have to go through it one by one.
        let openingParentheses = 0
        let closingParentheses = 0
        if (isMdLink) { // We are *not* repeating this madness for linked images.
          for (let i = 0; i < regularLinkTarget.length; i++) {
            if (regularLinkTarget.charAt(i) === '(') openingParentheses++
            if (regularLinkTarget.charAt(i) === ')') closingParentheses++
          }

          if (openingParentheses > closingParentheses) {
            // If we're here we most certainly have a non-closed parenthesis in a link
            // The assumption is that a link always contains matching pairs. So a link
            // like www.domain.tld/link(likethis will not work.
            let leftOvers = openingParentheses - closingParentheses
            while (curTo.ch < line.length) {
              let currentChar = line.charAt(curTo.ch)
              regularLinkTarget += currentChar
              curTo.ch++
              if (currentChar === ')') leftOvers--
              if (leftOvers === 0) break
            }

            // If we were unable to fully resolve all parentheses, abort rendering.
            if (leftOvers > 0) continue
          }
        }

        let cur = cm.getCursor('from')
        if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch + 1) {
          // Cursor is in selection: Do not render. Also include the adjacent
          // character, because otherwise impartial links will also be detected
          // and rendered before the user has finished typing them.
          continue
        }

        // We can only have one marker at any given position at any given time
        if (cm.findMarks(curFrom, curTo).length > 0) continue

        // Do not render if it's inside a comment (in this case the mode will be
        // markdown, but comments shouldn't be included in rendering)
        // Final check to avoid it for as long as possible, as getTokenAt takes
        // considerable time.
        let tokenTypeBegin = cm.getTokenTypeAt(curFrom)
        let tokenTypeEnd = cm.getTokenTypeAt(curTo)
        if ((tokenTypeBegin && tokenTypeBegin.includes('comment')) ||
        (tokenTypeEnd && tokenTypeEnd.includes('comment'))) {
          continue
        }

        let a = document.createElement('a')
        let renderedLinkTarget = regularLinkTarget
        a.className = 'cma' // CodeMirrorAnchors
        if (isLinkedImage) {
          let img = document.createElement('img')
          renderedLinkTarget = linkImageTarget
          img.title = `${linkImageCaption} (${linkImageTarget})`
          img.src = makeAbsoluteURL(cm.getOption('zettlr').markdownImageBasePath, linkImagePath)
          img.style.cursor = 'pointer' // Nicer cursor
          // Copied over from the other plugin
          // Retrieve the size constraints
          const maxPreviewWidth = cm.getOption('zettlr').imagePreviewWidth
          const maxPreviewHeight = cm.getOption('zettlr').imagePreviewHeight
          let width = (maxPreviewWidth) ? maxPreviewWidth + '%' : '100%'
          let height = (maxPreviewHeight && maxPreviewHeight < 100) ? maxPreviewHeight + 'vh' : ''
          img.style.maxWidth = width
          img.style.maxHeight = height
          a.appendChild(img)
        } else if (isStandaloneLink) {
          // In case of a standalone link, all is the same
          a.innerHTML = standaloneLinkTarget
          renderedLinkTarget = standaloneLinkTarget

          // Make sure the link is not preceeded by ]( and not followed by )
          if (curFrom.ch > 3) {
            let prefix = line.substr(curFrom.ch - 2, 2)
            let suffix = line.substr(curTo.ch, 1)
            if (prefix === '](' && suffix === ')') continue // Part of a full markdown link
          }
        } else if (isEmail) {
          // In case of an email, the same except the URL (which gets
          // an added mailto protocol handler).
          a.innerHTML = email
          renderedLinkTarget = 'mailto:' + email
        } else {
          // Markdown URL
          regularLinkCaption = regularLinkCaption.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
          regularLinkCaption = regularLinkCaption.replace(/__([^_]+?)__/g, '<strong>$1</strong>')
          regularLinkCaption = regularLinkCaption.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
          regularLinkCaption = regularLinkCaption.replace(/_([^_]+?)_/g, '<em>$1</em>')
          regularLinkCaption = regularLinkCaption.replace(/~~([^~]+?)~~/g, '<del>$1</del>')
          if (/^!\[.+\]\(.+\)$/.test(regularLinkCaption)) {
            regularLinkCaption = regularLinkCaption.replace(/^!\[(.*)\]\((.+)\)$/, '<img src="$2" title="$1">')
          }
          a.innerHTML = regularLinkCaption
        }

        // Set the correct link target as the title, both for users to show
        // them where they are headed, and also to give the link tooltip
        // hook the necessary information
        a.title = renderedLinkTarget

        // Retain the outer formatting, if applicable
        let tk = cm.getTokenAt(curFrom, true).type
        if (tk) {
          tk = tk.split(' ')
          if (tk.includes('strong')) a.style.fontWeight = 'bold'
          if (tk.includes('em')) a.style.fontStyle = 'italic'
        }

        // Apply TextMarker
        let textMarker = cm.markText(
          curFrom, curTo,
          {
            'clearOnEnter': true,
            'replacedWith': a,
            'inclusiveLeft': false,
            'inclusiveRight': false
          }
        )

        a.onclick = (e) => {
          // Only open while either Ctrl or Cmd is pressed.
          let darwinCmd = process.platform === 'darwin' && e.metaKey
          let otherCtrl = process.platform !== 'darwin' && e.ctrlKey

          if (darwinCmd || otherCtrl) {
            e.preventDefault()
            // On ALT-Clicks, use the callback to have the user decide
            // what should happen when they click on links, defined
            // in the markdownOnLinkOpen option.
            openMarkdownLink(renderedLinkTarget, cm)
          } else {
            // Clear the textmarker and set the cursor to where the
            // user has clicked the link.
            textMarker.clear()
            cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
            cm.focus()
          }
        }
      }
    }
  }
})
