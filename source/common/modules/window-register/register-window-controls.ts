import { ipcRenderer } from 'electron'

/**
 * Registers the window controls for the platform
 */
export default function registerWindowControls (): void {
  const shouldUseNativeAppearance: boolean = global.config.get('window.nativeAppearance')
  if (shouldUseNativeAppearance) return

  // Show the controls on any non-darwin platform
  document.body.classList.add('show-window-controls')

  const minimise = document.querySelector('.window-controls .minimise')
  const resize = document.querySelector('.window-controls .resize')
  const close = document.querySelector('.window-controls .close')

  minimise?.addEventListener('click', (event) => {
    ipcRenderer.send('window-controls', 'win-minimise')
  })
  resize?.addEventListener('click', (event) => {
    ipcRenderer.send('window-controls', 'win-maximise')
  })
  close?.addEventListener('click', (event) => {
    ipcRenderer.send('window-controls', 'win-close')
  })

  ipcRenderer.on('window-controls', (event, message) => {
    console.log('Window controls!', message)
    const { command } = message
    // win-size-changed is emitted by main, whereas get-maximised-status is
    // sent from this module to initially get the status
    if ([ 'win-size-changed', 'get-maximised-status' ].includes(command)) {
      const { payload } = message
      // Reflect the maximisation flag in a body-class
      if (payload === true) {
        document.body.classList.add('is-maximised')
      } else {
        document.body.classList.remove('is-maximised')
      }
    }
  })

  // Get the initial windowed/maximised-status
  ipcRenderer.send('window-controls', 'get-maximised-status')
}
