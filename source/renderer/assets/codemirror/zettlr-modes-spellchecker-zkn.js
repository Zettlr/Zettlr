/* global CodeMirror define */
// ZETTLR SPELLCHECKER PLUGIN

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('../../../node_modules/codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['../../../node_modules/codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  var delim = '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~ «»“”–—…÷‘’‚'
  var zknTagRE = /##?[A-Z0-9-_]+#?/i
  var tableRE = /^\|.+\|$/i

  /**
    * Define the spellchecker mode that will simply check all found words against
    * the renderer's typoCheck function.
    * @param  {Object} config    The original mode config
    * @param  {Object} parsercfg The parser config
    * @return {OverlayMode}           The generated overlay mode
    */
  CodeMirror.defineMode('spellchecker', function (config, parsercfg) {
    // word separators including special interpunction

    // Create the overlay and such
    var spellchecker = {
      token: function (stream) {
        var ch = stream.peek()
        var word = ''
        let ls = ''
        let le = ''
        if (config.hasOwnProperty('zkn') && config.zkn.hasOwnProperty('linkStart') && config.zkn.hasOwnProperty('linkEnd')) {
          // Regex replacer taken from https://stackoverflow.com/a/6969486 (thanks!)
          ls = config.zkn.linkStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
          le = config.zkn.linkEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
        }

        let zknLinkRE = new RegExp(ls + '.+?' + le)

        // Exclude zkn-links (because otherwise CodeMirror will create
        // multiple HTML elements _inside_ the link block, which will
        // render it way more difficult to extract the search terms.)
        if ((ls !== '') && stream.match(zknLinkRE)) {
          // Don't check on links if this is impossible
          return null
        }

        // Don't spellcheck tags
        if (stream.match(zknTagRE)) {
          return null
        }

        if (delim.includes(ch)) {
          stream.next()
          return null
        }

        while ((ch = stream.peek()) != null && !delim.includes(ch)) {
          word += ch
          stream.next()
        }

        // Exclude numbers (even inside words) from spell checking
        // // Regex for whole numbers would be /^\d+$/
        if (/\d+/.test(word)) { return null }

        // Exclude links from spell checking as well
        if (/https?|www\./.test(word)) {
          // Let's eat the stream until the end of the link
          while ((stream.peek() != null) && (stream.peek() !== ' ')) {
            stream.next()
          }
          return null
        }

        // Prevent returning false results because of 'quoted' words.
        if (word[0] === "'") {
          word = word.substr(1)
        }
        if (word[word.length - 1] === "'") {
          word = word.substr(0, word.length - 1)
        }

        if (global.typo && !global.typo.check(word)) {
          return 'spell-error' // CSS class: cm-spell-error
        }

        return null
      }
    }

    let mode = CodeMirror.getMode(config, {
      name: 'gfm',
      highlightFormatting: true
    })
    return CodeMirror.overlayMode(mode, spellchecker, true)
  })

  /**
    * This defines the Markdown Zettelkasten system mode, which highlights IDs
    * and tags for easy use of linking and searching for files.
    * THIS MODE WILL AUTOMATICALLY LOAD THE SPELLCHECKER MODE WHICH WILL THEN
    * LOAD THE GFM MODE AS THE BACKING MODE.
    * @param  {Object} config       The config with which the mode was loaded
    * @param  {Object} parserConfig The previous config object
    * @return {OverlayMode}              The loaded overlay mode.
    */
  CodeMirror.defineMode('markdown-zkn', function (config, parserConfig) {
    var markdownZkn = {
      token: function (stream, state) {
        // Immediately check for escape characters
        // Escape characters need to be greyed out, but not the characters themselves.
        if (stream.peek() === '\\') {
          stream.next()
          return 'escape-char'
        }

        // Now dig deeper for more tokens
        let zknIDRE = ''
        if (config.hasOwnProperty('zkn') && config.zkn.hasOwnProperty('idRE')) {
          zknIDRE = new RegExp(config.zkn.idRE)
        }
        let ls = ''
        let le = ''
        if (config.hasOwnProperty('zkn') && config.zkn.hasOwnProperty('linkStart') && config.zkn.hasOwnProperty('linkEnd')) {
          // Regex replacer taken from https://stackoverflow.com/a/6969486 (thanks!)
          ls = config.zkn.linkStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
          le = config.zkn.linkEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
        }
        let zknLinkRE = new RegExp(ls + '.+?' + le)

        // This mode should also handle tables, b/c they are rather simple to detect.
        if (stream.sol() && stream.match(tableRE, false)) {
          // Got a table line -> skip to end and convert to table
          stream.skipToEnd()
          return 'table'
        }

        // First: Tags, in the format of Twitter
        if (stream.match(zknTagRE, false)) {
          // It may be that the tag has been escaped. Due to the nature of this
          // stream we must back up and advance again, because lookbehinds won't
          // work here.
          if (!stream.sol()) {
            stream.backUp(1)
            if (stream.next() === '\\') {
              stream.match(zknTagRE)
              return null
            }
          }

          // At this point we can be sure that this is a tag and not escaped.
          stream.match(zknTagRE)
          return 'zkn-tag'
        }

        // Second: zkn links. This is MUCH easier than I thought :o
        if ((le !== '') && stream.match(zknLinkRE)) {
          return 'zkn-link'
        }

        // Third: IDs (The upside of this is that IDs _inside_ links will
        // be treated as _links_ and not as "THE" ID of the file as long
        // as the definition of zlkn-links is above this matcher.)
        if ((zknIDRE !== '') && stream.match(zknIDRE)) {
          return 'zkn-id'
        }

        // Progress until another match.
        while (stream.next() != null &&
                !stream.match(zknTagRE, false) &&
                !stream.match(zknIDRE, false) &&
                !stream.match(zknLinkRE, false) &&
                !stream.match(/\\/, false)) { }

        return null
      }
    }

    let mode = CodeMirror.getMode(config, {
      name: 'spellchecker',
      highlightFormatting: true
    })
    return CodeMirror.overlayMode(mode, markdownZkn, true)
  })

  /**
    * MULTIPLEX MODE: This will by default load our internal mode cascade
    * (consisting of the zkn-mode, the spellchecker and finally the gfm
    * mode) OR in code blocks use the respective highlighting modes.
    * @param  {Object} config The previous configuration object
    * @return {CodeMirrorMode}        The multiplex mode
    */
  CodeMirror.defineMode('multiplex', function (config) {
    return CodeMirror.multiplexingMode(
      CodeMirror.getMode(config, 'markdown-zkn'), // Default mode
      {
        open: '```javascript',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/javascript'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```java',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-java'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```cpp',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-c++src'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```csharp',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-csharp'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```objectivec',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-objectivec'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```css',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/css'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```less',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-less'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```php',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-php'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```python',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-python'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```ruby',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-ruby'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```sql',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-sql'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```swift',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-swift'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```yaml',
        close: '```',
        // We need regular expressions to keep the YAML mode simple. It now
        // matches normal YAML blocks as fenced code as well as the Pandoc
        // metadata blocks
        // open: /(?<!.)(`{3}yaml|-{3})$/gm,
        // close: /(?<!.)(`{3}|\.{3})$/gm,
        mode: CodeMirror.getMode(config, 'text/x-yaml'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      // "c" and "r" have to be down here to prevent them overriding
      // "ruby" or "cpp"
      {
        open: '```c',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-csrc'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```r',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-rsrc'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/plain'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      }
    )
  })
})
