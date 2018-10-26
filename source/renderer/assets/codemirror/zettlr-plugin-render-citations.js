/* global define CodeMirror */
// This plugin renders citations

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
  // Should match everything permittible -- first alternative are the huge
  // blocks, second alternative are the simple @ID-things, both recognised by
  // Pandoc.
  // var citationRE = /\[([\w -]*@[\w-]+.*)\]|@([a-z0-9_:.#$%&\-+?<>~/]+)/gi
  var citationRE = /\[([^[\]]*@[^[\]]+)\]|@([a-z0-9_:.#$%&\-+?<>~/]+)/gi
  var citeMarkers = [] // CiteMarkers

  CodeMirror.commands.markdownRenderCitations = function (cm) {
    let match

    // First remove links that don't exist anymore. As soon as someone
    // moves the cursor into the link, it will be automatically removed,
    // as well as if someone simply deletes the whole line.
    for (let i in citeMarkers) {
      if (citeMarkers[i] && citeMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        citeMarkers.splice(i, 1)
      }
    }

    // Now render all potential new links
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advance it.
      citationRE.lastIndex = 0

      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if (!citationRE.test(line)) {
        continue
      }

      citationRE.lastIndex = 0 // Necessary because of global flag in RegExp

      // Run through all links on this line
      while ((match = citationRE.exec(line)) != null) {
        let realCitations = []
        if (match[1]) {
          let cite = match[1].split(';') // First extract all citations in this thing
          for (let c of cite) {
            // Loop through all array items and deconstruct them. They can look like this:
            /*
            [see @doe99, pp. 33-35; also @smith04, chap. 1]
            [see @doe99, pp. 33-35; also @smith04, chap. 1]
            [@doe99, pp. 33-35, 38-39 and *passim*]
            [@smith04; @doe99]
            [-@smith04]
             */
            let myCitation = {}
            myCitation['prefix'] = c.split('@')[0] // Now in pre there is the prefix
            myCitation['suppress-author'] = c.indexOf('@') > 0 && c[c.indexOf('@') - 1] === '-' // Should the author be omitted?
            if (myCitation['suppress-author']) myCitation['prefix'] = myCitation['prefix'].substr(0, myCitation['prefix'].length - 2)
            // Now we should have an ID. The list of characters that is permitted
            // inside a citation key (e.g. the id) is taken from
            // http://pandoc.org/demo/example19/Extension-citations.html
            // This does not work currently: /[^a-z0-9_:.#$%&-+?<>~/]/
            let suffixWithID = c.split('@')[1].split(/[,; ]/)
            myCitation['id'] = suffixWithID.shift()
            // We may have some information loss here, but it's all about previewing, not being perfect
            myCitation['suffix'] = suffixWithID.join(' ')
            // Last but not least, try to find if in the suffix there is a locator
            if (myCitation['suffix'].length > 0) {
              // Allow for maximal 99999 pages inside a publication.
              let m
              if ((m = /\d{1,5}(-\d{1,5})?/.exec(myCitation['suffix'])) != null) {
                myCitation['locator'] = m[0]
                myCitation['suffix'] = myCitation['suffix'].replace(m[0], '') // Remove locator from the rest of the suffix
              }
            }
            myCitation['prefix'] = myCitation['prefix'].trim()
            myCitation['suffix'] = myCitation['suffix'].trim()
            realCitations.push(myCitation)
          }
          // END IF MATCH[1]
        } else {
          // MATCH[2] -- simple IDs. This is so silly.
          realCitations.push({ 'id': match[2] })
        }

        // Now get the precise beginning of the match and its end
        let curFrom = { 'line': i, 'ch': match.index }
        let curTo = { 'line': i, 'ch': match.index + match[0].length }

        let cur = cm.getCursor('from')
        if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
          // Cursor is in selection: Do not render.
          continue
        }

        // Has this thing already been rendered?
        let con = false
        let marks = cm.findMarks(curFrom, curTo)
        for (let marx of marks) {
          if (citeMarkers.includes(marx)) {
            // We've got communism. (Sorry for the REALLY bad pun.)
            con = true
            break
          }
        }
        if (con) continue // Skip this match
        let span = document.createElement('span')
        span.className = 'citeproc-citation' // citations
        // The text content will be updated automatically based upon the ID
        span.textContent = match[0]
        // The attribute will be taken by the citation updater to update the citations
        span.setAttribute('data-citeproc-cite-item', JSON.stringify(realCitations))
        // Apply TextMarker
        try {
          let textMarker = cm.markText(
            curFrom, curTo,
            {
              'clearOnEnter': true,
              'replacedWith': span,
              'inclusiveLeft': false,
              'inclusiveRight': false
            }
          )

          span.onclick = (e) => {
            textMarker.clear()
            cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
            cm.focus()
          }

          // Finally push the marker into the array
          citeMarkers.push(textMarker)
        } catch (e) {
          // CodeMirror throws errors if one tries to paper over an existing
          // mark with a new marker. In this case, don't mark the text and simply
          // do nothing.
        }
      }
    }
  }
})
