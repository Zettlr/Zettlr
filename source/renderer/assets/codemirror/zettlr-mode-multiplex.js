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
        open: /```shell|```bash/gm, // highlight.js differs between shell and bash
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-sh'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```kotlin',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-kotlin'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: '```go',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/x-go'),
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
