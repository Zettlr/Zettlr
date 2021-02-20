import { ipcRenderer } from 'electron'

// Import the main.less file which imports CSS for KaTeX, Clarity, Tippy.JS, and
// the geometry for the application. This will be added to the HTML by WebPack
// automatically
import '../../less/main.less'

/**
 * Webpack provides the themes as JavaScript objects with two properties, use
 * and unuse. We have to declare this to TypeScript using this handy interface.
 */
interface ThemeLoader {
  use: () => void
  unuse: () => void
}

/**
 * This type holds all available themes for the application, which are
 * present in the availableThemes variable and can be indexed using Theme.
 */
type Theme = 'berlin'|'bielefeld'|'frankfurt'|'karl-marx-stadt'|'bordeaux'

/* eslint-disable @typescript-eslint/no-var-requires */
const availableThemes: Record<Theme, ThemeLoader> = {
  'berlin': require('../../less/theme-berlin/theme-main.less').default as ThemeLoader,
  'bielefeld': require('../../less/theme-bielefeld/theme-main.less').default as ThemeLoader,
  'frankfurt': require('../../less/theme-frankfurt/theme-main.less').default as ThemeLoader,
  'karl-marx-stadt': require('../../less/theme-karl-marx-stadt/theme-main.less').default as ThemeLoader,
  'bordeaux': require('../../less/theme-bordeaux/theme-main.less').default as ThemeLoader
}

/**
 * Global variable which holds the current theme
 *
 * @var {ThemeLoader|null}
 */
let currentTheme: ThemeLoader|null = null

/**
 * Listens for theming changes (main theme + custom CSS) and handles dark mode
 */
export default function registerThemes (): void {
  // Listen for configuration changes
  ipcRenderer.on('config-provider', (event, { command, payload }) => {
    if (command === 'update') {
      if (payload === 'display.theme') {
        // Switch the theme based on the current configuration value
        switchTheme(global.config.get('display.theme'))
      } else if (payload === 'darkMode') {
        // Switch to light/dark mode based on the configuration variable
        document.body.classList.toggle('dark', global.config.get('darkMode'))
      }
    }
  })

  // Listen for custom CSS changes
  ipcRenderer.on('css-provider', (evt, { command, payload }) => {
    if (command === 'get-custom-css-path') {
      setCustomCss(payload)
    }
  })

  // Initial theme change
  switchTheme(global.config.get('display.theme'))
  document.body.classList.toggle('dark', global.config.get('darkMode'))

  // Initial rendering of the Custom CSS
  ipcRenderer.invoke('css-provider', { command: 'get-custom-css-path' })
    .then(cssPath => setCustomCss(cssPath))
    .catch(e => console.error(e))

  // Create the custom stylesheet which includes certain system colours which
  // will be referenced by the components as necessary.
  ipcRenderer.invoke('appearance-provider', { command: 'get-accent-color' })
    .then((accentColor: string) => {
      // TODO: Currently this is not scalable, just an exploratory implementation!
      const style = document.createElement('style')
      // style.setAttribute('type', 'text/css')

      const color = '#' + accentColor.substr(0, 6)
      style.textContent = `:root { --system-accent-color:${color}; }`
      document.head.prepend(style)
      // if (style.sheet === null) {
      //   throw new Error('Style sheet was null?!?')
      // }
      // style.sheet.insertRule(`:root { --system-accent:${color}; }`, 0)
    })
    .catch(e => console.error(e))
}

/**
 * Switches to the theme given by newTheme
 *
 * @param   {Theme}  newTheme  The new theme name
 */
function switchTheme (newTheme: Theme): void {
  let themeToSwitchTo = availableThemes[newTheme]
  if (themeToSwitchTo !== currentTheme) {
    if (currentTheme != null) {
      // Unload old theme
      currentTheme.unuse()
    }
    // Load the new theme
    themeToSwitchTo.use()
    currentTheme = themeToSwitchTo
  }
}

/**
 * (Re)loads the custom CSS
 *
 * @param   {string}  cssPath  The path to the file
 */
function setCustomCss (cssPath: string): void {
  const formerCustomCSS = document.getElementById('custom-css-link')
  if (formerCustomCSS !== null) {
    // If appicable, remove a given previous custom CSS
    formerCustomCSS.parentElement?.removeChild(formerCustomCSS)
  }

  // (Re)laod the custom CSS
  let link = document.createElement('link')
  link.rel = 'stylesheet'
  link.setAttribute('href', 'safe-file://' + cssPath)
  link.setAttribute('type', 'text/css')
  link.setAttribute('id', 'custom-css-link')
  document.head.appendChild(link)
}
