interface DictionaryProvider {
  on: (message: string, callback: Function) => void
  off: (message: string, callback: Function) => void
  getUserDictionary: () => string[]
  setUserDictionary: (dict: string[]) => void
}
