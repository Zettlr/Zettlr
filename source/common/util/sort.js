/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to sort directories.
 *
 * END HEADER
 */

const asciiSorting = require('./sort-ascii')
const dateSorting = require('./sort-date')

/**
* This function can sort an array of ZettlrFile and ZettlrDir objects
* @param  {Array} arr An array containing file and directory descriptors
* @param {String} [type='name-up'] The type of sorting - can be time-up, time-down, name-up or name-down
* @return {Array}     The sorted array
*/
module.exports = function (arr, type = 'name-up') {
  // First split the array based on type
  let f = []
  let d = []

  // Should we use natural sorting or ascii?
  let useNatural = (global.config && global.config.get('sorting') === 'natural')

  // Create a collator for long lists, using the app-lang in BCP-47, and en as fallback
  let coll = new Intl.Collator([ global.config.get('appLang'), 'en' ], { 'numeric': true })

  // We need a buffer function because compare() expects strings, not objects
  let naturalSorting = (a, b) => { return coll.compare(a.name, b.name) }

  // Write in the sortingFunc whatever we should be using
  let sortingFunc = (useNatural) ? naturalSorting : asciiSorting

  // Split up the children list
  for (let c of arr) {
    switch (c.type) {
      case 'file':
        f.push(c)
        break
      case 'directory':
        d.push(c)
        break
    }
  }

  // Sort the directories (always based on name)
  d.sort(sortingFunc)

  // Now sort the files according to the type of sorting
  switch (type) {
    case 'name-up':
      f.sort(sortingFunc)
      break
    case 'name-down':
      f.sort(sortingFunc).reverse()
      break
    case 'time-up':
      f.sort(dateSorting)
      break
    case 'time-down':
      f.sort(dateSorting).reverse()
      break
  }

  // Return sorted array files -> directories
  return f.concat(d)
}
