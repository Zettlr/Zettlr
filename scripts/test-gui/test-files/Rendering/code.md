# Code blocks and indented blocks

### Fenced code

This is a _fenced code block_. It starts with three tildes and optionally a language identifier to change code formatting colors.

```javascript
var js = 432;
let a = 1;
let b = 2;
let c = 3;
```

Fenced code blocks create collapsible code (see the little triangles on the left):

```js
while (true) {
    if (!false) {
        console.log("booya");
    }
}
```

### Indented code

This is _indented code_. No color coding, but monospaced. Annoyingly wrapped in inline-code classes by CodeMirror. Make sure those classes don't interfere with the block classes.

    var indented = true
    // Remove a space from the font of this line
    // To test if the code block splits properly
    // and the styled corners are intact.

Testing `inline code`.

    `test`
    `me`
      `now`
      `block`
   `inline`
   `inline`

- Here is a problematic thing
  - This has two spaces

- This is a problem.
  - Two spaces.
    - Four spaces. Should not be code.

Okay.

The next fenced code block is **intentionally left open** to see if the styling is applied properly to the bottom.

```json
{
  "glossary": {
    "title": "example glossary",
    "list": {
      "entry": {
        "id": "SGML",
        "sortAs": "SGML",
        "term": "Standard Generalized Markup Language",
        "acronym": "SGML",
        "abbrev": "ISO 8879:1986",
      }
    }
  }
}