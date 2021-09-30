interface CiteprocProvider {
  /**
   * Returns a correct citation for the one given
   *
   * @param   {string}   citation  The citation to be rendered
   * @param   {boolean}  composite Whether the function should return Author (year) instead of (Author year)
   *
   * @return  {string}             The fully rendered citation.
   */
  getCitation: (citations: CiteItem[], composite: boolean) => string|undefined
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
  /**
   * Loads the given database (if it's not yet loaded) and selects it as the
   * active database. This will ensure appropriate events are being emitted so
   * that, e.g., the main window will be notified of it. Once this function
   * resolves, you can cite using this database.
   *
   * @param   {string}         database  The database to load and select
   *
   * @return  {Promise<void>}            The function resolves after the database has been loaded.
   */
  loadAndSelect: (database: string) => Promise<void>
  /**
   * Selects the main database to cite from. This is useful when switching to
   * a file that does not define its own database.
   */
  loadMainDatabase: () => void
  /**
   * Returns the path to the currently selected database (or undefined)
   *
   * @return  {string|undefined}  The database path, or undefined
   */
  getSelectedDatabase: () => string|undefined
}
