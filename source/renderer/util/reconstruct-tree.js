const findObject = require('../../common/util/find-object')

function reconstruct (rootPointer, currentPointer) {
  // Each tree object has a "parent" property
  // that needs to be replaced. The tree can
  // either be an array (of children/attachments)
  // or a single object (dir/file/attachment)
  if (Array.isArray(currentPointer)) {
    for (let i = 0; i < currentPointer.length; i++) {
      if (currentPointer[i].type === 'directory') {
        reconstruct(rootPointer, currentPointer[i])
      } else {
        reconstruct(rootPointer, currentPointer[i])
      }
    }
  } else if (currentPointer.type === 'directory') {
    currentPointer.parent = findObject(rootPointer, 'hash', currentPointer.parent, 'children')
    currentPointer.children.map((elem) => {
      if (elem.type === 'directory') {
        reconstruct(rootPointer, elem)
      } else {
        let found = findObject(rootPointer, 'hash', elem.parent, 'children')
        if (!found) console.log('Did not find object!' + elem.parent)
        elem.parent = found
      }
    })

    currentPointer.attachments.map((elem) => {
      elem.parent = findObject(rootPointer, 'hash', elem.parent, 'children')
    })
  } else {
    currentPointer.parent = findObject(rootPointer, 'hash', currentPointer.parent, 'children')
  }
}

module.exports = function (tree) {
  // What this function does is that it basically
  // recursively searches for the parent objects
  // as indicated by their hashes, and replaces
  // the hashes with pointers to the original
  // objects so that tree traversal is possible
  // again.
  reconstruct(tree, tree)
}
