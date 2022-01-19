/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        matchQuery
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A utility function that generates a function which can be
 *                  used to match descriptors against a query. The query string
 *                  should be passed prior and can contain the "#"-sign as a
 *                  special character which, if it's alone, matches any file
 *                  that contains tags, or, if it's followed by characters,
 *                  matches tags that include these.
 *
 * END HEADER
 */

import { AnyMetaDescriptor } from '@dts/common/fsal'

/**
 * Returns a function that can be used as a filter (i.e. in Array.filter) to match
 * descriptors (Codefiles, Directories, Markdown files) against the given query.
 *
 * @param   {string}    query                   The query string to match against.
 * @param   {boolean}   includeTitle            Whether or not to include titles
 * @param   {boolean}   includeH1               Whether or not to include headings level 1
 *
 * @return  {(item: AnyMetaDescriptor) => boolean}  The filter function. Takes a descriptor as its only argument.
 */
export default function matchQuery (query: string, includeTitle: boolean, includeH1: boolean): (item: AnyMetaDescriptor) => boolean {
  const queries = query.split(' ').map(q => q.trim()).filter(q => q !== '')

  // Returns a function that takes a Meta descriptor and returns whether it matches or not
  return function (item: AnyMetaDescriptor): boolean {
    for (const q of queries) {
      // First, see if the name gives a match since that's what all descriptors have.
      if (item.name.toLowerCase().includes(q)) {
        return true
      }

      if (item.type !== 'file') {
        continue // The rest can only match files
      }

      // If the query only consists of a "#" also include files that
      // contain tags, no matter which.
      if (q === '#' && item.tags.length > 0) {
        return true
      }

      // Let's check for tag matches
      if (q.startsWith('#')) {
        const tagMatch = item.tags.find(tag => tag.includes(q.substr(1)))
        if (tagMatch !== undefined) {
          return true
        }
      }

      const hasFrontmatter = item.frontmatter != null
      const hasTitle = hasFrontmatter && 'title' in item.frontmatter

      // Does the frontmatter work?
      if (includeTitle && hasTitle && String(item.frontmatter.title).toLowerCase().includes(q)) {
        return true
      }

      // Third, should we use headings 1 and, if so, does it match?
      if (includeH1 && item.firstHeading !== null) {
        if (item.firstHeading.toLowerCase().includes(q)) {
          return true
        }
      }
    } // END for

    return false
  }
}
