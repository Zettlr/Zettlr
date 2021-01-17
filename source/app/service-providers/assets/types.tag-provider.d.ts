interface ColouredTag {
  name: string
  color: string
  desc: string
}

interface TagRecord {
  text: string
  count: number
  className: string
}

interface TagDatabase {
  [name: string]: TagRecord
}

interface TagProvider {
  /**
   * Adds an array of tags to the database
   *
   * @param  {string[]}  tagArray  An array containing the tags to be added
   */
  report: (tagArray: string[]) => void
  /**
   * Removes the given tagArray from the database, i.e. decreases the
   * counter until zero and then removes the tag.
   *
   * @param  {string[]}  tagArray  The tags to remove from the database
   */
  remove: (tagArray: string[]) => void
  /**
   * Returns the global tag database
   *
   * @return  {TagDatabase}  An object containing all tags.
   */
  getTagDatabase: () => TagDatabase
  /**
   * Returns special (= coloured) tags
   *
   * @return  {ColouredTag[]}  The list of coloured tags
   */
  getColouredTags: () => ColouredTag[]
  /**
   * Updates the special tags with an array of new ones.
   *
   * @param   {ColouredTag[]}  newTags  An array containing the tags to be set.
   */
  setColouredTags: (newTags: ColouredTag[]) => void
}
