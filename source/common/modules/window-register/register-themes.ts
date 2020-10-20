import ThemeHandler from '../../theme-handler'
import { ipcRenderer } from 'electron'

// Holds the global theme handler
const themeHandler = new ThemeHandler()

/**
 * (Re)sets the custom CSS
 *
 * @param   {string}  cssPath  The path to the file
 */
function setCustomCss (cssPath: string): void {
  const formerCustomCSS = document.getElementById('custom-css-link')
  if (formerCustomCSS !== null) {
    formerCustomCSS.parentElement?.removeChild(formerCustomCSS)
  }

  let link = document.createElement('link')
  link.rel = 'stylesheet'
  link.setAttribute('href', 'safe-file://' + cssPath)
  link.setAttribute('type', 'text/css')
  link.setAttribute('id', 'custom-css-link')
  document.head.appendChild(link)
}

/**
 * Listens for theming changes (main theme + custom CSS) and handles dark mode
 */
export default function registerThemes (): void {
  // Listen for theme changes
  ipcRenderer.on('config-provider', (event, message) => {
    const { command } = message

    if (command === 'update') {
      themeHandler.switchTo(global.config.get('display.theme'))
      const shouldBeDark: boolean = global.config.get('darkTheme')
      if (shouldBeDark) {
        document.body.classList.add('dark')
      } else {
        document.body.classList.remove('dark')
      }
    }
  })

  // Listen for custom CSS changes
  ipcRenderer.on('css-provider', (evt, message) => {
    const { command } = message
    if (command === 'get-custom-css-path') {
      setCustomCss(message.payload)
    }
  })

  // Initial theme change
  themeHandler.switchTo(global.config.get('display.theme'))
  if (global.config.get('darkTheme') as boolean) {
    document.body.classList.add('dark')
  }

  // Get the custom CSS initially
  ipcRenderer.send('css-provider', {
    command: 'get-custom-css-path',
    payload: undefined
  })
}
