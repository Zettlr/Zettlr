---
title: Testfile Pandoc Headers
...

\tableofcontents

# This header will both not be numbered and not in the ToC {- .unlisted}

The headings in this file feature the special Pandoc classes `-` and `.unlisted` to turn the outline numbering off selectively and remove it from the table of contents.

## This header will be unnumbered {-}

The table of contents will render above these headings, whereas the headings themselves will tell you whether or not they should appear there, and if, how.

## This header will be both within the ToC and numbered

Remember that you need to test this by exporting to PDF, otherwise the `\tableofcontents`-directive above will not work.
