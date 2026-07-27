/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Themes
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Zettlr editor themes.
 *
 * END HEADER
 */

import { editorTheme } from './editor'
import { codeTheme } from './code'

export { darkMode, useDarkModeEditor } from './dark-mode'

export { themeBerlinLight, themeBerlinDark } from './themes/berlin'
export { themeBielefeldLight, themeBielefeldDark } from './themes/bielefeld'
export { themeBordeauxLight, themeBordeauxDark } from './themes/bordeaux'
export { themeFrankfurtLight, themeFrankfurtDark } from './themes/frankfurt'
export { themeKarlMarxStadtLight, themeKarlMarxStadtDark } from './themes/karl-marx-stadt'

export const mainThemes = [
  editorTheme,
  codeTheme
]
