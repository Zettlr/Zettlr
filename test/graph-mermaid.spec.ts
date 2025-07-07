import assert from 'assert'
import 'mocha'

function hasThemeConfig (graphData: string): boolean {
  //Check for theme directive in various formats
  const themePatterns = [
    /%%\{[^}]*(['"]?\btheme\b['"]?)\s*:/i,  // 'theme': or "theme": or theme: inside %%{ ... }%%
    /%%\s*theme\s*:/i,                      // %% theme: dark
    /^[ \t]*theme\s*:/im                    // theme: dark (anywhere at line start, multiline)
  ]
  return themePatterns.some(pattern => pattern.test(graphData))
}

describe('hasThemeConfig', function () {
  it('should detect theme directive in %%{theme: ...}%% format', function () {
    assert.strictEqual(hasThemeConfig('%%{theme: "dark"}%%'), true)
    assert.strictEqual(hasThemeConfig('%%{theme: "default"}%%'), true)
    assert.strictEqual(hasThemeConfig('%%{theme: "base"}%%'), true)
    assert.strictEqual(hasThemeConfig("%%{theme: 'dark'}%%"), true)
    assert.strictEqual(hasThemeConfig('%%{ theme: "dark" }%%'), true)
  })

  it('should detect theme directive in %%{config: {theme: ...}}%% format', function () {
    assert.strictEqual(hasThemeConfig('%%{config: {theme: "dark"}}%%'), true)
    assert.strictEqual(hasThemeConfig('%%{config: {theme: "default"}}%%'), true)
    assert.strictEqual(hasThemeConfig('%%{ config: { theme: "dark" } }%%'), true)
    assert.strictEqual(hasThemeConfig('%%{config:{theme:"dark"}}%%'), true)
  })

  it('should detect theme directive in %% theme: ... format', function () {
    assert.strictEqual(hasThemeConfig('%% theme: dark'), true)
    assert.strictEqual(hasThemeConfig('%% theme: default'), true)
    assert.strictEqual(hasThemeConfig('%%theme: dark'), true)
    assert.strictEqual(hasThemeConfig('%% theme:dark'), true)
  })


  it('should detect theme directive in context-appropriate standalone theme: ... format', function () {
    assert.strictEqual(hasThemeConfig('graph TD\ntheme: dark\nA --> B'), true)
    assert.strictEqual(hasThemeConfig('sequenceDiagram\ntheme: default\nAlice->>Bob: Hi'), true)
    
    // Test multiline with theme at start
    const multilineWithTheme = `theme: dark
    graph TD
    A --> B`
    assert.strictEqual(hasThemeConfig(multilineWithTheme), true)
  })

  it('should be case insensitive', function () {
    assert.strictEqual(hasThemeConfig('%%{THEME: "dark"}%%'), true)
    assert.strictEqual(hasThemeConfig('%%{Theme: "dark"}%%'), true)
    assert.strictEqual(hasThemeConfig('%% THEME: dark'), true)
    assert.strictEqual(hasThemeConfig('THEME: dark'), true)
  })

  it('should detect theme in multiline content', function () {
    const multilineContent = `
      graph TD
      %%{theme: "dark"}%%
      A --> B
    `
    assert.strictEqual(hasThemeConfig(multilineContent), true)
  })

  it('should detect theme in complex config blocks', function () {
    const complexConfig = `
      %%{config: {
        theme: "dark",
        themeVariables: {
          primaryColor: "#ff0000"
        }
      }}%%
    `
    assert.strictEqual(hasThemeConfig(complexConfig), true)
  })

  it('should return false for content without theme configuration', function () {
    assert.strictEqual(hasThemeConfig('graph TD\nA --> B'), false)
    assert.strictEqual(hasThemeConfig('flowchart LR\nStart --> End'), false)
    assert.strictEqual(hasThemeConfig('%%{startOnLoad: false}%%'), false)
    assert.strictEqual(hasThemeConfig('%% This is a comment'), false)
    assert.strictEqual(hasThemeConfig('sequenceDiagram\nAlice->>Bob: Hello'), false)
  })

  it('should return false for empty or whitespace-only content', function () {
    assert.strictEqual(hasThemeConfig(''), false)
    assert.strictEqual(hasThemeConfig('   '), false)
    assert.strictEqual(hasThemeConfig('\n\n'), false)
    assert.strictEqual(hasThemeConfig('\t'), false)
  })

  //More conservative expectations for theme-like words
  it('should return false for content with theme-like words but not actual theme config', function () {
    assert.strictEqual(hasThemeConfig('This is a themed diagram'), false)
    assert.strictEqual(hasThemeConfig('graph TD\nthemed --> node'), false)
    assert.strictEqual(hasThemeConfig('%% Use dark theme manually'), false)
    assert.strictEqual(hasThemeConfig('themeVariables: {primaryColor: "#ff0000"}'), false)
  })

  //Only test malformed configurations
  it('should handle some malformed theme configurations', function () {
    assert.strictEqual(hasThemeConfig('%%{theme: "dark"}%%'), true) //Well-formed for reference
    assert.strictEqual(hasThemeConfig('%%{theme: "unclosed'), true) //Missing closing quote and brace
  })

  it('should handle edge cases with special characters', function () {
    assert.strictEqual(hasThemeConfig('%%{theme: "dark-mode"}%%'), true)
    assert.strictEqual(hasThemeConfig('%%{theme: "theme_custom"}%%'), true)
    assert.strictEqual(hasThemeConfig('%%{theme: "123"}%%'), true)
    assert.strictEqual(hasThemeConfig('%%{theme: ""}%%'), true)
  })

  it('should handle nested configuration objects', function () {
    const nestedConfig = `
      %%{config: {
        flowchart: {
          useMaxWidth: false
        },
        theme: "dark"
      }}%%
    `
    assert.strictEqual(hasThemeConfig(nestedConfig), true)
  })

  it('should handle multiple theme configurations', function () {
    const multipleThemes = `
      %%{theme: "dark"}%%
      graph TD
      A --> B
      %%{config: {theme: "default"}}%%
    `
    assert.strictEqual(hasThemeConfig(multipleThemes), true)
  })

  it('should handle theme configuration with comments', function () {
    const withComments = `
      %% This sets the theme
      %%{theme: "dark"}%%
      %% End of theme config
    `
    assert.strictEqual(hasThemeConfig(withComments), true)
  })

  it('should handle very long content with theme config', function () {
    const longContent = 'A'.repeat(1000) + '%%{theme: "dark"}%%' + 'B'.repeat(1000)
    assert.strictEqual(hasThemeConfig(longContent), true)
  })

  it('should handle content with regex-breaking characters', function () {
    assert.strictEqual(hasThemeConfig('%%{theme: "dark"}%%\n[*]'), true)
    assert.strictEqual(hasThemeConfig('%%{theme: "dark"}%%\n^$'), true)
    assert.strictEqual(hasThemeConfig('%%{theme: "dark"}%%\n\\d+'), true)
  })

  //Additional tests 
  it('should handle theme configurations in various positions', function () {
    assert.strictEqual(hasThemeConfig('graph TD\n%%{theme: "dark"}%%\nA --> B'), true)
    assert.strictEqual(hasThemeConfig('%%{theme: "dark"}%%\ngraph TD\nA --> B'), true)
    assert.strictEqual(hasThemeConfig('graph TD\nA --> B\n%%{theme: "dark"}%%'), true)
  })

  it('should handle whitespace variations in theme configurations', function () {
    assert.strictEqual(hasThemeConfig('%%{theme:"dark"}%%'), true)
    assert.strictEqual(hasThemeConfig('%%{ theme : "dark" }%%'), true)
    assert.strictEqual(hasThemeConfig('%%{  theme  :  "dark"  }%%'), true)
  })
})
