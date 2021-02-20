interface CiteprocProvider {
  /**
   * Returns a correct citation for the one given
   *
   * @param   {string}  citation  The citation to be rendered
   *
   * @return  {string}            The fully rendered citation.
   */
  getCitation: (citation: string) => string|undefined
  /**
   * Updates the items in the registry depending on the idList
   *
   * @param   {string[]}  idList  A list of citekeys to update the registry
   *
   * @return  {boolean}           True if the call succeeded
   */
  updateItems: (idList: string[]) => boolean
  /**
   * Returns a full bibliography from the items in the registry
   *
   * @return  {any}    The bibliography options, or undefined if the call failed
   */
  makeBibliography: () => [BibliographyOptions, string[]] | undefined
  /**
   * Returns true if the current dartabase has BibTex attachments.
   *
   * @return  {boolean}  True if the BibTex database has attachments
   */
  hasBibTexAttachments: () => boolean
  /**
   * Gets the attachments for the citation key, or undefined.
   *
   * @param   {string}  id  The ID to retrieve the attachments for
   *
   * @return  {string|undefined}      Either the path to the attachment, or undefined.
   */
  getBibTexAttachments: (id: string) => string|undefined
}
