import { spawn } from 'child_process'
// import { trans } from '../../common/i18n-main'

/**
 * Check if system supports a Tray.
 *
 * Returns true on Windows and MacOS.
 * Returns true on Linux with Gnome desktop if Gnome Extension
 * 'KStatusNotifierItem/AppIndicator Support' is installed, otherwise throws
 * an {Error} with the reason why.
 * Returns true on Linux with other desktops. e.g. KDE, XFCE, etc.
 *
 * @return {*}  {Promise<boolean>} If supported, returns true. Never returns
 *              false.
 * @throws {Error} Details why the Tray is not supported; or
 *                 Details the error if an error occurred while checking Tray
 *                 support.
 */
export default async function isTraySupported (): Promise<boolean> {
  const isLinux = process.platform === 'linux'
  if (isLinux && process.env.XDG_CURRENT_DESKTOP === 'GNOME') {
    return await new Promise<boolean>((resolve, reject) => {
      const shellProcess = spawn('gsettings', [ 'get', 'org.gnome.shell', 'enabled-extensions' ])
      let out = ''

      shellProcess.stdout.on('data', (data: Buffer | string) => {
        out += data.toString()
      })

      shellProcess.on('close', (code, _signal) => {
        if (code !== 0) {
          // TODO: Currently, this is a race condition because the translations
          // will only be loaded after this code has run, so on systems which
          // don't support a tray, we can't display a localized message as of
          // now. We have to revisit this later on.
          // reject(new Error(trans('Tray is not supported. Gnome Extension &quot;KStatusNotifierItem/AppIndicator Support&quot; is required for Tray support on the Gnome Desktop.')))
          reject(new Error('Your operating system does not support a tray.'))
        } else if (out.includes("'appindicatorsupport@rgcjonas.gmail.com'")) {
          resolve(true)
        } else {
          // reject(new Error(trans('Tray is not supported. Gnome Extension &quot;KStatusNotifierItem/AppIndicator Support&quot; is required for Tray support on the Gnome Desktop.')))
          reject(new Error('Your operating system does not support a tray.'))
        }
      })

      // Reject on errors.
      shellProcess.on('error', (err) => {
        reject(err)
      })
    })
  } else {
    return true
  }
}
