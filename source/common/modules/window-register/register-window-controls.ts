import { ipcRenderer } from 'electron'

/**
 * Registers the window controls for the platform
 */
export default function registerWindowControls (shouldShowWindowControls: boolean): void {
  // First, determine if the window controls should be shown at all
  const usesNativeAppearance: boolean = global.config.get('window.nativeAppearance')
  if (usesNativeAppearance || !shouldShowWindowControls) return

  // Show the controls
  document.body.classList.add('show-window-controls')

  // Hook onto the event listeners
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

  // Sometimes, the main process fires back a message with regard to the status
  ipcRenderer.on('window-controls', (event, message) => {
    const { command } = message
    // win-size-changed is emitted by main, whereas get-maximised-status is
    // sent from this module to initially get the status
    if ([ 'win-size-changed', 'get-maximised-status' ].includes(command)) {
      const { payload } = message
      // Reflect the maximisation flag in a body-class (payload is true if the
      // window is maximised)
      document.body.classList.toggle('is-maximised', payload)
    }
  })

  // Get the initial windowed/maximised-status
  ipcRenderer.send('window-controls', 'get-maximised-status')
}
