interface AssetsProvider {
  /**
   * Gets the defaults for the given writer as a JavaScript object
   *
   * @param   {string}        writer  The writer, e.g., pdf or html.
   * @param   {string}        type    The type, either import or export
   *
   * @return  {Promise<any>}          The loaded defaults
   */
  getDefaultsFor: (writer: string, type: 'import'|'export') => Promise<any>
  /**
   * Sets the defaults for the given writer as a JavaScript object
   *
   * @param   {string}            writer       The writer, e.g., pdf or html.
   * @param   {string}            type         The type, either import or export
   * @param   {any}               newDefaults  The new defaults values, as an object
   *
   * @return  {Promise<boolean>}               True on success, false otherwise.
   */
  setDefaultsFor: (writer: string, type: 'import'|'export', newDefaults: any) => Promise<boolean>

  /**
   * Returns the absolute paths for all filter that reside in the filter directory.
   *
   * @return  {<string>[]}  The list of absolute paths.
   */
  getAllFilters: () => Promise<string[]>
}
