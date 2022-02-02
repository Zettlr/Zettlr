interface WritingTarget {
  path: string
  mode: 'words'|'chars'
  count: number
}

interface TargetProvider {
  /**
   * Adds (or updates) a writing target to the database
   *
   * @param  {WritingTarget} target An object describing the new target.
   */
  set: (target: WritingTarget) => void
  /**
   * Returns a writing target
   *
   * @param  {number}                   hash  The hash to be searched for.
   * @return {WritingTarget|undefined}        The writing target.
   */
  get: (filePath: string) => WritingTarget|undefined
  /**
   * Removes a target from the database and returns the operation status.
   *
   * @return {boolean} Whether or not the target was removed.
   */
  remove: (filePath: string) => boolean
  /**
   * Adds callback to the event listeners
   *
   * @param  {String}   event    The event to be listened for.
   * @param  {Function} callback The callback when the event is emitted.
   */
  on: (event: string, callback: (...args: any[]) => void) => void
  /**
   * Removes an event listener
   *
   * @param  {String}   event    The event the listener was subscribed to
   * @param  {Function} callback The callback
   */
  off: (event: string, callback: (...args: any[]) => void) => void
  /**
   * Verifies the integrity of all callbacks
   */
  verify: () => void
}
