/**
 * This function generates an array of "add"/"unlink"-pairs for
 * the given descriptor (either a file or a directory)
 */

function resolveTree (descriptor, method) {
  let arr = []

  if (descriptor.type === 'file') {
    arr.push({
      'path': descriptor.path,
      'event': method === 'add' ? 'add' : 'unlink'
    })
  } else if (descriptor.type === 'directory') {
    arr.push({
      'path': descriptor.path,
      'event': method === 'add' ? 'addDir' : 'unlinkDir'
    })

    for (let child of descriptor.children) {
      arr.concat(resolveTree(child, method))
    }
  }

  return arr
}

module.exports = function (descriptor, method) {
  return resolveTree(descriptor, method)
}
