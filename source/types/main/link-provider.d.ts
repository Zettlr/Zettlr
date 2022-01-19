interface LinkProvider {
  /**
   * Adds an array of links from a specific file to the database. This
   * function assumes sourceIDs to be unique, so in case of a duplicate, the
   * later-loaded file overrides the earlier loaded one.
   *
   * @param   {string}            sourcePath     The full path to the source file
   * @param   {string[]}          outboundLinks  A collection of links
   * @param   {string|undefined}  sourceID       The ID of the source (if applicable)
   */
  report: (sourcePath: string, outboundLinks: string[], sourceID?: string) => void
  /**
   * Removes any outbound links emanating from the given file from the
   * database. This function assumes sourceIDs to be unique, so in case of
   * a duplicate, removing any of these files will delete the links for all.
   *
   * @param   {string}            sourcePath     The full path to the source file
   * @param   {string|undefined}  sourceID       The ID of the source (if applicable)
   */
  remove: (sourcePath: string, sourceID?: string) => void
}
