/**
 * A search term consists of a list of words and an operator. An AND-operator
 * means that all words are required, a NOT operator the opposite, and an OR
 * operator means that any of the words may match.
 */
export interface SearchTerm {
  operator: 'OR'|'AND'|'NOT'
  words: string[]
}

/**
 * A SearchResultRange indicates the characters between which a search result
 * has been found on a given line.
 */
export interface SearchResultRange {
  from: number
  to: number
}

/**
 * A Search result includes information about a specific search term match on a
 * single line.
 */
export interface SearchResult {
  /**
   * The restext includes the full content of the line that has matched
   */
  restext: string
  /**
   * The weight is a relevancy score: The higher, the better was this match.
   */
  weight: number
  /**
   * The line number where the match was found. If line is -1, this indicates a
   * match in the filename or the file's tags.
   */
  line: number
  /**
   * Wherever on this line something matched, the ranges indicate from which
   * character to which something matched. Can be used for highlighting.
   */
  ranges: SearchResultRange[]
}

/**
 * This interface describes a specific descriptor for use during file searches
 */
export interface FileSearchDescriptor {
  path: string
  relativeDirectoryPath: string
  filename: string
  displayName: string
}

/**
 * This interface describes a wrapper that combines search results with metadata
 * on the file the results describe
 */
export interface SearchResultWrapper {
  file: FileSearchDescriptor
  result: SearchResult[]
  hideResultSet: boolean
  weight: number
}
