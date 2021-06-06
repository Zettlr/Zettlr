/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        matchFilesByTags function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This utility function takes a file descriptor and a file
 *                  tree and filters out all files where at least one tag
 *                  matches the given source file descriptor.
 *
 * END HEADER
 */

const objectToArray = require('./object-to-array')

// TODO: Apparently this is dead code, since the function is nowhere included.
// Check if we can need it, otherwise, remove it.
module.exports = function matchFilesByTags (sourceFileDescriptor, tree) {
  let tagsToMatch = sourceFileDescriptor.tags

  let treeArray = []
  if (!Array.isArray(tree)) tree = [tree]

  for (let root of tree) {
    // objectToArray expects a single object, not an array
    objectToArray(root, 'children', treeArray)
  }

  // Make sure we have just files & all of these files have at least one tag
  treeArray = treeArray.filter(e => e.type === 'file' && e.tags.length > 0)
  treeArray = treeArray.map(e => { return { 'path': e.path, 'tags': e.tags } })

  let candidates = []

  // Now create an array of candidates where at least one tag matches with the
  // source file descriptor
  for (let file of treeArray) {
    // Prevent (potential) duplicates
    if (file.path === sourceFileDescriptor.path) continue

    let candidate = {
      'path': file.path,
      'matches': 0
    }

    for (let tag of tagsToMatch) {
      if (file.tags.includes(tag)) candidate.matches += 1
    }

    if (candidate.matches > 0) candidates.push(candidate)
  }

  // Make sure they're sorted correctly
  candidates.sort((a, b) => a.matches - b.matches)

  return candidates
}
