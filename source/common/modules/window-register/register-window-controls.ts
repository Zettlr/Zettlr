import { ipcRenderer } from 'electron'
import renderTemplate from '../../../renderer/util/render-template'

const template = renderTemplate(`
<div class="window-controls">
  <div class="minimise">
    <svg x="0px" y="0px" viewBox="0 0 10 1">
      <rect fill="#000000" width="10" height="1"></rect>
    </svg>
  </div>
  <div class="resize">
    <svg class="fullscreen-svg" x="0px" y="0px" viewBox="0 0 10 10">
      <path fill="#000000" d="M 0 0 L 0 10 L 10 10 L 10 0 L 0 0 z M 1 1 L 9 1 L 9 9 L 1 9 L 1 1 z "/>
    </svg>

    <svg class="maximise-svg" x="0px" y="0px" viewBox="0 0 10 10">
      <mask id="Mask">
        <rect fill="#FFFFFF" width="10" height="10"></rect>
        <path fill="#000000" d="M 3 1 L 9 1 L 9 7 L 8 7 L 8 2 L 3 2 L 3 1 z"/>
        <path fill="#000000" d="M 1 3 L 7 3 L 7 9 L 1 9 L 1 3 z"/>
      </mask>
      <path fill="#000000" d="M 2 0 L 10 0 L 10 8 L 8 8 L 8 10 L 0 10 L 0 2 L 2 2 L 2 0 z" mask="url(#Mask)"/>
    </svg>
  </div>
  <div class="close">
    <svg x="0px" y="0px" viewBox="0 0 10 10">
      <polygon fill="#000000" points="10,1 9,0 5,4 1,0 0,1 4,5 0,9 1,10 5,6 9,10 10,9 6,5"></polygon>
    </svg>
  </div>
</div>`)

/**
 * Registers the window controls for the platform
 */
export default function registerWindowControls (shouldShowWindowControls: boolean): void {
  // First, determine if the window controls should be shown at all
  const usesNativeAppearance: boolean = global.config.get('window.nativeAppearance')
  if (usesNativeAppearance || !shouldShowWindowControls) return

  // Show the controls and tell other elements they're there.
  document.body.appendChild(template)
  document.body.classList.add('show-window-controls')

  // Hook onto the event listeners
  const minimise = document.querySelector('.window-controls .minimise')
  const resize = document.querySelector('.window-controls .resize')
  const close = document.querySelector('.window-controls .close')

  minimise?.addEventListener('click', (event) => {
    ipcRenderer.send('window-controls', { command: 'win-minimise' })
  })
  resize?.addEventListener('click', (event) => {
    ipcRenderer.send('window-controls', { command: 'win-maximise' })
  })
  close?.addEventListener('click', (event) => {
    ipcRenderer.send('window-controls', { command: 'win-close' })
  })

  // Sometimes, the main process fires back a message with regard to the status
  ipcRenderer.on('window-controls', (event, message) => {
    const { command } = message
    // win-size-changed is emitted by main, whereas get-maximised-status is
    // sent from this module to initially get the status
    if (command === 'get-maximised-status') {
      const { payload } = message
      // Reflect the maximisation flag in a body-class (payload is true if the
      // window is maximised)
      document.body.classList.toggle('is-maximised', payload)
    }
  })

  // Get the initial windowed/maximised-status
  ipcRenderer.send('window-controls', { command: 'get-maximised-status' })
}
