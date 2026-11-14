/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        D-Bus mechanisms for appearance-related functions
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a set of D-Bus routines that can be used to extract
 *                  and listen to changes of the accent color.
 *
 * END HEADER
 */

import dbus from '@jellybrick/dbus-next'

/**
 * Checks if the process can connect to the D/Bus Session Bus. NOTE that this
 * does not imply that specific interfaces or objects exist on this bus.
 *
 * @return  {Promise<boolean>}  Whether the D-Bus system appears to be running.
 */
export async function isDBusAvailable (): Promise<boolean> {
  try {
    const bus = dbus.sessionBus()
    bus.disconnect()
    return true
  } catch (err: unknown) {
    return false
  }
}

/**
 * Turns a three-component RGB color into a hex string.
 *
 * @param   {number}  color  The color components
 *
 * @return  {string}         The hex representation
 */
function tripletRGBToHex (color: [number, number, number]): string  {
  return color
    .map(component => {
      return Math.floor(component * 255).toString(16).padStart(2, '0')
    })
    .join('')
}

/**
 * Retrieves the accent-color value from the D-Bus system, already turned into
 * hexadecimal format `rrggbb`. Throws an error if any of the required
 * components does not exist.
 * 
 * Assumes the following:
 * 
 * * The D-Bus is running
 * * The session Bus contains the object `org.freedesktop.portal.Desktop`
 * * The object has an interface `org.freedesktop.portal.Settings`
 * * That interface can read the value for key `accent-color` with signature
 *   `(ddd)` that returns an array of three numbers.
 *
 * @return  {Promise<string>}  The hexadecimal color in `rrggbb`.
 */
export async function retrieveAccentColorFromDBus (): Promise<string> {
  try {
    const bus = dbus.sessionBus()
    const proxy = await bus.getProxyObject('org.freedesktop.portal.Desktop', '/org/freedesktop/portal/desktop')
    const settings = proxy.getInterface('org.freedesktop.portal.Settings')
    // @ts-expect-error The Interface types don't allow for custom methods that
    // will be instantiated based on the protocol of that interface, but ReadOne
    // is a valid function on the Settings interface, see: https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.Settings.html#org-freedesktop-portal-settings-readone
    const { signature, value }: dbus.Variant = await settings.ReadOne('org.freedesktop.appearance', 'accent-color')
    // Now, we need to validate the accent color, because the Variant is merely
    // a container.
    if (signature !== '(ddd)') {
      bus.disconnect()
      throw new Error(`The accentColor setting returned by dbus had the wrong signature: ${signature}`)
    }

    if (!Array.isArray(value) || !value.every(c => typeof c === 'number') || value.length !== 3) {
      bus.disconnect()
      throw new Error(`The accentColor setting returned by dbus had the wrong type: ${value}`)
    }

    // Signature checks out -> Convert the value of shape `[r, g, b]` to hex.
    bus.disconnect()
    return tripletRGBToHex(value as [number, number, number])
  } catch (err: unknown) {
    // There seems to be no dbus support on this system.
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Could not retrieve accent-color value: ${message}`)
  }
}

/**
 * Listens on the D-Bus system for accent color changes.
 *
 * @param  {void}  callback  The callback, will be called when the accent color has changed.
 */
export async function listenToAccentColorChangesFromDBus (callback: (newColor: string) => void) {
  const bus = dbus.sessionBus()
  const proxy = await bus.getProxyObject('org.freedesktop.portal.Desktop', '/org/freedesktop/portal/desktop')
  const settings = proxy.getInterface('org.freedesktop.portal.Settings')
  // @ts-expect-error The following is the correct typing of the arguments coming out
  // of SettingChanged, see https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.Settings.html#settingchanged
  settings.on('SettingChanged', (ns: string, key: string, value: dbus.Variant) => {
    if (ns === 'org.freedesktop.appearance' && key === 'accent-color' && value.signature === '(ddd)') {
      callback(tripletRGBToHex(value.value as [number, number, number]))
    }
  })
}

