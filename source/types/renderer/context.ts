export interface CheckboxRadioItem {
  id: string
  label: string
  accelerator?: string
  type: 'checkbox'|'radio'
  enabled?: boolean
  checked: boolean
}

export interface SeparatorItem {
  type: 'separator'
}

export interface SubmenuItem {
  id: string
  label: string
  type: 'submenu'
  enabled?: boolean
  submenu: Array<CheckboxRadioItem|SeparatorItem|SubmenuItem|NormalItem>
}

export interface NormalItem {
  id: string
  label: string
  accelerator?: string
  type: 'normal'
  enabled?: boolean
}

export type AnyMenuItem = CheckboxRadioItem | SeparatorItem | SubmenuItem | NormalItem

// Any menu item w/o separators
export type InteractiveMenuItem = CheckboxRadioItem | SubmenuItem | NormalItem

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}
