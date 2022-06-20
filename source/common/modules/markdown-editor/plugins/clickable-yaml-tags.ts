/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        clickable YAML tags
 * CVM-Role:        CodeMirror Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin searches the active document for YAML frontmatter
 *                  tags and renders them clickable
 *
 * END HEADER
 */

import cssSafeString from '@common/util/css-safe-string'
import CodeMirror, { commands } from 'codemirror'
import yaml, { Scalar, YAMLMap, YAMLSeq } from 'yaml'

/**
 * Defines the CodeMirror command to render all found markdown images.
 *
 * @param  {CodeMirror.Editor} cm The calling CodeMirror instance
 */
(commands as any).clickableYAMLTags = function (cm: CodeMirror.Editor) {
  if (cm.getLine(0) !== '---' || cm.getModeAt({ line: 1, ch: 0 }).name !== 'yaml') {
    return // No YAML frontmatter in the current file --> nothing to do
  }

  const lineCount = cm.lineCount()

  // Find the end of the frontmatter
  let endLine = 0
  const frontmatterLines = []

  do {
    endLine++
    frontmatterLines.push(cm.getLine(endLine))
  } while (endLine < lineCount && ![ '---', '...' ].includes(cm.getLine(endLine)))

  if (endLine === lineCount && ![ '---', '...' ].includes(cm.getLine(endLine))) {
    return // The second condition is necessary to allow frontmatter-only files
  }

  // At this point we have a YAML frontmatter. Let's parse it!
  let parsedDoc
  try {
    parsedDoc = yaml.parseDocument(frontmatterLines.slice(0, endLine - 1).join('\n'), {})
  } catch (err: any) {
    // The frontmatter was malformed, so let's abort here
    console.error(err)
  }

  if (parsedDoc === undefined || !(parsedDoc.contents instanceof YAMLMap)) {
    return // Something went wrong
  }

  const itemsToProcess = [
    parsedDoc.contents.get('keywords', true),
    parsedDoc.contents.get('tags', true)
  ].filter(elem => elem !== undefined)

  if (itemsToProcess.length === 0) {
    return // The frontmatter neither contains keywords nor tags
  }

  const rangesToProcess: Array<[number, number]> = []

  for (const item of itemsToProcess) {
    // In order to become clickable, we only allow scalars (tags: single-tag) or
    // sequences (tags: [one, two, three]). Everything else cannot be considered
    // a valid tag
    if (item instanceof Scalar && item.range != null) {
      // A scalar has just one range
      rangesToProcess.push(item.range.slice(0, 2) as [number, number])
    } else if (item instanceof YAMLSeq && item.items.length > 0) {
      // Sequences have items with ranges
      for (const subItem of item.items) {
        if (subItem instanceof Scalar && subItem.range != null) {
          rangesToProcess.push(subItem.range.slice(0, 2) as [number, number])
        }
      }
    }
  }

  if (rangesToProcess.length === 0) {
    return // No valid ranges found
  }

  const markerRanges: CodeMirror.MarkerRange[] = []

  const lineLengths = frontmatterLines.slice(0, endLine - 1).map(line => line.length)

  // Next, we need to convert the character ranges into textmarker ranges
  for (let [ start, end ] of rangesToProcess) {
    const from = { line: 1, ch: 0 }
    const to = { line: 1, ch: 0 }
    for (const len of lineLengths) {
      if (start > len) {
        start -= len + 1 // We need to account for the \n in the parsed source
        from.line++
      } else {
        from.ch = start
        break
      }
    }

    for (const len of lineLengths) {
      if (end > len) {
        end -= len + 1 // We need to account for the \n in the parsed source
        to.line++
      } else {
        to.ch = end
        break
      }
    }

    markerRanges.push({ from, to })
  }

  // Finally, now we can actually mark the text
  const cur = cm.getCursor()
  for (const { from, to } of markerRanges) {
    const foundMarks = cm.findMarks(from, to)

    if (cur.line === from.line && cur.ch >= from.ch && cur.ch <= to.ch) {
      // Cursor is in selection. Now we also can check if the user has just
      // typed something, so that the marker is only a subset of the range. If
      // so, we should programmatically clear the marker so that the next
      // iteration can re-render the full tag after the user has left the range.
      for (const mark of foundMarks) {
        const range = mark.find() as CodeMirror.MarkerRange|undefined
        if (range !== undefined) {
          if (range.from.ch > from.ch || range.to.ch < to.ch) {
            mark.clear()
          }
        }
      }
      continue
    }

    if (foundMarks.length > 0) {
      continue
    }

    const tagText = cssSafeString(cm.getRange(from, to))

    cm.markText(from, to, {
      className: `zkn-tag zkn-tag-${tagText} cma`,
      inclusiveLeft: false,
      inclusiveRight: false,
      clearOnEnter: true
    })
  }
}
