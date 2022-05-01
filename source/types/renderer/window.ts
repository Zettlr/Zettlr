export interface WindowTab {
  icon: string
  id: string
  controls: string
  label: string
}

/**
 * A ToolbarControl is anything that can be displayed on a window's toolbar
 */
export interface ToolbarControl {
  /**
   * Denotes the toolbar control type
   */
  type: 'button'|'toggle'|'three-way-toggle'|'ring'|'search'|'spacer'|'text'
  /**
   * An HTML ID string
   */
  id: string
  /**
   * This property is required for buttons. Corresponds to available shapes by
   * the clarity icon package
   */
  icon?: string
  /**
   * If set to true, display the clarity icon's badge
   */
  badge?: boolean
  /**
   * An HTML title string
   */
  title?: string
  /**
   * A label can describe a button
   */
  label?: string
  /**
   * An optional class
   */
  class?: string
  /**
   * Spacers can optionally have a size of 1, 3, or 5
   */
  size?: '5x'|'3x'|'1x'
  /**
   * This property can be used to align the content of a text control
   */
  align?: 'center'|'left'|'right'
  /**
   * The content string for a text control
   */
  content?: string
  /**
   * Determines the color of a ring progress meter
   */
  colour?: string
  /**
   * Denotes the percentage of fill of a ring progress meter
   */
  progressPercent?: number
  /**
   * Must be given for a three way toggle. Denotes ID, title, and icon for the
   * first icon/state
   */
  stateOne?: {
    id: string
    title: string
    icon: string
  }
  /**
   * Must be given for a three way toggle. Denotes ID, title, and icon for the
   * second icon/state
   */
  stateTwo?: {
    id: string
    title: string
    icon: string
  }
  /**
   * Must be boolean for a regular toggle control, and either stateOne.id or
   * stateTwo.id or undefined for a three way toggle.
   */
  initialState?: string|boolean|undefined
  /**
   * A search control can have this optional placeholder string
   */
  placeholder?: string
  /**
   * A search control can have this callback which will be executed whenever the
   * control's contents change
   *
   * @param   {string}  value  The new value of the search field
   */
  onInputHandler?: (value: string) => void
  /**
   * A search control can have this callback which will be executed whenever the
   * control's contents are submitted on Enter
   *
   * @param   {string}  value  The current value of the search field
   */
  onSubmitHandler?: (value: string) => void
  /**
   * A text control can be either strong of emphasised
   */
  style?: 'strong'|'emphasis'
  /**
   * If set to false, hide the button
   */
  visible?: boolean
}

/**
 * This interface represents a Tabbar control
 */
export interface TabbarControl {
  /**
   * This should match a Clarity icon shape
   */
  icon: string
  /**
   * A unique ID for the tab
   */
  id: string
  /**
   * The target ID of whichever tab this represents (for a11y purposes)
   */
  target: string
  /**
   * A label, may be displayed.
   */
  label: string
}
