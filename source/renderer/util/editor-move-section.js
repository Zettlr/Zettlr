/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        moveSection function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Swaps sections demarcated by headers within Markdown files.
 *
 * END HEADER
 */

/**
 * Moves a whole section (as demarcated by ATX headings)
 * @param  {number} fromLine The line at which the section to be moved begins
 * @param  {number} toLine   The target line, above which the section should be inserted.
 * @return {string}    The new file contents with the section moved.
 */
module.exports = function moveSection (value, fromLine, toLine) {
  let lines = value.split('\n')
  let sectionStart = fromLine
  let sectionEnd = fromLine
  let headingLevel = -1

  // First match of the following regex contains the heading characters, ergo
  // the length is the heading level
  headingLevel = /^(#{1,6}) (.*)$/.exec(lines[fromLine]).length

  // Build a regex to be used now. We'll only stop at either a higher or
  // same level heading. We're doing this, because this way we'll include
  // lesser headings in this section.
  let searchRegex = new RegExp(`^#{1,${headingLevel}} .+$`)
  for (let i = sectionStart + 1; i < lines.length; i++) {
    if (searchRegex.test(lines[i])) {
      // We've found a heading of at least this level.
      sectionEnd = i - 1 // Don't include the current line, obviously
      break
    }
  }

  // Sanity check: If sectionEnd has not been set, this means that the user
  // wanted to move the final section -- the RegExp will naturally not yield
  // any result, so we take everything until the very end to be included in
  // the section.
  if (sectionEnd === fromLine) sectionEnd = lines.length - 1

  let section = lines.slice(sectionStart, sectionEnd + 1)

  if (toLine < 0) {
    // We should move the section to the end, so cut and append it.
    // Remove the old section.
    lines.splice(sectionStart, section.length)
    // Sneak a new line into the section, if there's no padding
    if (lines[lines.length - 1] !== '') section.unshift('')
    // Concat the section
    lines = lines.concat(section)

    // Remove a trailing newline if applicable
    if (lines[lines.length - 1] === '') lines.pop()
  } else if (sectionEnd < toLine) {
    // The section should be moved to the back, so to not confuse line numbers,
    // we first need to insert the section (i.e. copy and paste), and only
    // afterwards remove the section.
    // First get the stuff before the old section position
    let beforeSection = lines.slice(0, sectionStart)
    // Then append the part behind the section up until the target line
    beforeSection = beforeSection.concat(lines.slice(sectionEnd + 1, toLine))

    // Get everything after the target line
    let afterSection = lines.slice(toLine)

    // Now glue it back together (afterSection -> section, then section -> beforeSection)
    lines = beforeSection.concat(section.concat(afterSection))
  } else if (sectionStart > toLine) {
    // The section should be moved to the front, so we can safely cut it directly.
    // Remove the old section.

    // It was in fact the last section, so let's add a newline afterwards.
    if (sectionEnd + 1 === lines.length) {
      // ... but only if it doesn't end with a newline
      if (section[section.length - 1] !== '') section.push('')
    }

    // Now splice out the section
    lines.splice(sectionStart, section.length)

    // Now that the file has been truncated by the section, let's make sure
    // it does not end with a newline
    if (lines[lines.length - 1] === '') lines.pop()

    // Then insert it above the target line. We will make use of Function.apply
    // to pass the array completely to the function. What do I mean? Splice
    // basically needs 2 arguments plus a list of unknown length. This means
    // we create an array containing the first and second argument [toline, 0],
    // and afterwards add the whole section array. They will be inserted in the
    // right order and the function will be called accordingly.
    Array.prototype.splice.apply(lines, [ toLine, 0 ].concat(section))
    // Splice will be called on "lines" with the argument chain.
    // Equivalent: lines.splice(toLine, 0, section)
  }

  // Now we have the correct lines. So let's simply replace the whole content
  // with it. Tadaa!
  return lines.join('\n')
}
