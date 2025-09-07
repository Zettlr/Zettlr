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
 * Defines a SystemColour interface as is being returned by the appearance provider
 */
interface SystemColour {
  accent: string
  contrast: string
}

/**
 * Listens for theming changes (main theme + custom CSS) and handles dark mode
 */
export default function registerThemes (): void {
  // Listen for configuration changes
  ipcRenderer.on('config-provider', (event, { command, payload }) => {
    if (command === 'update' && payload === 'darkMode') {
      // Switch to light/dark mode based on the configuration variable
      switchDarkLightTheme()
    }
  })

  // Listen for custom CSS changes
  ipcRenderer.on('css-provider', (evt, { command, payload }: { command: 'get-custom-css-path', payload: string }) => {
    if (command === 'get-custom-css-path') {
      setCustomCss(payload)
    }
  })

  // Initial theme change/setup
  switchDarkLightTheme()

  // Initial rendering of the Custom CSS
  ipcRenderer.invoke('css-provider', { command: 'get-custom-css-path' })
    .then((cssPath: string) => setCustomCss(cssPath))
    .catch(e => console.error(e))

  // Create the custom stylesheet which includes certain system colours which
  // will be referenced by the components as necessary.
  setSystemCss()
}

/**
 * Performs necessary actions when switching the theme to dark/light
 */
function switchDarkLightTheme (): void {
  const isDarkMode: boolean = window.config.get('darkMode')
  document.body.classList.toggle('dark', isDarkMode)
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

  // Due to the colons in the drive letters on Windows, the pathname will
  // look like this: /C:/Users/Documents/test.jpg
  // See: https://github.com/Zettlr/Zettlr/issues/5489
  if (/^[A-Z]:/i.test(cssPath)) {
    cssPath = `/${cssPath}`
  }

  // (Re)load the custom CSS
  let link = document.createElement('link')
  link.rel = 'stylesheet'
  link.setAttribute('href', (new URL('safe-file://' + cssPath)).toString())
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

      // We can put all CSS variables we would like to output into this map. All
      // will be appended to the stylesheet below.
      const variables = new Map<string, string>()
      variables.set('--system-accent-color', '#' + accentColor.accent)
      variables.set('--system-accent-color-contrast', '#' + accentColor.contrast)

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
