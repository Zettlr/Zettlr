/* global define CodeMirror */
// This plugin renders markdown inline links

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('../../../node_modules/codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['../../../node_modules/codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  // This regular expression matches three different kinds of URLs:
  // 1. Markdown URLs in the format [Caption](www.link-target.tld)
  // 2. Standalone links, either beginning with http(s):// or www.
  // 3. Email addresses.
  // var linkRE = /\[([^\]]+?)\]\(([^)]+?)\)|(https?:\/\/\S+|www\.\S+)|([a-z0-9.\-_+]+?@[a-z0-9.\-_+]+\.[a-z]{2,7})/gi
  // ATTENTION: The middle part is taken from the gfm mode so that the rendered
  // links are the same as those that the gfm mode detects.
  var linkRE = /\[([^\]]+)\]\((.+?)\)|(((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()[\]{};:'".,<>?«»“”‘’])))|([a-z0-9.\-_+]+?@[a-z0-9.\-_+]+\.[a-z]{2,7})/gi
  var linkMarkers = []
  var currentDocID = null

  CodeMirror.commands.markdownRenderLinks = function (cm) {
    let i = 0
    let match

    if (currentDocID !== cm.doc.id) {
      currentDocID = cm.doc.id
      for (let marker of linkMarkers) {
        if (marker.find()) marker.clear()
      }
      linkMarkers = [] // Flush it away!
    }

    // First remove links that don't exist anymore. As soon as someone
    // moves the cursor into the link, it will be automatically removed,
    // as well as if someone simply deletes the whole line.
    do {
      if (!linkMarkers[i]) {
        continue
      }
      if (linkMarkers[i] && linkMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        linkMarkers.splice(i, 1)
      } else {
        i++
      }
    } while (i < linkMarkers.length)

    // Now render all potential new links
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue
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
        let caption = match[1] || ''
        let url = match[2] || ''
        let standalone = match[3] || ''
        let email = match[5] || ''

        // Now get the precise beginning of the match and its end
        let curFrom = { 'line': i, 'ch': match.index }
        let curTo = { 'line': i, 'ch': match.index + match[0].length }

        let cur = cm.getCursor('from')
        if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch + 1) {
          // Cursor is in selection: Do not render. Also include the adjacent
          // character, because otherwise impartial links will also be detected
          // and rendered before the user has finished typing them.
          continue
        }

        // Has this thing already been rendered?
        let con = false
        let marks = cm.findMarks(curFrom, curTo)
        for (let marx of marks) {
          if (linkMarkers.includes(marx)) {
            // We've got communism. (Sorry for the REALLY bad pun.)
            con = true
            break
          }
        }
        if (con) continue // Skip this match

        // Do not render if it's inside a comment (in this case the mode will be
        // markdown, but comments shouldn't be included in rendering)
        // Final check to avoid it for as long as possible, as getTokenAt takes
        // considerable time.
        if (cm.getTokenAt(curFrom).type === 'comment' ||
            cm.getTokenAt(curTo).type === 'comment') {
          continue
        }

        if (url !== '' && /\)+$/.test(url)) {
          // We got a Markdown link AND it ends with at least two braces, so
          // there's a strong indication that we should not include the final
          // brace inside our actual link.
          curTo.ch -= 1
          url = url.substr(0, url.length - 1)
        }

        let a = document.createElement('a')
        a.className = 'cma' // CodeMirrorAnchors
        if (standalone) {
          // In case of a standalone link, all is the same
          a.innerHTML = standalone
          a.title = standalone
          url = standalone
        } else if (email) {
          // In case of an email, the same except the URL (which gets
          // an added mailto protocol handler).
          a.innerHTML = email
          a.title = 'mailto:' + email
          url = 'mailto:' + email
        } else {
          // Markdown URL
          caption = caption.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
          caption = caption.replace(/__([^_]+?)__/g, '<strong>$1</strong>')
          caption = caption.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
          caption = caption.replace(/_([^_]+?)_/g, '<em>$1</em>')
          caption = caption.replace(/~~([^~]+?)~~/g, '<del>$1</del>')
          if (/^!\[.+\]\(.+\)$/.test(caption)) {
            caption = caption.replace(/^!\[(.+)\]\((.+)\)$/, '<img src="$2" title="$1">')
          }
          a.innerHTML = caption
          a.title = url // Set the url as title to let users see where they're going
        }

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
          // Only open while either Alt or Ctrl is pressed.
          if (e.altKey || e.ctrlKey) {
            e.preventDefault()
            // On ALT-Clicks, use the callback to have the user decide
            // what should happen when they click on links, defined
            // in the markdownOnLinkOpen option.
            let callback = cm.getOption('markdownOnLinkOpen')
            if (callback && {}.toString.call(callback) === '[object Function]') {
              callback(url)
            }
          } else {
            // Clear the textmarker and set the cursor to where the
            // user has clicked the link.
            textMarker.clear()
            cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
            cm.focus()
          }
        }

        linkMarkers.push(textMarker)
      }
    }
  }
})
