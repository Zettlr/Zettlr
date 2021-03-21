interface AssetsProvider {
  /**
   * Gets the defaults for the given writer as a JavaScript object
   *
   * @param   {string}        writer  The writer, e.g., pdf or html.
   *
   * @return  {Promise<any>}          The loaded defaults
   */
  getDefaultsFor: (writer: string) => Promise<any>
  /**
   * Sets the defaults for the given writer as a JavaScript object
   *
   * @param   {string}            writer       The writer, e.g., pdf or html.
   * @param   {any}               newDefaults  The new defaults values, as an object
   *
   * @return  {Promise<boolean>}               True on success, false otherwise.
   */
  setDefaultsFor: (writer: string, newDefaults: any) => Promise<boolean>
}
