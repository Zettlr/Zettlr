/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        keyboardShortcut
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function makes it easier to hook keyboard events to the
 *                  table editor.
 *
 * END HEADER
 */

/**
 * Returns boolean if the provided keyboard shortcut matches the event.
 *
 * @param   {string}         shortcut        The shortcut, in 'Modifier+Key'-
 *                                           syntax. Replace '+' with 'Plus',
 *                                           otherwise use the `event.key`
 *                                           property value.
 * @param   {KeyboardEvent}  event           The keyboard event to check
 * @param   {boolean}        preventDefault  Controls whether the function calls
 *                                           `preventDefault` for you (default).
 *
 * @return  {boolean}                        Returns true if the keyboard
 *                                           shortcut matches the event
 *                                           configuraton.
 */
export function keyboardShortcut (shortcut: string, event: KeyboardEvent, preventDefault = true): boolean {
  const cmd = process.platform === 'darwin' && event.metaKey
  const ctrl = process.platform !== 'darwin' && event.ctrlKey
  const shift = event.shiftKey
  const alt = event.altKey

  let keys = shortcut
    .toLowerCase()
    .split('+')
    .map(key => {
      if (key === 'plus') {
        return '+'
      }
      return key
    })

  const hasCmdOrCtrl = keys.includes('cmdorctrl')
  const hasCmd = keys.includes('cmd')
  const hasCtrl = keys.includes('ctrl')
  const hasShift = keys.includes('shift')
  const hasAlt = keys.includes('alt')

  keys = keys.filter(key => ![ 'cmd', 'ctrl', 'cmdorctrl', 'shift', 'alt' ].includes(key))

  if (hasCmdOrCtrl && !cmd && !ctrl) {
    return false
  } else if (hasCmd && !cmd) {
    return false
  } else if (hasCtrl && !ctrl) {
    return false
  }

  if ((hasShift && !shift) || (hasAlt && !alt)) {
    return false
  }

  if (keys.includes(event.key.toLowerCase())) {
    if (preventDefault) {
      event.preventDefault()
    }
    return true
  }

  return false
}
