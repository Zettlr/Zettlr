interface ComplexSpellCheck {
  correct: boolean
  forbidden: boolean
  warn: boolean
}

declare module 'nspell' {
  export default class NSpell {
    constructor (aff: string, dic: string): NSpell
    correct (term: string): boolean
    suggest (term: string): string[]
    spell (term: string): ComplexSpellCheck
    add (term: string): this
    remove (term: string): this
    wordCharacters (): any|null
    static dictionary (): NSpell
    static personal (): NSpell
  }
}
