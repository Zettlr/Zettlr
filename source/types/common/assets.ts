export interface PandocProfileMetadata {
  /**
   * The filename of the defaults file
   */
  name: string
  /**
   * The writer, can be undefined
   */
  writer: string
  /**
   * The reader, can be undefined
   */
  reader: string
  /**
   * Since Zettlr has a few requirements, we must have writers and readers.
   * While we strive to even support unknown readers and writers, those fields
   * at least have to have a value. If any hasn't, isInvalid will be true.
   */
  isInvalid: boolean
  /**
   * Zettlr ships with a few profiles by default. In order to ensure that there
   * is always a set of minimal profiles to export and import to, Zettlr will
   * ensure that these standard defaults files will always be present. With this
   * flag, renderer elements can additionally indicate that. This helps prevent
   * some misconceptions, i.e. why certain files cannot be deleted.
   */
  isProtected?: boolean
}
