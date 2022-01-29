# Code blocks and indented blocks

**Testing:** Make sure all code blocks have round corners everywhere. If some corners are not round, it means some classes were not applied correctly.
**Testing:** Make sure the page can scroll down using the arrow keys alone. If not, it means the routine triggered an unhandled error.

### Fenced code

This is a _fenced code block_. It starts with three tildes and optionally a language identifier to change code formatting colors. Fenced code blocks create collapsible code (see the little triangles on the left).

**Testing:** Create new lines from the front and the end of the first, last and middle line. Should behave as expected.

```javascript
while (true) {
    if (!false) {
        console.log("world hello?");
    }
}
```

### Indented code

This is _indented code_. No color coding, but monospaced. Annoyingly wrapped in inline-code classes by CodeMirror. Make sure those classes don't interfere with the block classes.

**Testing:** Create new lines from the front and the end of the first, last and middle line. Should behave as expected.
**Testing:** Remove a prepending space from the first, last and middle line. Should behave as expected.

    // Remove a space from the font of this line
    // To test if the code block splits properly
    // and the styled corners are intact.

Also make sure indented but markdown formatted code is not converted to a code block.

For example, not code:

- Root
    - Four spaces, should not be a code block, not even when escaping the `-`.

    - Four spaces prepended by empty line should also not be a code block, unless `-` is escaped with `\`.

    \- Break the markdown, and it should be a code block. Test this above.

    1. Also with this list. Should not be code, unless `1.` is prepended with `\` (or anything, really).

### Issues

The following sequence is considered a code block by CodeMirror's Markdown Mode but not by us. I believe CodeMirror is wrong here, as the `\` is prepended with an illegal 3 spaces.

    var indented = true
    // Remove a space from the font of this line
   \
    // To test if the code block splits properly

#### Mind the (forgotten) endings

The next fenced code block is **intentionally left open** to see if the styling is applied properly to the bottom.

**Testing:** Should also work with indented code not followed by an empty line.

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