/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Theme registration routines
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file loads in the main CSS files into the renderer
 *                  process and enables switching between themes.
 *
 * END HEADER
 */

// Import the main.less file which imports CSS for KaTeX, Clarity, Tippy.JS, and
// the geometry for the application. This will be added to the HTML by Webpack
// automatically
import './assets/main.less'

const ipcRenderer = window.ipc

/**
 * Webpack provides the themes as JavaScript objects with two properties, use
 * and unuse. We have to declare this to TypeScript using this handy interface.
 */
interface ThemeLoader {
  use: () => void
  unuse: () => void
}

/**
 * Defines a SystemColour interface as is being returned by the appearance provider
 */
interface SystemColour {
  accent: string
  contrast: string
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
        switchTheme(window.config.get('display.theme'))
      } else if (payload === 'darkMode') {
        // Switch to light/dark mode based on the configuration variable
        document.body.classList.toggle('dark', window.config.get('darkMode'))
      } else if (payload === 'display.useSystemAccentColor') {
        // The accent color setting has been changed, so re-set the customCSS
        setSystemCss()
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
  switchTheme(window.config.get('display.theme'))
  document.body.classList.toggle('dark', window.config.get('darkMode'))

  // Initial rendering of the Custom CSS
  ipcRenderer.invoke('css-provider', { command: 'get-custom-css-path' })
    .then(cssPath => setCustomCss(cssPath))
    .catch(e => console.error(e))

  // Create the custom stylesheet which includes certain system colours which
  // will be referenced by the components as necessary.
  setSystemCss()
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
    // If applicable, remove a given previous custom CSS
    formerCustomCSS.parentElement?.removeChild(formerCustomCSS)
  }

  // (Re)load the custom CSS
  let link = document.createElement('link')
  link.rel = 'stylesheet'
  link.setAttribute('href', 'safe-file://' + cssPath)
  link.setAttribute('type', 'text/css')
  link.setAttribute('id', 'custom-css-link')
  document.head.appendChild(link)
}

/**
 * (Re)loads the system CSS
 */
function setSystemCss (): void {
  // Remove any former system CSS stylesheet, if applicable
  const formerSystemCSS = document.getElementById('system-css')
  if (formerSystemCSS !== null) {
    formerSystemCSS.parentElement?.removeChild(formerSystemCSS)
  }

  ipcRenderer.invoke('appearance-provider', { command: 'get-accent-color' })
    .then((accentColor: SystemColour) => {
      const style = document.createElement('style')
      style.setAttribute('id', 'system-css')

      const useSystemAccent: boolean = window.config.get('display.useSystemAccentColor')

      // We can put all CSS variables we would like to output into this map. All
      // will be appended to the stylesheet below.
      const variables = new Map<string, string>()
      if (useSystemAccent) {
        variables.set('--system-accent-color', '#' + accentColor.accent)
        variables.set('--system-accent-color-contrast', '#' + accentColor.contrast)
      } else {
        variables.set('--system-accent-color', 'var(--c-primary)')
        variables.set('--system-accent-color-contrast', 'var(--c-primary-contrast)')
      }

      // Why do we format it nicely? I don't know, but I like to keep things tidy.
      style.textContent = ':root {\n'
      for (const [ key, val ] of variables.entries()) {
        style.textContent += `  ${key}: ${val};\n`
      }
      style.textContent += '}'
      document.head.prepend(style)
    })
    .catch(e => console.error(e))
}
