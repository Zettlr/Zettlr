// Copies a lot of code from EventModifierInit
export interface KeyCode {
  key: string
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  modifierAltGraph?: boolean
  modifierCapsLock?: boolean
  modifierFn?: boolean
  modifierFnLock?: boolean
  modifierHyper?: boolean
  modifierNumLock?: boolean
  modifierScrollLock?: boolean
  modifierSuper?: boolean
  modifierSymbol?: boolean
  modifierSymbolLock?: boolean
  shiftKey?: boolean
}

export class Shortcut {
  private constructor (private readonly keycode: KeyCode) {}

  static fromCodeMirror (command: string) {
    const parts = command.split('-')
  }

  static fromElectron (command: string) {
    const parts = command.split('+')
  }

  public toCodeMirror () {}
  public toElectron () {}
}

export class Action {
  constructor (
    private readonly command: CallableFunction,
    private readonly macShortcut: Shortcut
  ) {
    // Empty constructor
  }
}
