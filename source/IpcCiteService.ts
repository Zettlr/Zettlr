export interface IpcCiteService {

  /**
   * Takes IDs as set in Zotero and returns Author-Date citations for them.
   *
   * @param  {string}            citation  Array containing the IDs to be returned
   * @return {string|undefined}            The rendered string
   */
  getCitation: (citation: string) => string|undefined

  /**
   * Directs the engine to create a bibliography from the given items.
   *
   * @param  {string[]} citations A list of IDs
   * @return {[BibliographyOptions, string[]]|undefined} A CSL object containing the bibliography.
   */
  getBibliography: (citations: string[]) => [BibliographyOptions, string[]]|undefined

  getItems: () => CSLItem[]
}
