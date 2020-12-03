/* global CodeMirror define */
// This plugin renders Bear-style heading indicators

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

  var headRE = /^(\s*)(\@[A-Za-z0-9]+) (.+)$/g

  CodeMirror.commands.markdownRenderAtTags = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advances it.
      headRE.lastIndex = 0

      // First get the line and test if the contents contain an @
      let line = cm.getLine(i)
      if ((match = headRE.exec(line)) == null) {
        continue
      }

      // Now get the precise beginning of the match and its end
      let curFrom = { 'line': i, 'ch': match.index }
      let curTo = { 'line': i, 'ch': match.index + match[1].length + match[2].length + match[3].length + 1 }

      let cur = cm.getCursor('from')
      if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
        // Cursor is in selection: Do not render.
        continue
      }

      // We can only have one marker at any given position at any given time
      if (cm.findMarks(curFrom, curTo).length > 0) continue

      let aWrapper = document.createElement("span");
      let atTag = document.createElement('span')
      atTag.className = 'at-tag'
      atTag.textContent = match[2] + match[1].slice(match[2].length).split("").map(x => " ").join("");
      aWrapper.appendChild(atTag);

      let rest = document.createElement("span");
      rest.textContent = match[3];
      rest.className = 'cm-comment'
      rest.style = 'margin-left: -2px; padding-left: 5px; border-bottom-left-radius: 4px; border-top-left-radius: 4px;';
      aWrapper.appendChild(rest);

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': aWrapper,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      aWrapper.onclick = (e) => {
        textMarker.clear()
        cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
        cm.focus()
      }
    }
  }

  var headRE2 = /^(\* )(.+)$/g

  CodeMirror.commands.markdownRenderListTags = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advances it.
      headRE2.lastIndex = 0

      // First get the line and test if the contents contain an @
      let line = cm.getLine(i)
      if ((match = headRE2.exec(line)) == null) {
        continue
      }

      // Now get the precise beginning of the match and its end
      let curFrom = { 'line': i, 'ch': match.index }
      let curTo = { 'line': i, 'ch': match.index + match[1].length + match[2].length + 1 }

      let cur = cm.getCursor('from')
      if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
        // Cursor is in selection: Do not render.
        continue
      }

      // We can only have one marker at any given position at any given time
      if (cm.findMarks(curFrom, curTo).length > 0) continue

      let tag = document.createElement('span')
      tag.className = 'dialogue-tag'
      tag.textContent = "● " + match[2];

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': tag,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      tag.onclick = (e) => {
        textMarker.clear()
        cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
        cm.focus()
      }
    }
  }

  var headRE3 = /^(\s{8})([#\>]) (.+)$/g

  CodeMirror.commands.markdownRenderListSubtags = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advances it.
      headRE3.lastIndex = 0

      // First get the line and test if the contents contain an @
      let line = cm.getLine(i)
      if ((match = headRE3.exec(line)) == null) {
        continue
      }

      // Now get the precise beginning of the match and its end
      let curFrom = { 'line': i, 'ch': match.index }
      let curTo = { 'line': i, 'ch': match.index + match[1].length + match[2].length + match[3].length + 1 }

      let cur = cm.getCursor('from')
      if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
        // Cursor is in selection: Do not render.
        continue
      }

      // We can only have one marker at any given position at any given time
      if (cm.findMarks(curFrom, curTo).length > 0) continue

      let tag = document.createElement('span')

      if (match[2] === "#") {
        // If it's a hash, we're linking to another heading
        tag.className = 'dialogue-heading-tag'
        tag.textContent = match[1] + "➜ " + match[3];
      }
      else {
        // If it's a bracket, we're running a command
        tag.className = 'dialogue-command-tag'
        tag.textContent = match[1] + "⊕ " + match[3];
      }

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': tag,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      tag.onclick = (e) => {
        textMarker.clear()
        cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
        cm.focus()
      }
    }
  }

  var headRE4 = /^\-{4,}$/g

  CodeMirror.commands.markdownRenderHrTags = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advances it.
      headRE4.lastIndex = 0

      // First get the line and test if the contents contain an @
      let line = cm.getLine(i)
      if ((match = headRE4.exec(line)) == null) {
        continue
      }

      // Now get the precise beginning of the match and its end
      let curFrom = { 'line': i, 'ch': match.index }
      let curTo = { 'line': i, 'ch': match.index + line.length }

      let cur = cm.getCursor('from')
      if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
        // Cursor is in selection: Do not render.
        continue
      }

      // We can only have one marker at any given position at any given time
      if (cm.findMarks(curFrom, curTo).length > 0) continue

      let aTag = document.createElement('hr')
      //aTag.className = 'hr';
      //let aTag2 = document.createElement('span');
      //aTag.appendChild(aTag2);

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': aTag,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      aTag.onclick = (e) => {
        textMarker.clear()
        cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
        cm.focus()
      }
    }
  }
})
