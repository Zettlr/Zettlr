export interface PandocProfileMetadata {
  /**
   * The filename of the defaults file
   */
  name: string
  /**
   * The absolute path of the file
   */
  path: string
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
}
