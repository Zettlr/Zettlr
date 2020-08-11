interface ThemeLoader {
  use: () => void
  unuse: () => void
}

export type Theme = 'berlin' | 'bielefeld' | 'frankfurt' | 'karl-marx-stadt' | 'bordeaux'

export default class ThemeHandler {
  /* eslint-disable @typescript-eslint/no-var-requires */
  themes: Record<Theme, ThemeLoader> = {
    'berlin': require('./assets/less/theme-berlin/theme-main.less') as ThemeLoader,
    'bielefeld': require('./assets/less/theme-bielefeld/theme-main.less') as ThemeLoader,
    'frankfurt': require('./assets/less/theme-frankfurt/theme-main.less') as ThemeLoader,
    'karl-marx-stadt': require('./assets/less/theme-karl-marx-stadt/theme-main.less') as ThemeLoader,
    'bordeaux': require('./assets/less/theme-bordeaux/theme-main.less') as ThemeLoader
  }

  currentTheme: ThemeLoader | null = null

  switchTo (theme: Theme): void {
    let newTheme = this.themes[theme]
    if (newTheme !== this.currentTheme) {
      if (this.currentTheme != null) {
        // Unload old theme
        this.currentTheme.unuse()
      }
      // Load the new theme
      newTheme.use()
      this.currentTheme = newTheme
    }
  }
}
