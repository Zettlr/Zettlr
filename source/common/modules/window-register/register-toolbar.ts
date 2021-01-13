import { ipcRenderer } from 'electron'

export interface ToolbarTextControl {
  type: 'text'
  content: string
  style?: 'strong'|'emphasis'
  onClickHandler?: () => void // Optional click handler
}

export interface ToolbarToggleControl {
  type: 'toggle'
  label: string // Optional text label (empty string if icon-only is wanted)
  icon?: string // Optional icon (one of both needs to be set)
  activeClass?: string // An optional active class applied
  initialState?: 'active'|'inactive' // Is the toggle activated in the beginning?
  onClickHandler?: (state: boolean) => void
}

export interface ToolbarButtonControl {
  type: 'button'
  label: string // Optional text label (empty string if icon-only is wanted)
  icon?: string // Optional icon (one of both needs to be set)
  onClickHandler?: () => void
}

export interface ToolbarSpacerControl {
  type: 'spacer'
  size?: '1x'|'3x'|'5x' // Spacer size
}

export interface ToolbarSearchControl {
  type: 'search'
  placeholder: string
  onInputHandler?: (value: string) => void
  onSubmitHandler?: (value: string) => void
}

export type ToolbarControl =
  ToolbarTextControl | ToolbarToggleControl | ToolbarSpacerControl | ToolbarSearchControl | ToolbarButtonControl

/**
 * For easy access, stored all toolbar elements
 *
 * @var {Element[]}
 */
let toolbarElements: Element[] = []

/**
 * Listen to shortcuts from the menu provider
 *
 * @param   {string}  shortcut  The shortcut to be triggered
 */
ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'search') {
    // Focus the first search, if applicable
    const searchControl = toolbarElements.find(elem => elem.classList.contains('searchbar'))
    searchControl?.querySelector('input')?.focus()
  }
})

/**
 * Sets the toolbar with the given controls
 *
 * @param   {ToolbarControl[]}  toolbarControls  The controls for the toolbar
 */
export default function registerToolbar (toolbarControls: ToolbarControl[]): void {
  const toolbar = document.getElementById('toolbar')
  if (toolbar === null) {
    throw new Error('Configuration indicated the registration should handle the toolbar, but none was found.')
  }

  toolbar.setAttribute('role', 'toolbar')

  // Preset the toolbar
  toolbar.innerHTML = ''
  toolbarElements = []

  for (const control of toolbarControls) {
    const elem = document.createElement('div')
    if (control.type === 'text') {
      // We have a text control
      elem.textContent = control.content
      elem.classList.add('text')
      elem.setAttribute('role', 'presentation')
      if (control.style !== undefined) {
        if (control.style === 'strong') {
          elem.style.fontWeight = 'bold'
        } else if (control.style === 'emphasis') {
          elem.style.fontStyle = 'italics'
        }
      }
    } else if (control.type === 'toggle' || control.type === 'button') {
      // Toggle button
      elem.classList.add('button') // Behaves mostly like a button
      elem.setAttribute('role', 'button') // ARIA role
      // Should we activate the toggle now?
      if (control.type === 'toggle' && control?.initialState === 'active') {
        elem.setAttribute('aria-pressed', 'true')
        if (control.activeClass !== undefined) {
          elem.classList.add(control.activeClass)
        }
      } else {
        elem.setAttribute('aria-pressed', 'false')
      }
      // Determine if we have an icon
      if (control.icon !== undefined) {
        const icon = document.createElement('clr-icon')
        icon.setAttribute('alt', control.icon)
        icon.setAttribute('shape', control.icon)
        elem.appendChild(icon)
      }
      // Now the label
      elem.appendChild(document.createTextNode(control.label))
    } else if (control.type === 'spacer') {
      elem.setAttribute('role', 'presentation')
      switch (control.size) {
        case '1x':
          elem.classList.add('spacer-1x')
          break
        case '3x':
          elem.classList.add('spacer-3x')
          break
        case '5x':
          elem.classList.add('spacer-5x')
          break
        default:
          elem.classList.add('spacer')
      }
    } else if (control.type === 'search') {
      const input = document.createElement('input')
      input.placeholder = control.placeholder
      input.type = 'search'
      input.setAttribute('role', 'search')

      elem.setAttribute('role', 'search') // ARIA role
      elem.classList.add('searchbar')
      elem.appendChild(input)

      input.addEventListener('keyup', (event) => {
        if (control.onInputHandler !== undefined) {
          control.onInputHandler(input.value)
        }

        if (event.key === 'Enter' && control.onSubmitHandler !== undefined) {
          control.onSubmitHandler(input.value)
        }
      })
    }

    // Afterwards, activate event hooks for this element
    elem.addEventListener('click', (event) => {
      if (control.type === 'toggle' && control.onClickHandler !== undefined) {
        const state = elem.getAttribute('aria-pressed')
        if (state === 'true') { // Element was active -> set inactive
          elem.setAttribute('aria-pressed', 'false')
          if (control.activeClass !== undefined) {
            elem.classList.remove(control.activeClass)
          }
          control.onClickHandler(false)
        } else {
          // Element was inactive -> activate
          elem.setAttribute('aria-pressed', 'true')
          if (control.activeClass !== undefined) {
            elem.classList.add(control.activeClass)
          }
          control.onClickHandler(true)
        }
      } else if (control.type === 'button' && control.onClickHandler !== undefined) {
        control.onClickHandler()
      }
    })

    // After everything is done, add the toolbar control
    toolbar.appendChild(elem)
    toolbarElements.push(elem)
  }
}
