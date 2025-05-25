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

export interface RequiredSortingProps {
  type: string
  name: string
  frontmatter?: any
  firstHeading?: string|null
  modtime: number
  creationtime: number
}

type SortingType = 'name-up'|'name-down'|'time-up'|'time-down'
type FilenameDisplay = 'filename'|'title'|'heading'|'title+heading'

export type GenericSorter = <T extends RequiredSortingProps>(arr: T[], type?: SortingType) => T[]

/**
 * Helper function to sort files by modification or creation time
 *
 * @param   {'modtime'|'creationtime'}  whichTime  How to sort
 *
 * @return  {Function}                             Function compatible with
 *                                                 array.sort()
 */
function getDateSorter (whichTime: 'modtime'|'creationtime'): (a: any, b: any) => number {
  return function sortDate<T extends RequiredSortingProps> (a: T, b: T): number {
    let aDate = a.modtime
    let bDate = b.modtime

    if (whichTime !== 'modtime') {
      aDate = a.creationtime
      bDate = b.creationtime
    }

    if (aDate > bDate) {
      return -1
    } else if (aDate < bDate) {
      return 1
    } else {
      return 0
    }
  }
}

/**
 * Helper function to sort files using a collator
 *
 * @param   {FilenameDisplay}  fileNameDisplay  How to sort the files
 * @param   {string}           appLang          The application language
 *
 * @return  {Function}                          Function compatible with
 *                                              array.sort()
 */
function getNaturalSorter (fileNameDisplay: FilenameDisplay, appLang: string): (a: any, b: any) => number {
  return function sortNatural <T extends RequiredSortingProps> (a: T, b: T): number {
    let aSort = a.name.toLowerCase()
    let bSort = b.name.toLowerCase()

    const aTitle = (a.type === 'file') ? typeof a.frontmatter?.title === 'string' : false
    const bTitle = (b.type === 'file') ? typeof b.frontmatter?.title === 'string' : false
    const aHeading = (a.type === 'file') ? a.firstHeading != null : false
    const bHeading = (b.type === 'file') ? b.firstHeading != null : false

    const useH1 = fileNameDisplay.includes('heading')
    const useTitle = fileNameDisplay.includes('title')

    // Use a heading level 1 if applicable, and, optionally, overwrite this with
    // the YAML frontmatter title variable

    if (aHeading && useH1) {
      aSort = a.firstHeading!
    }

    if (bHeading && useH1) {
      bSort = b.firstHeading!
    }

    if (aTitle && useTitle) {
      aSort = a.frontmatter.title
    }

    if (bTitle && useTitle) {
      bSort = b.frontmatter.title
    }

    const coll = new Intl.Collator([ appLang, 'en' ], { numeric: true })

    return coll.compare(aSort, bSort)
  }
}

/**
 * Helper function to sort files by ascii characters
 *
 * @param   {FilenameDisplay}  fileNameDisplay  How to sort the files
 *
 * @return  {number}                            Function compatible with
 *                                              array.sort()
 */
function getAsciiSorter (fileNameDisplay: FilenameDisplay): (a: any, b: any) => number {
  return function sortAscii <T extends RequiredSortingProps> (a: T, b: T): number {
    let aSort = a.name.toLowerCase()
    let bSort = b.name.toLowerCase()

    const aTitle = (a.type === 'file') ? typeof a.frontmatter?.title === 'string' : false
    const bTitle = (b.type === 'file') ? typeof b.frontmatter?.title === 'string' : false
    const aHeading = (a.type === 'file') ? a.firstHeading != null : false
    const bHeading = (b.type === 'file') ? b.firstHeading != null : false

    const useH1 = fileNameDisplay.includes('heading')
    const useTitle = fileNameDisplay.includes('title')

    // Use a heading level 1 if applicable, and, optionally, overwrite this with
    // the YAML frontmatter title variable

    if (aHeading && useH1) {
      aSort = a.firstHeading!
    }

    if (bHeading && useH1) {
      bSort = b.firstHeading!
    }

    if (aTitle && useTitle) {
      aSort = a.frontmatter.title
    }

    if (bTitle && useTitle) {
      bSort = b.frontmatter.title
    }

    // Negative return: a is smaller b (case insensitive)
    if (aSort < bSort) {
      return -1
    } else if (aSort > bSort) {
      return 1
    } else {
      return 0
    }
  }
}

/**
 * Returns a function that can sort a children-array on a directory descriptor.
 *
 * @param   {'natural'|'ascii'}         sortingType       How to sort characters
 * @param   {boolean}                   sortFoldersFirst  Whether to sort
 *                                                        folders first
 * @param   {FilenameDisplay}           fileNameDisplay   Which property to sort
 *                                                        on when sorting by
 *                                                        name
 * @param   {string}                    appLang           The application
 *                                                        language
 * @param   {'modtime'|'creationtime'}  whichTime         How to sort when
 *                                                        sorting by time
 *
 * @return  {GenericSorter}                               Returns a sorter
 *                                                        function
 */
export function getSorter (
  sortingType: 'natural'|'ascii',
  sortFoldersFirst: boolean,
  fileNameDisplay: FilenameDisplay,
  appLang: string,
  whichTime: 'modtime'|'creationtime'
): GenericSorter {
  return function sort <T extends RequiredSortingProps> (arr: T[], type: SortingType = 'name-up'): T[] {
    // First split the array based on type
    const f: T[] = []
    const d: T[] = []

    // Should we use natural sorting or ascii?
    const useNatural = sortingType === 'natural'

    // Write in the sortingFunc whatever we should be using
    const sortingFunc = (useNatural) ? getNaturalSorter(fileNameDisplay, appLang) : getAsciiSorter(fileNameDisplay)

    // Split up the children list
    for (const c of arr) {
      switch (c.type) {
        case 'file':
        case 'code':
        case 'other':
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
        f.sort(getDateSorter(whichTime))
        break
      case 'time-down':
        f.sort(getDateSorter(whichTime)).reverse()
        break
    }

    // Return sorted array files -> directories
    if (sortFoldersFirst) {
      return d.concat(f)
    } else {
      return f.concat(d)
    }
  }
}
