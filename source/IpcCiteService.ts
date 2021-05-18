export interface IpcCiteService {

  /**
   * Takes IDs as set in Zotero and returns Author-Date citations for them.
   *
   * @param  {string}            citation  Array containing the IDs to be returned
   * @return {string|undefined}            The rendered string
   */
  getCitation: (citation: string) => string|undefined

  /**
   * Updates the items that the engine uses for bibliographies. Must be called
   * prior to makeBibliography()
   *
   * @param  {string[]} citations A list of IDs
   * @return {boolean}            True if the registry has been updated correctly.
   */
  updateItems: (citations: string[]) => boolean

  /**
   * Directs the engine to create a bibliography from the items currently in the
   * registry (this can be updated by calling updateItems with an array of IDs.)
   *
   * @return {[BibliographyOptions, string[]]|undefined} A CSL object containing the bibliography.
   */
  makeBibliography: () => [BibliographyOptions, string[]]|undefined
}
